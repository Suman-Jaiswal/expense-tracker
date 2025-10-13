import path from "path";
import { config } from "./src/config.js";
import { extractTransactionsFromPDF } from "./src/services/transactions/transactionExtractor.js";

const testFiles = [
  {
    file: "../temp/Card AXIS XX2376 Sept 12 2025.pdf",
    bank: "AXIS",
    password: config.AXIS_PDF_PASSWORD,
    resourceIdentifier: "card_AXIS_XX2376",
  },
  {
    file: "../temp/ICICI Card XX9003 Aug 15 2025.pdf",
    bank: "ICICI",
    password: config.ICICI_PDF_PASSWORD,
    resourceIdentifier: "card_ICICI_XX9003",
  },
  {
    file: "../temp/ICICI Card XX5000 Aug 12 2025.pdf",
    bank: "ICICI",
    password: config.ICICI_PDF_PASSWORD,
    resourceIdentifier: "card_ICICI_XX5000",
  },
  {
    file: "../temp/SBI Card XX5965 Sept 24 2025.pdf",
    bank: "SBI",
    password: config.SBI_PDF_PASSWORD,
    resourceIdentifier: "card_SBI_XX5965",
  },
];

async function testPDFExtraction() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("🧪 TESTING PDF TRANSACTION EXTRACTION\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  for (const testFile of testFiles) {
    const filePath = path.resolve(process.cwd(), testFile.file);

    console.log(`\n📄 Testing: ${path.basename(testFile.file)}`);
    console.log(`   Bank: ${testFile.bank}`);
    console.log(`   Resource: ${testFile.resourceIdentifier}`);
    console.log(`   Password: ${testFile.password ? "✓ Set" : "✗ Not set"}`);
    console.log("   ─────────────────────────────────────────────────\n");

    try {
      const result = await extractTransactionsFromPDF(
        filePath,
        testFile.password,
        testFile.resourceIdentifier
      );

      console.log(`   ✅ Extraction successful!`);
      console.log(`   📊 Method: ${result.method || "table-based"}`);
      console.log(`   🏦 Detected Bank: ${result.bank || "N/A"}`);
      console.log(`   💳 Total Transactions: ${result.totalTransactions}`);

      if (result.totalTransactions > 0) {
        console.log(`\n   📋 Sample Transactions (first 5):\n`);

        const sampleTransactions = result.transactions.slice(0, 5);
        for (const txn of sampleTransactions) {
          console.log(`   • ${txn.date} | ${txn.type.toUpperCase()}`);
          console.log(`     ${txn.description}`);
          console.log(`     Amount: ₹${txn.amount.toLocaleString()}`);
          console.log(`     Category: ${txn.category}`);
          console.log(`     Merchant: ${txn.merchant || "N/A"}`);
          console.log(`     ID: ${txn.id}`);
          console.log();
        }

        // Transaction breakdown by type
        const debits = result.transactions.filter((t) => t.type === "debit");
        const credits = result.transactions.filter((t) => t.type === "credit");

        console.log(`   📈 Transaction Breakdown:`);
        console.log(`      Debits:  ${debits.length} transactions`);
        console.log(`      Credits: ${credits.length} transactions`);

        // Category breakdown (top 3)
        const categoryCount = {};
        result.transactions.forEach((t) => {
          categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
        });

        const topCategories = Object.entries(categoryCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        console.log(`\n   🏷️  Top Categories:`);
        topCategories.forEach(([cat, count]) => {
          console.log(`      ${cat}: ${count} transactions`);
        });

        // Total amounts
        const totalDebit = debits.reduce((sum, t) => sum + t.amount, 0);
        const totalCredit = credits.reduce((sum, t) => sum + t.amount, 0);

        console.log(`\n   💰 Total Amounts:`);
        console.log(`      Total Debits:  ₹${totalDebit.toLocaleString()}`);
        console.log(`      Total Credits: ₹${totalCredit.toLocaleString()}`);
      } else {
        console.log(`\n   ⚠️  No transactions found!`);
      }
    } catch (error) {
      console.log(`   ❌ Extraction failed!`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Stack: ${error.stack}`);
    }

    console.log("\n   ─────────────────────────────────────────────────");
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("✅ TEST COMPLETED\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

testPDFExtraction().catch(console.error);
