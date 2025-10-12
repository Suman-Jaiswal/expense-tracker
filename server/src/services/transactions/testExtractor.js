/**
 * Test script for transaction extraction
 * Usage: node src/services/transactions/testExtractor.js <pdf-path> [password] [resourceIdentifier] [statementId]
 */

import fs from "fs";
import { extractTransactionsFromPDF } from "./transactionExtractor.js";

async function testExtraction() {
  const pdfPath = process.argv[2];
  const password = process.argv[3] || null;
  const resourceIdentifier = process.argv[4] || "card_TEST_XXXX";
  const statementId = process.argv[5] || "test_statement_id";

  if (!pdfPath) {
    console.error("❌ Please provide a PDF file path");
    console.log(
      "Usage: node testExtractor.js <pdf-path> [password] [resourceIdentifier] [statementId]"
    );
    process.exit(1);
  }

  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ File not found: ${pdfPath}`);
    process.exit(1);
  }

  try {
    console.log("🚀 Starting transaction extraction...\n");

    const result = await extractTransactionsFromPDF(pdfPath, password);

    console.log("\n📊 EXTRACTION RESULTS:");
    console.log("=".repeat(60));
    console.log(`🏦 Bank: ${result.bank}`);
    console.log(`📝 Total Transactions: ${result.totalTransactions}`);
    console.log(`⏰ Extracted At: ${result.extractedAt}`);
    console.log("=".repeat(60));

    if (result.transactions.length > 0) {
      // Format transactions for database (same as what gets saved)
      const dbFormattedTransactions = result.transactions.map((txn) => ({
        id: txn.id,
        resourceIdentifier: resourceIdentifier,
        statementId: statementId,
        date: txn.date,
        description: txn.description,
        merchant: txn.merchant,
        amount: txn.amount,
        type: txn.type,
        category: txn.category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      console.log("\n💳 TRANSACTIONS (Database Format):");
      console.log("=".repeat(60));

      dbFormattedTransactions.forEach((txn, index) => {
        console.log(`\n${index + 1}. ${txn.description}`);
        console.log(`   🆔 ID: ${txn.id}`);
        console.log(`   💳 Resource: ${txn.resourceIdentifier}`);
        console.log(`   📄 Statement: ${txn.statementId}`);
        console.log(`   📅 Date: ${txn.date}`);
        console.log(`   🏪 Merchant: ${txn.merchant}`);
        console.log(
          `   💰 Amount: ₹${txn.amount.toFixed(2)} (${txn.type.toUpperCase()})`
        );
        console.log(`   🏷️  Category: ${txn.category}`);
        console.log(`   ⏰ Created: ${txn.createdAt}`);
        console.log(`   ⏰ Updated: ${txn.updatedAt}`);
      });

      console.log("\n" + "=".repeat(60));

      // Category breakdown
      const categoryBreakdown = {};
      let totalDebit = 0;
      let totalCredit = 0;

      result.transactions.forEach((txn) => {
        categoryBreakdown[txn.category] =
          (categoryBreakdown[txn.category] || 0) + 1;
        if (txn.type === "debit") {
          totalDebit += txn.amount;
        } else {
          totalCredit += txn.amount;
        }
      });

      console.log("\n📈 SUMMARY:");
      console.log("=".repeat(60));
      console.log(`💸 Total Debit: ₹${totalDebit.toFixed(2)}`);
      console.log(`💰 Total Credit: ₹${totalCredit.toFixed(2)}`);
      console.log(`📊 Net: ₹${(totalCredit - totalDebit).toFixed(2)}`);

      console.log("\n🏷️  CATEGORY BREAKDOWN:");
      Object.entries(categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, count]) => {
          console.log(`   ${category}: ${count} transactions`);
        });

      console.log("\n" + "=".repeat(60));

      // Save both formats to JSON files
      const outputPath = pdfPath.replace(".pdf", "_transactions.json");
      const dbOutputPath = pdfPath.replace(
        ".pdf",
        "_transactions_db_format.json"
      );

      // Save raw extraction result
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(`\n✅ Raw extraction saved to: ${outputPath}`);

      // Save database-formatted result
      const dbFormatResult = {
        bank: result.bank,
        totalTransactions: result.totalTransactions,
        resourceIdentifier: resourceIdentifier,
        statementId: statementId,
        transactions: dbFormattedTransactions,
        extractedAt: result.extractedAt,
      };
      fs.writeFileSync(dbOutputPath, JSON.stringify(dbFormatResult, null, 2));
      console.log(`✅ Database format saved to: ${dbOutputPath}`);
    } else {
      console.log("\n⚠️  No transactions found!");
      console.log("💡 This might mean:");
      console.log("   - The PDF format is not recognized");
      console.log("   - The transaction section could not be detected");
      console.log("   - The PDF is encrypted (try providing password)");
    }
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testExtraction();
