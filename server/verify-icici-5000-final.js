import { collection, getDocs, query, where } from "firebase/firestore";
import fs from "fs";
import { db } from "./firebase.js";

const validationResults = JSON.parse(
  fs.readFileSync("./validation-results.json", "utf8")
);

async function verifyAllStatements() {
  console.log("\n📊 FINAL VERIFICATION - ICICI XX5000 STATEMENTS\n");
  console.log("=".repeat(80));

  const iciciStatements = validationResults.filter(
    (v) => v.resourceIdentifier === "card_ICICI_XX5000"
  );

  let totalRestored = 0;

  for (const stmt of iciciStatements) {
    const q = query(
      collection(db, "transactions"),
      where("statementId", "==", stmt.statementId)
    );
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map((doc) => doc.data());

    const period = stmt.period;
    console.log(`\n📄 Statement: ${stmt.statementId}`);
    console.log(`📅 Period: ${period.start} to ${period.end}`);
    console.log(`   Expected (from PDF): ${stmt.pdfTransactions.length}`);
    console.log(`   Current in DB: ${transactions.length}`);
    console.log(`   Restored: ${stmt.extraInDB.length}`);

    totalRestored += stmt.extraInDB.length;

    // Summary by type
    const debitTxns = transactions.filter((t) => t.type === "debit");
    const creditTxns = transactions.filter((t) => t.type === "credit");
    const totalDebit = debitTxns.reduce(
      (sum, t) => sum + parseFloat(t.amount || 0),
      0
    );
    const totalCredit = creditTxns.reduce(
      (sum, t) => sum + parseFloat(t.amount || 0),
      0
    );

    console.log(
      `\n   💳 Debits: ${debitTxns.length} transactions | ₹${totalDebit.toFixed(2)}`
    );
    console.log(
      `   💰 Credits: ${creditTxns.length} transactions | ₹${totalCredit.toFixed(2)}`
    );
  }

  console.log("\n" + "=".repeat(80));
  console.log(`\n✅ SUMMARY:`);
  console.log(`   Total statements: ${iciciStatements.length}`);
  console.log(`   Total transactions restored: ${totalRestored}`);
  console.log("\n" + "=".repeat(80) + "\n");
}

verifyAllStatements()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
