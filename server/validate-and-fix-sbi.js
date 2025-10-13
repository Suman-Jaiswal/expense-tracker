import crypto from "crypto";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import fs from "fs";
import { google } from "googleapis";
import path from "path";
import { db } from "./firebase.js";
import { authorize } from "./src/auth/index.js";
import { addMultipleTransactions } from "./src/repository/transactions.js";
import { extractTransactionsFromPDF } from "./src/services/transactions/transactionExtractor.js";

const DRIVE_FOLDER_ID = "1ttdRxxehikh3TqNXoiKrSxRqe9H5yllw";
const TEMP_DIR = "./temp-validation";

/**
 * Validate and Fix SBI Statement Transactions
 */
async function validateAndFixSBI() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 SBI STATEMENT VALIDATION & FIX");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Authenticate with Google Drive
    const auth = await authorize();
    const drive = google.drive({ version: "v3", auth });
    console.log("✅ Authenticated with Google Drive\n");

    // Create temp directory
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Get all SBI statements
    const statementsCollection = collection(db, "statements");
    const q = query(
      statementsCollection,
      where("resourceIdentifier", "==", "card_SBI_XX5965")
    );

    const statementsSnapshot = await getDocs(q);
    const statements = statementsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => a.period.start.localeCompare(b.period.start));

    console.log(`📊 Found ${statements.length} SBI statements\n`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const problematicStatements = [];
    let totalValidated = 0;

    // Validate each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const statementNum = `[${i + 1}/${statements.length}]`;

      console.log(`📄 ${statementNum} Validating: ${statement.id}`);
      console.log(
        `   Period: ${statement.period.start} to ${statement.period.end}`
      );

      // Get transactions from database for this statement
      const transactionsCollection = collection(db, "transactions");
      const txnQuery = query(
        transactionsCollection,
        where("statementId", "==", statement.id)
      );
      const txnSnapshot = await getDocs(txnQuery);
      const dbTransactions = txnSnapshot.docs.map((doc) => doc.data());

      console.log(`   📦 DB: ${dbTransactions.length} transactions`);

      // Download and extract from PDF
      const tempPath = path.join(TEMP_DIR, `${statement.id}.pdf`);
      try {
        console.log(`   ⬇️  Downloading PDF...`);
        const response = await drive.files.get(
          {
            fileId: statement.driveFileId,
            alt: "media",
          },
          { responseType: "arraybuffer" }
        );

        fs.writeFileSync(tempPath, Buffer.from(response.data));

        console.log(`   🔍 Extracting transactions from PDF...`);
        const extractionResult = await extractTransactionsFromPDF(
          tempPath,
          process.env.SBI_PDF_PASSWORD,
          statement.resourceIdentifier
        );

        const pdfTransactions = extractionResult.transactions;
        console.log(`   📑 PDF: ${pdfTransactions.length} transactions`);

        // Compare counts
        if (dbTransactions.length !== pdfTransactions.length) {
          console.log(
            `   ⚠️  COUNT MISMATCH: DB has ${dbTransactions.length}, PDF has ${pdfTransactions.length}`
          );
          problematicStatements.push({
            statement,
            issue: "count_mismatch",
            dbCount: dbTransactions.length,
            pdfCount: pdfTransactions.length,
          });
        } else {
          // Check for amount anomalies
          const largeAmounts = dbTransactions.filter((t) => t.amount > 100000);
          if (largeAmounts.length > 0) {
            console.log(
              `   ⚠️  LARGE AMOUNTS DETECTED: ${largeAmounts.length} transaction(s) > ₹1 lakh`
            );
            for (const txn of largeAmounts) {
              console.log(
                `      • ${txn.date}: ₹${txn.amount.toLocaleString("en-IN")} - ${txn.description.substring(0, 40)}...`
              );
            }
            problematicStatements.push({
              statement,
              issue: "large_amounts",
              largeAmounts: largeAmounts.length,
              examples: largeAmounts.slice(0, 3),
            });
          } else {
            console.log(`   ✅ VALID - No issues detected`);
          }
        }

        totalValidated++;
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        problematicStatements.push({
          statement,
          issue: "extraction_error",
          error: error.message,
        });
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }

      console.log();
    }

    // Summary
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("📊 VALIDATION SUMMARY\n");
    console.log(`   Total statements: ${statements.length}`);
    console.log(`   Validated: ${totalValidated}`);
    console.log(`   Problematic: ${problematicStatements.length}`);
    console.log();

    if (problematicStatements.length > 0) {
      console.log("⚠️  PROBLEMATIC STATEMENTS:\n");
      for (const item of problematicStatements) {
        console.log(`   📄 ${item.statement.id}`);
        console.log(
          `      Period: ${item.statement.period.start} to ${item.statement.period.end}`
        );
        console.log(`      Issue: ${item.issue}`);
        if (item.dbCount !== undefined) {
          console.log(`      DB: ${item.dbCount}, PDF: ${item.pdfCount}`);
        }
        if (item.largeAmounts) {
          console.log(`      Large amounts: ${item.largeAmounts}`);
        }
        if (item.error) {
          console.log(`      Error: ${item.error}`);
        }
        console.log();
      }

      // Ask to fix
      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
      );
      console.log("🔧 FIXING PROBLEMATIC STATEMENTS...\n");

      let totalFixed = 0;
      let totalTransactionsFixed = 0;

      for (const item of problematicStatements) {
        const statement = item.statement;
        console.log(`📄 Fixing: ${statement.id}`);
        console.log(
          `   Period: ${statement.period.start} to ${statement.period.end}`
        );

        try {
          // Delete existing transactions for this statement
          const transactionsCollection = collection(db, "transactions");
          const txnQuery = query(
            transactionsCollection,
            where("statementId", "==", statement.id)
          );
          const txnSnapshot = await getDocs(txnQuery);

          console.log(
            `   🗑️  Deleting ${txnSnapshot.size} old transactions...`
          );
          for (const docSnap of txnSnapshot.docs) {
            await deleteDoc(doc(db, "transactions", docSnap.id));
          }

          // Re-extract and save
          const tempPath = path.join(TEMP_DIR, `${statement.id}.pdf`);
          const response = await drive.files.get(
            {
              fileId: statement.driveFileId,
              alt: "media",
            },
            { responseType: "arraybuffer" }
          );

          fs.writeFileSync(tempPath, Buffer.from(response.data));

          const extractionResult = await extractTransactionsFromPDF(
            tempPath,
            process.env.SBI_PDF_PASSWORD,
            statement.resourceIdentifier
          );

          if (extractionResult.transactions.length > 0) {
            const formattedTransactions = extractionResult.transactions.map(
              (txn) => {
                const idData = `${statement.resourceIdentifier}|${txn.date}|${txn.description}|${txn.amount}|${txn.type}`;
                const deterministicId = `txn_${crypto
                  .createHash("md5")
                  .update(idData)
                  .digest("hex")
                  .substring(0, 16)}`;

                return {
                  id: deterministicId,
                  resourceIdentifier: statement.resourceIdentifier,
                  statementId: statement.id,
                  date: txn.date,
                  description: txn.description,
                  merchant: txn.merchant,
                  amount: txn.amount,
                  type: txn.type,
                  category: txn.category,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
              }
            );

            await addMultipleTransactions(formattedTransactions);
            console.log(
              `   ✅ Fixed: ${formattedTransactions.length} transactions saved`
            );

            totalFixed++;
            totalTransactionsFixed += formattedTransactions.length;
          }

          // Clean up
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        } catch (error) {
          console.log(`   ❌ Fix failed: ${error.message}`);
        }

        console.log();
      }

      console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
      );
      console.log("✅ FIX COMPLETED\n");
      console.log(
        `   Statements fixed: ${totalFixed}/${problematicStatements.length}`
      );
      console.log(`   Transactions re-synced: ${totalTransactionsFixed}`);
    } else {
      console.log("✅ All statements are valid! No fixes needed.");
    }

    // Clean up temp directory
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }

    console.log(
      "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    );
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);

    // Clean up temp directory
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }

    process.exit(1);
  }
}

validateAndFixSBI();
