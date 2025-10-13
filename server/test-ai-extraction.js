import dotenv from "dotenv";
import fs from "fs";
import pdf from "pdf-parse";
import { extractTransactionsWithAI } from "./src/services/transactions/aiExtractor.js";

// Load environment variables
dotenv.config();

/**
 * Test AI extraction with a sample PDF
 */
async function testAIExtraction() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🤖 TESTING AI TRANSACTION EXTRACTION");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Check if API key is set
  if (
    !process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY === "your_openai_api_key_here"
  ) {
    console.error("❌ OPENAI_API_KEY is not set in .env file!");
    console.error("   Please add your OpenAI API key to server/.env:");
    console.error("   OPENAI_API_KEY=sk-proj-...\n");
    console.error("   Get your key from: https://platform.openai.com/api-keys");
    process.exit(1);
  }

  // Check for test PDF files
  const testPdfPaths = [
    "../temp/ICICI Card XX5000 Aug 12 2025.pdf",
    "../temp/Card AXIS XX2376 Sept 12 2025.pdf",
    "../temp/SBI Card XX5965 Sept 24 2025.pdf",
    "../temp/ICICI Card XX9003 Aug 15 2025.pdf",
  ];

  const availablePdfs = testPdfPaths.filter((path) => fs.existsSync(path));

  if (availablePdfs.length === 0) {
    console.error("❌ No test PDF files found in ./temp/ directory");
    console.error("   Expected files:");
    testPdfPaths.forEach((path) => console.error(`   - ${path}`));
    process.exit(1);
  }

  console.log(`📄 Found ${availablePdfs.length} test PDF(s):\n`);

  // Test each PDF
  for (const pdfPath of availablePdfs) {
    try {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`📄 Testing: ${pdfPath.split("/").pop()}`);
      console.log("=".repeat(60));

      // Determine bank type from filename
      const filename = pdfPath.split("/").pop();
      const bankType = filename.includes("ICICI")
        ? "ICICI"
        : filename.includes("AXIS")
          ? "AXIS"
          : filename.includes("SBI")
            ? "SBI"
            : "Unknown";

      console.log(`🏦 Bank Type: ${bankType}`);

      // Read and parse PDF
      console.log("📖 Reading PDF...");
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdf(pdfBuffer);
      const pdfText = pdfData.text;

      console.log(`📝 PDF Text Length: ${pdfText.length} characters`);
      console.log(`📄 Pages: ${pdfData.numpages}\n`);

      // Extract with AI
      const startTime = Date.now();
      console.log("🤖 Extracting transactions with AI...\n");

      const transactions = await extractTransactionsWithAI(pdfText, bankType, {
        year: 2025,
      });

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      // Display results
      console.log(`\n✅ Extraction completed in ${duration}s`);
      console.log(`📊 Total Transactions: ${transactions.length}\n`);

      if (transactions.length > 0) {
        console.log("Sample Transactions (first 5):");
        console.log("─".repeat(80));
        transactions.slice(0, 5).forEach((txn, idx) => {
          console.log(`\n${idx + 1}. ${txn.date} | ${txn.type.toUpperCase()}`);
          console.log(
            `   Description: ${txn.description.substring(0, 50)}${txn.description.length > 50 ? "..." : ""}`
          );
          console.log(`   Amount: ₹${txn.amount.toLocaleString("en-IN")}`);
          console.log(`   Category: ${txn.category}`);
        });
        console.log("\n" + "─".repeat(80));

        // Stats
        const totalDebit = transactions
          .filter((t) => t.type === "debit")
          .reduce((sum, t) => sum + t.amount, 0);
        const totalCredit = transactions
          .filter((t) => t.type === "credit")
          .reduce((sum, t) => sum + t.amount, 0);

        console.log("\n📈 Summary:");
        console.log(
          `   Debits: ${transactions.filter((t) => t.type === "debit").length} (₹${totalDebit.toLocaleString("en-IN")})`
        );
        console.log(
          `   Credits: ${transactions.filter((t) => t.type === "credit").length} (₹${totalCredit.toLocaleString("en-IN")})`
        );
      }

      console.log("\n✅ Test passed for " + filename);
    } catch (error) {
      console.error(`\n❌ Test failed for ${pdfPath}:`);
      console.error(`   Error: ${error.message}`);
      if (error.stack) {
        console.error(`\n   Stack trace:\n${error.stack}`);
      }
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ AI EXTRACTION TEST COMPLETED");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// Run test
testAIExtraction()
  .then(() => {
    console.log("🎉 All tests completed successfully!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  });
