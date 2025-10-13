import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase.js";
import { getAllStatements } from "./src/repository/statements.js";

async function checkICICI5000July() {
  console.log("\n🔍 Checking ICICI XX5000 July 2025 Statement\n");

  // Get the statement
  const statements = await getAllStatements();
  const julyStatement = statements.find(
    (s) =>
      s.resourceIdentifier === "card_ICICI_XX5000" &&
      s.period?.start >= "2025-06-01" &&
      s.period?.end <= "2025-08-01"
  );

  if (!julyStatement) {
    console.log("❌ July 2025 statement not found for ICICI XX5000");
    return;
  }

  console.log(`📄 Statement ID: ${julyStatement.id}`);
  console.log(
    `📅 Period: ${julyStatement.period?.start} to ${julyStatement.period?.end}`
  );
  console.log(`🔗 Drive URL: ${julyStatement.driveUrl}`);

  // Get transactions for this statement
  const transactionsCollection = collection(db, "transactions");
  const q = query(
    transactionsCollection,
    where("statementId", "==", julyStatement.id)
  );

  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  console.log(
    `\n💳 Found ${transactions.length} transactions in DB for this statement:\n`
  );

  // Sort by date
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  transactions.forEach((tx) => {
    console.log(
      `  ${tx.date} | ${tx.type.padEnd(6)} | ₹${tx.amount.toString().padStart(10)} | ${tx.description.substring(0, 50)}`
    );
  });

  console.log(`\n📊 Summary:`);
  console.log(`  Total transactions in DB: ${transactions.length}`);
  console.log(`  Expected from PDF: 6`);
  console.log(`  Missing: ${6 - transactions.length}`);

  // Check if the 3 missing transactions from fix script exist
  const missingTxnIds = [
    "txn_9f9e8dd08648474b",
    "txn_e9db87c3418c3cf6",
    "txn_d2758505a351c31a",
  ];

  console.log(`\n🔎 Checking if previously missing transactions were added:`);
  for (const txnId of missingTxnIds) {
    const exists = transactions.some((tx) => tx.id === txnId);
    console.log(`  ${txnId}: ${exists ? "✅ Found" : "❌ Missing"}`);
  }
}

checkICICI5000July()
  .then(() => {
    console.log("\n✅ Check complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
