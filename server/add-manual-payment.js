import crypto from "crypto";
import { addMultipleTransactions } from "./src/repository/transactions.js";

/**
 * Manually add the May 2025 PAYMENT RECEIVED transaction with correct amount
 */
async function addManualPayment() {
  const transaction = {
    resourceIdentifier: "card_SBI_XX5965",
    statementId: "1970cfe1f95b3dc8",
    date: "2025-05-02",
    description: "PAYMENT RECEIVED 000PP015122BX5RR0XO8878",
    merchant: "PAYMENT RECEIVED 000PP015122BX5RR0XO8878",
    amount: 15199.37,
    type: "credit",
    category: "Other",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Generate deterministic ID
  const idData = `${transaction.resourceIdentifier}|${transaction.date}|${transaction.description}|${transaction.amount}|${transaction.type}`;
  transaction.id = `txn_${crypto
    .createHash("md5")
    .update(idData)
    .digest("hex")
    .substring(0, 16)}`;

  await addMultipleTransactions([transaction]);

  console.log("✅ Added May 2025 PAYMENT RECEIVED transaction:");
  console.log(`   Date: ${transaction.date}`);
  console.log(`   Amount: ₹${transaction.amount.toLocaleString("en-IN")}`);
  console.log(`   Description: ${transaction.description}`);
  console.log(`   Statement ID: ${transaction.statementId}`);
  console.log(`   Transaction ID: ${transaction.id}`);

  process.exit(0);
}

addManualPayment().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
