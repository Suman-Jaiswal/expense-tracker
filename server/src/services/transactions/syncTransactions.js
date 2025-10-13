import crypto from "crypto";
import fs from "fs";
import { google } from "googleapis";
import { getAuth } from "../../auth/index.js";
import config from "../../config.js";
import { getAllStatements } from "../../repository/statements.js";
import { addMultipleTransactions } from "../../repository/transactions.js";
import { extractTransactionsFromPDF } from "./transactionExtractor.js";

/**
 * Sync transactions from existing statements
 * Goes through all statements in DB, downloads PDFs from Drive, extracts transactions
 */
export async function syncTransactionsFromStatements() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔄 STARTING TRANSACTION SYNC FROM STATEMENTS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Get auth and Drive API
    const auth = await getAuth();
    const drive = google.drive({ version: "v3", auth });

    // Get all statements from database
    console.log("📋 Fetching all statements from database...");
    const statements = await getAllStatements();
    console.log(`✅ Found ${statements.length} statements\n`);

    if (statements.length === 0) {
      console.log("⚠️  No statements found. Run /sync-statements first.");
      return {
        success: true,
        message: "No statements to process",
        stats: {
          totalStatements: 0,
          processed: 0,
          failed: 0,
          totalTransactions: 0,
        },
      };
    }

    let processed = 0;
    let failed = 0;
    let totalTransactions = 0;

    // Process each statement
    for (const statement of statements) {
      try {
        console.log(
          `\n📄 [${processed + failed + 1}/${statements.length}] Processing statement: ${statement.id}`
        );
        console.log(`   Resource: ${statement.resourceIdentifier}`);
        console.log(
          `   Period: ${statement.period.start} to ${statement.period.end}`
        );

        // Download PDF from Drive
        console.log(
          `   ⬇️  Downloading PDF from Drive (${statement.driveFileId})...`
        );
        const response = await drive.files.get(
          {
            fileId: statement.driveFileId,
            alt: "media",
          },
          { responseType: "arraybuffer" }
        );

        // Save to temp file
        const tempPdfPath = config.TEMP_PDF_PATH;
        fs.writeFileSync(tempPdfPath, Buffer.from(response.data));
        console.log(`   ✅ PDF downloaded`);

        // Extract transactions (note: PDF is already decrypted in Drive)
        console.log(`   📊 Extracting transactions...`);
        const extractionResult = await extractTransactionsFromPDF(
          tempPdfPath,
          null, // No password needed (already decrypted)
          statement.resourceIdentifier
        );

        console.log(
          `   ✅ Extracted ${extractionResult.totalTransactions} transactions (${extractionResult.method})`
        );

        // Format transactions for database
        if (extractionResult.transactions.length > 0) {
          const formattedTransactions = extractionResult.transactions.map(
            (txn) => {
              // Generate deterministic ID
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

          // Save to database
          console.log(
            `   💾 Saving ${formattedTransactions.length} transactions to database...`
          );
          await addMultipleTransactions(formattedTransactions);
          console.log(
            `   ✅ Saved ${formattedTransactions.length} transactions`
          );

          totalTransactions += formattedTransactions.length;
        } else {
          console.log(`   ⚠️  No transactions extracted`);
        }

        // Clean up temp file
        if (fs.existsSync(tempPdfPath)) {
          fs.unlinkSync(tempPdfPath);
        }

        processed++;
      } catch (error) {
        console.error(
          `   ❌ Error processing statement ${statement.id}:`,
          error.message
        );
        failed++;
        // Continue with next statement
      }
    }

    // Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ TRANSACTION SYNC COMPLETED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Total Statements: ${statements.length}`);
    console.log(`Processed: ${processed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Transactions Extracted: ${totalTransactions}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return {
      success: true,
      message: "Transaction sync completed",
      stats: {
        totalStatements: statements.length,
        processed,
        failed,
        totalTransactions,
      },
    };
  } catch (error) {
    console.error("❌ Transaction sync failed:", error);
    throw error;
  }
}
