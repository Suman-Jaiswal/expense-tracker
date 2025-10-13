import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";

/**
 * Clean only transactions from Firebase
 * Keeps statements and Drive files intact
 */
async function cleanTransactions() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("🧹 CLEANING TRANSACTIONS ONLY");
  console.log("   • Firebase Transactions");
  console.log("   • Statements & Drive files will remain intact");
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    const transactionsCollection = collection(db, "transactions");
    const transactionsSnapshot = await getDocs(transactionsCollection);
    const txnCount = transactionsSnapshot.size;

    console.log(`🗑️  Deleting ${txnCount} transactions from Firebase...\n`);

    let deletedCount = 0;
    for (const docSnapshot of transactionsSnapshot.docs) {
      await deleteDoc(doc(db, "transactions", docSnapshot.id));
      deletedCount++;

      if (deletedCount % 10 === 0) {
        process.stdout.write(
          `   Deleted ${deletedCount}/${txnCount} transactions...\r`
        );
      }
    }

    console.log(`✅ Deleted ${deletedCount} transactions from Firebase\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("✅ CLEANUP COMPLETED SUCCESSFULLY!\n");
    console.log(`Summary:`);
    console.log(`  • Firebase transactions deleted: ${deletedCount}`);
    console.log(`  • Statements preserved: ✓`);
    console.log(`  • Drive files preserved: ✓\n`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

cleanTransactions();
