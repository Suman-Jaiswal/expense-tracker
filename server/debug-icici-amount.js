import fs from "fs";
import pdf from "pdf-parse";
import { decryptPdfTmp } from "./src/utils/pdfDecrypter.js";

// Test ICICI amount parsing with a real PDF
async function debugICICIAmount() {
  try {
    // Try to find an ICICI statement in /tmp or current directory
    const testPdfPath = "/tmp/statement.pdf";

    if (!fs.existsSync(testPdfPath)) {
      console.log("❌ No test PDF found at /tmp/statement.pdf");
      console.log("Please run sync-statements first to download a statement");
      return;
    }

    console.log("📄 Reading ICICI statement PDF...\n");

    // Decrypt the PDF
    const decryptedPdfBytes = await decryptPdfTmp(testPdfPath, "suma0709");

    // Parse PDF
    const data = await pdf(decryptedPdfBytes);
    const text = data.text;

    console.log("📝 Total text length:", text.length);
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Find lines with "AMAZON" in them
    const lines = text.split("\n");
    const amazonLines = lines.filter((line) =>
      line.toUpperCase().includes("AMAZON")
    );

    console.log(`Found ${amazonLines.length} lines with AMAZON:\n`);

    amazonLines.forEach((line, idx) => {
      console.log(`Line ${idx + 1}:`);
      console.log(`  Raw: "${line}"`);
      console.log(`  Trimmed: "${line.trim()}"`);
      console.log(`  Length: ${line.length}`);
      console.log("");

      // Test the ICICI pattern
      const pattern1 =
        /^(\d{2}\/\d{2}\/\d{4})\d{11}(.+?)\d{1,2}([\d,]+\.\d{2})\s*(CR)?$/i;
      const match = line.trim().match(pattern1);

      if (match) {
        console.log("  ✅ MATCHED Pattern 1!");
        console.log(`  Date: ${match[1]}`);
        console.log(`  Description: "${match[2]}"`);
        console.log(`  Amount: "${match[3]}"`);
        console.log(`  Type: ${match[4] || "DR"}`);
      } else {
        console.log("  ❌ NO MATCH");

        // Try to manually find numbers in the line
        const numbers = line.match(/\d+/g);
        if (numbers) {
          console.log(`  Found numbers: ${numbers.join(", ")}`);
        }

        // Try to find decimal amounts
        const decimalAmounts = line.match(/[\d,]+\.\d{2}/g);
        if (decimalAmounts) {
          console.log(`  Found decimal amounts: ${decimalAmounts.join(", ")}`);
        }
      }
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    });

    // Also show first 20 transaction lines
    console.log("\n\n📊 FIRST 20 TRANSACTION SECTION LINES:\n");
    let inTxnSection = false;
    let txnCount = 0;

    for (const line of lines) {
      if (line.includes("Transaction Details") || line.includes("DateSerNo")) {
        inTxnSection = true;
        continue;
      }

      if (inTxnSection) {
        if (
          line.includes("Credit Limit") ||
          line.includes("Available Credit")
        ) {
          break;
        }

        if (line.trim()) {
          console.log(`[${txnCount}] "${line.trim()}"`);
          txnCount++;

          if (txnCount >= 20) break;
        }
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

debugICICIAmount();
