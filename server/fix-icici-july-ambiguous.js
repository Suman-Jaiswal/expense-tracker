import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";

/**
 * Fix the 2 ambiguous transactions for ICICI XX5000 July 2025
 * Based on manual verification of the PDF
 */

const TRANSACTIONS_TO_ADD = [
  {
    id: "txn_3ea49f52ea5e6a7a",
    date: "2025-07-03",
    description: "IND*AMAZON",
    merchant: "AMAZON",
    amount: 3872.03,
    type: "debit",
    category: "Shopping",
    statementId: "198043ff7f8585e8",
    resourceIdentifier: "card_ICICI_XX5000",
    needsReview: false,
    isAmbiguous: false,
    createdAt: "2025-10-13T13:20:27.036Z",
    updatedAt: new Date().toISOString(),
    restoredAt: new Date().toISOString(),
    fixReason:
      "Restored - was incorrectly removed due to PDF parsing error (amount was parsed as 1933872.03)",
  },
  {
    id: "txn_da099eb34a0d461b",
    date: "2025-07-07",
    description: "IND*AMAZON",
    merchant: "AMAZON",
    amount: 1440.53,
    type: "credit",
    category: "Other",
    statementId: "198043ff7f8585e8",
    resourceIdentifier: "card_ICICI_XX5000",
    needsReview: false,
    isAmbiguous: false,
    createdAt: "2025-10-13T13:20:27.203Z",
    updatedAt: new Date().toISOString(),
    restoredAt: new Date().toISOString(),
    fixReason:
      "Restored - was incorrectly removed due to PDF parsing error (amount was parsed as 721440.53)",
  },
];

async function fixAmbiguousTransactions() {
  console.log(
    "\n🔧 Fixing 2 ambiguous transactions for ICICI XX5000 July 2025\n"
  );

  for (const txn of TRANSACTIONS_TO_ADD) {
    try {
      const txnRef = doc(db, "transactions", txn.id);
      await setDoc(txnRef, txn);
      console.log(
        `✅ Added: ${txn.date} | ${txn.type.padEnd(6)} | ₹${txn.amount.toString().padStart(10)} | ${txn.description}`
      );
    } catch (error) {
      console.error(`❌ Failed to add ${txn.id}:`, error.message);
    }
  }

  console.log(
    `\n✅ Fix complete! Added ${TRANSACTIONS_TO_ADD.length} transactions`
  );
}

fixAmbiguousTransactions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
