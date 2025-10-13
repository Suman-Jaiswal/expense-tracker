import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "./firebase.js";

/**
 * Validate transactions and mark ambiguous ones
 * Based on pattern analysis without using AI
 */

// Patterns that indicate ambiguous transactions
const AMBIGUOUS_PATTERNS = {
  // Very large amounts that look like concatenated numbers
  SUSPICIOUS_AMOUNT: (amount) => {
    // Amounts over 100,000 INR are suspicious for credit card transactions
    if (amount > 100000) return true;

    // Amounts that are exact multiples of 1000 and very large might be concatenated
    if (amount > 50000 && amount % 1000 === 0) return true;

    // Amounts with patterns like 1234567.00 (sequential-looking, no proper formatting)
    const amountStr = amount.toString();
    if (amountStr.length > 6 && !amountStr.includes(".")) return true;

    return false;
  },

  // Multiple amounts in raw line
  MULTIPLE_AMOUNTS: (rawLine) => {
    if (!rawLine) return false;

    // Pattern: "192.00 Dr 9.00 Cr" or similar
    const multiAmountPattern =
      /(\d+[\.,]\d{2})\s*(Dr|Cr|DR|CR)\s*(\d+[\.,]\d{2})\s*(Dr|Cr|DR|CR)/i;
    if (multiAmountPattern.test(rawLine)) return true;

    // Count comma-separated numbers that look like amounts
    const amountLikeNumbers = rawLine.match(/\d{1,3}(,\d{3})*\.\d{2}/g);
    if (amountLikeNumbers && amountLikeNumbers.length > 2) return true;

    return false;
  },

  // Concatenated amounts (no proper spacing)
  CONCATENATED_AMOUNT: (rawLine, amount) => {
    if (!rawLine) return false;

    const amountStr = amount.toString().replace(/[.,]/g, "");

    // Look for the amount in rawLine without proper spacing
    // e.g., "20110057.00" instead of "20,110.57" or "201 100.57"
    const concatenatedPattern = new RegExp(`\\d{8,}`, "g");
    const matches = rawLine.match(concatenatedPattern);

    if (matches && matches.some((m) => m.length > 7)) return true;

    return false;
  },

  // Unusual decimal patterns
  UNUSUAL_DECIMAL: (amount) => {
    const amountStr = amount.toString();

    // Amounts like 1234567.0 (only one decimal place for large amounts is suspicious)
    if (amount > 10000 && /\.\d$/.test(amountStr)) return false; // Actually this is fine

    // Amounts without decimals for credit cards are suspicious (should have .00 at least)
    if (amount > 100 && Number.isInteger(amount)) return false; // This is actually fine too

    return false;
  },

  // Known problematic merchants/descriptions
  KNOWN_ISSUES: (description, amount) => {
    // Based on test results, these had issues:
    const problematicPatterns = [
      /AMAZON.*IN\d{8,}/, // Amazon with long numbers
      /FLIPKART.*\d{3,}.*Dr.*\d+.*Cr/i, // Flipkart with Dr/Cr indicators
      /APPLE.*IN\d{8,}/, // Apple with long numbers
      /IXIGO.*IN\d{8,}/, // Ixigo with long numbers
    ];

    return problematicPatterns.some((pattern) => pattern.test(description));
  },
};

/**
 * Analyze a transaction for ambiguity
 */
function analyzeTransaction(txn) {
  const reasons = [];

  // Check suspicious amount
  if (AMBIGUOUS_PATTERNS.SUSPICIOUS_AMOUNT(txn.amount)) {
    reasons.push("suspicious_amount");
  }

  // Check multiple amounts in raw line
  if (AMBIGUOUS_PATTERNS.MULTIPLE_AMOUNTS(txn.rawLine)) {
    reasons.push("multiple_amounts");
  }

  // Check concatenated amounts
  if (AMBIGUOUS_PATTERNS.CONCATENATED_AMOUNT(txn.rawLine, txn.amount)) {
    reasons.push("concatenated_amount");
  }

  // Check known issues
  if (AMBIGUOUS_PATTERNS.KNOWN_ISSUES(txn.description, txn.amount)) {
    reasons.push("known_pattern");
  }

  return {
    isAmbiguous: reasons.length > 0,
    reasons: reasons,
    confidence:
      reasons.length === 0 ? "high" : reasons.length === 1 ? "medium" : "low",
  };
}

/**
 * Main validation function
 */
async function validateTransactions() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 VALIDATING TRANSACTIONS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Fetch all transactions
    console.log("📋 Fetching all transactions from database...");
    const transactionsCollection = collection(db, "transactions");
    const snapshot = await getDocs(transactionsCollection);
    const transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`✅ Found ${transactions.length} transactions\n`);

    if (transactions.length === 0) {
      console.log("⚠️  No transactions to validate.");
      return;
    }

    // Analyze each transaction
    let validCount = 0;
    let ambiguousCount = 0;
    let updatedCount = 0;
    const ambiguousTransactions = [];

    console.log("🔍 Analyzing transactions...\n");

    for (const txn of transactions) {
      const analysis = analyzeTransaction(txn);

      if (analysis.isAmbiguous) {
        ambiguousCount++;
        ambiguousTransactions.push({
          id: txn.id,
          date: txn.date,
          description: txn.description,
          amount: txn.amount,
          reasons: analysis.reasons,
          rawLine: txn.rawLine?.substring(0, 100) || "N/A",
        });

        // Update if not already marked as ambiguous
        if (!txn.isAmbiguous) {
          const txnRef = doc(db, "transactions", txn.id);
          await updateDoc(txnRef, {
            isAmbiguous: true,
            ambiguousReason: analysis.reasons.join(", "),
            needsReview: true,
            validatedAt: new Date().toISOString(),
          });
          updatedCount++;
        }
      } else {
        validCount++;

        // Clear ambiguous flag if it was previously set
        if (txn.isAmbiguous) {
          const txnRef = doc(db, "transactions", txn.id);
          await updateDoc(txnRef, {
            isAmbiguous: false,
            ambiguousReason: null,
            needsReview: false,
            validatedAt: new Date().toISOString(),
          });
          updatedCount++;
        }
      }
    }

    // Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ VALIDATION COMPLETED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Total Transactions: ${transactions.length}`);
    console.log(`✅ Valid: ${validCount}`);
    console.log(`⚠️  Ambiguous: ${ambiguousCount}`);
    console.log(`🔄 Updated: ${updatedCount}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Show ambiguous transactions
    if (ambiguousTransactions.length > 0) {
      console.log("⚠️  AMBIGUOUS TRANSACTIONS FOUND:\n");

      ambiguousTransactions.forEach((txn, idx) => {
        console.log(`${idx + 1}. ${txn.date} | ${txn.description}`);
        console.log(`   Amount: ₹${txn.amount.toLocaleString("en-IN")}`);
        console.log(`   Reasons: ${txn.reasons.join(", ")}`);
        console.log(`   Raw: ${txn.rawLine}`);
        console.log("");
      });
    }

    // Show statistics by reason
    if (ambiguousCount > 0) {
      const reasonStats = {};
      ambiguousTransactions.forEach((txn) => {
        txn.reasons.forEach((reason) => {
          reasonStats[reason] = (reasonStats[reason] || 0) + 1;
        });
      });

      console.log("\n📊 Ambiguous Reasons Breakdown:");
      Object.entries(reasonStats).forEach(([reason, count]) => {
        console.log(`   ${reason}: ${count}`);
      });
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("❌ Validation error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run validation
validateTransactions()
  .then(() => {
    console.log("✅ Validation complete!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Validation failed:", error.message);
    process.exit(1);
  });
