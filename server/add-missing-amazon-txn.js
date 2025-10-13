import crypto from "crypto";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";

/**
 * Add missing Amazon transaction for ICICI XX5000 - July 12, 2025
 * Raw: 12/07/2025 11601217839 IND*AMAZON HTTP://WWW.AM IN 11713 2,34,261.00
 * Actual amount: ₹234,261.00 (the 11713 is part of the reference number)
 */

const transactionToAdd = {
  id: `txn_${crypto.randomBytes(8).toString("hex")}`,
  date: "2025-07-12",
  description: "IND*AMAZON HTTP://WWW.AM IN",
  merchant: "INDAMAZON HTTP:",
  amount: 234261, // 2,34,261.00
  type: "debit",
  category: "Shopping",
  rawText: "12/07/202511601217839IND*AMAZON HTTP://WWW.AM IN234261.00",
  statementId: "198a31d1d2d09673",
  resourceIdentifier: "card_ICICI_XX5000",
  needsReview: false,
  isAmbiguous: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  addedManually: true,
  manualAddReason:
    "Missing from extraction - concatenated amount issue (11713 2,34,261.00)",
};

async function addTransaction() {
  console.log("\n🔧 Adding Missing Amazon Transaction\n");
  console.log("Statement: 198a31d1d2d09673 (ICICI XX5000 - July 12 to Aug 11)");
  console.log(
    `Transaction: ${transactionToAdd.date} | ₹${transactionToAdd.amount} | ${transactionToAdd.description}\n`
  );

  try {
    const txnRef = doc(db, "transactions", transactionToAdd.id);
    await setDoc(txnRef, transactionToAdd);
    console.log(`✅ Transaction added successfully!`);
    console.log(`   ID: ${transactionToAdd.id}`);
  } catch (error) {
    console.error(`❌ Failed to add transaction:`, error.message);
    process.exit(1);
  }
}

addTransaction()
  .then(() => {
    console.log("\n✅ Complete!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
