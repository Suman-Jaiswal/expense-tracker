import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";

async function cleanDatabase() {
  try {
    console.log("🧹 Starting database cleanup...\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Delete all transactions
    console.log("🗑️  Deleting transactions...");
    const transactionsSnapshot = await getDocs(collection(db, "transactions"));
    let txnCount = 0;

    for (const docSnap of transactionsSnapshot.docs) {
      await deleteDoc(doc(db, "transactions", docSnap.id));
      txnCount++;
      if (txnCount % 10 === 0) {
        process.stdout.write(`   Deleted ${txnCount} transactions...\r`);
      }
    }
    console.log(`✅ Deleted ${txnCount} transactions\n`);

    // Delete all statements
    console.log("🗑️  Deleting statements...");
    const statementsSnapshot = await getDocs(collection(db, "statements"));
    let stmtCount = 0;

    for (const docSnap of statementsSnapshot.docs) {
      await deleteDoc(doc(db, "statements", docSnap.id));
      stmtCount++;
      if (stmtCount % 5 === 0) {
        process.stdout.write(`   Deleted ${stmtCount} statements...\r`);
      }
    }
    console.log(`✅ Deleted ${stmtCount} statements\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("✅ DATABASE CLEANED SUCCESSFULLY!\n");
    console.log(`Summary:`);
    console.log(`  • Transactions deleted: ${txnCount}`);
    console.log(`  • Statements deleted: ${stmtCount}`);
    console.log(`  • Total documents deleted: ${txnCount + stmtCount}\n`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error cleaning database:", error.message);
    process.exit(1);
  }
}

cleanDatabase();
