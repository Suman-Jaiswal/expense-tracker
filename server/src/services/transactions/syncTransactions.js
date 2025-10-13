import crypto from "crypto";
import fs from "fs";
import { google } from "googleapis";
import pdf from "pdf-parse";
import { authorize } from "../../auth/index.js";
import { config } from "../../config.js";
import { getAllStatements } from "../../repository/statements.js";
import {
  addMultipleTransactions,
  getTransactionCountForStatement,
  hasTransactionsForStatement,
} from "../../repository/transactions.js";
import { extractTransactionsWithAI } from "./aiExtractor.js";
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
    const auth = await authorize();
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
    let skipped = 0;
    let totalTransactions = 0;
    const allAmbiguousTransactions = []; // Collect all ambiguous transactions

    // Process each statement
    for (const statement of statements) {
      try {
        console.log(
          `\n📄 [${processed + failed + skipped + 1}/${statements.length}] Processing statement: ${statement.id}`
        );
        console.log(`   Resource: ${statement.resourceIdentifier}`);
        console.log(
          `   Period: ${statement.period.start} to ${statement.period.end}`
        );

        // Check if transactions already exist for this statement
        const hasTransactions = await hasTransactionsForStatement(statement.id);
        if (hasTransactions) {
          const existingCount = await getTransactionCountForStatement(
            statement.id
          );
          console.log(
            `   ⏭️  Skipping - ${existingCount} transaction(s) already exist for this statement`
          );
          skipped++;
          totalTransactions += existingCount;
          continue; // Skip to next statement
        }

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

        // Extract transactions using AI
        console.log(`   📊 Extracting transactions with AI...`);
        let extractionResult;

        try {
          // Parse PDF to text
          const pdfBuffer = fs.readFileSync(tempPdfPath);
          const pdfData = await pdf(pdfBuffer);
          const pdfText = pdfData.text;

          // Determine bank type from resource identifier
          const bankType = statement.resourceIdentifier.includes("ICICI")
            ? "ICICI"
            : statement.resourceIdentifier.includes("AXIS")
              ? "AXIS"
              : statement.resourceIdentifier.includes("SBI")
                ? "SBI"
                : "Unknown";

          // Extract with AI
          const aiTransactions = await extractTransactionsWithAI(
            pdfText,
            bankType,
            {
              period: statement.period,
              cardNumber: statement.resourceIdentifier
                .replace("card_", "")
                .split("_")
                .pop(),
              year: new Date(statement.period.end).getFullYear(),
            }
          );

          extractionResult = {
            transactions: aiTransactions,
            ambiguousTransactions: [], // AI should handle most ambiguities
            totalTransactions: aiTransactions.length,
            method: "AI (GPT-4o-mini)",
          };

          console.log(
            `   ✅ AI extracted ${extractionResult.totalTransactions} transactions`
          );
        } catch (aiError) {
          console.warn(
            `   ⚠️  AI extraction failed: ${aiError.message}. Falling back to regex...`
          );

          // Fallback to regex-based extraction
          extractionResult = await extractTransactionsFromPDF(
            tempPdfPath,
            null,
            statement.resourceIdentifier
          );

          console.log(
            `   ✅ Extracted ${extractionResult.totalTransactions} transactions (${extractionResult.method})`
          );
        }

        // Collect and save ambiguous transactions
        if (
          extractionResult.ambiguousTransactions &&
          extractionResult.ambiguousTransactions.length > 0
        ) {
          console.log(
            `   ⚠️  ${extractionResult.ambiguousTransactions.length} transaction(s) need manual review`
          );

          // Format ambiguous transactions for database (save with isAmbiguous flag)
          const formattedAmbiguous = extractionResult.ambiguousTransactions.map(
            (ambTxn) => {
              // Generate deterministic ID
              const idData = `${statement.resourceIdentifier}|${ambTxn.date}|${ambTxn.description}|${ambTxn.suggestedAmount}|${ambTxn.type}`;
              const deterministicId = `txn_${crypto
                .createHash("md5")
                .update(idData)
                .digest("hex")
                .substring(0, 16)}`;

              const formattedTxn = {
                id: deterministicId,
                resourceIdentifier: statement.resourceIdentifier,
                statementId: statement.id,
                date: ambTxn.date,
                description: ambTxn.description,
                merchant: ambTxn.description, // Use description as merchant for now
                amount: ambTxn.suggestedAmount,
                type: ambTxn.type,
                category: ambTxn.category,
                isAmbiguous: true,
                ambiguousReason: ambTxn.reason,
                rawLine: ambTxn.rawLine,
                needsReview: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              // Also collect for review modal
              allAmbiguousTransactions.push({
                ...ambTxn,
                id: deterministicId,
                statementId: statement.id,
                resourceIdentifier: statement.resourceIdentifier,
              });

              return formattedTxn;
            }
          );

          // Save ambiguous transactions to database
          console.log(
            `   💾 Saving ${formattedAmbiguous.length} ambiguous transactions to database...`
          );
          await addMultipleTransactions(formattedAmbiguous);
          console.log(
            `   ✅ Saved ${formattedAmbiguous.length} ambiguous transactions (flagged for review)`
          );
        }

        // Format regular (clean) transactions for database
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
                isAmbiguous: false,
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
    console.log(`Skipped: ${skipped} (already synced)`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Transactions: ${totalTransactions}`);
    if (allAmbiguousTransactions.length > 0) {
      console.log(
        `⚠️  Ambiguous Transactions (need review): ${allAmbiguousTransactions.length}`
      );
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return {
      success: true,
      message:
        skipped > 0
          ? allAmbiguousTransactions.length > 0
            ? `Transaction sync completed. ${skipped} statement(s) skipped (already synced). ${allAmbiguousTransactions.length} transaction(s) need manual review.`
            : `Transaction sync completed. ${skipped} statement(s) skipped (already synced).`
          : allAmbiguousTransactions.length > 0
            ? `Transaction sync completed. ${allAmbiguousTransactions.length} transaction(s) need manual review.`
            : "Transaction sync completed",
      stats: {
        totalStatements: statements.length,
        processed,
        skipped,
        failed,
        totalTransactions,
        ambiguousCount: allAmbiguousTransactions.length,
      },
      ambiguousTransactions: allAmbiguousTransactions,
      needsReview: allAmbiguousTransactions.length > 0,
    };
  } catch (error) {
    console.error("❌ Transaction sync failed:", error);
    throw error;
  }
}
