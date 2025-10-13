import {
  collection,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";

const statementsCollection = collection(db, "statements");
const transactionsCollection = collection(db, "transactions");

/**
 * Fix SBI card number from XX2115 to XX5965
 * Updates both statements and transactions
 */
async function fixSbiCardNumber() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("🔧 FIXING SBI CARD NUMBER");
  console.log("   From: card_SBI_XX2115 (incorrect)");
  console.log("   To:   card_SBI_XX5965 (correct)\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Step 1: Fix Statements
    console.log("📊 Step 1: Fixing Statements...\n");

    const statementsQuery = query(
      statementsCollection,
      where("resourceIdentifier", "==", "card_SBI_XX2115")
    );

    const statementsSnapshot = await getDocs(statementsQuery);
    const statements = statementsSnapshot.docs;

    if (statements.length === 0) {
      console.log("   ℹ️  No statements found with card_SBI_XX2115\n");
    } else {
      console.log(`   Found ${statements.length} statement(s) to fix\n`);

      for (const statementDoc of statements) {
        const statementData = statementDoc.data();
        console.log(`   📄 Updating statement: ${statementData.id}`);
        console.log(
          `      Period: ${statementData.period.start} to ${statementData.period.end}`
        );

        await updateDoc(statementDoc.ref, {
          resourceIdentifier: "card_SBI_XX5965",
        });

        console.log(`      ✅ Updated to card_SBI_XX5965\n`);
      }

      console.log(`   ✅ Fixed ${statements.length} statement(s)\n`);
    }

    // Step 2: Fix Transactions
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("💳 Step 2: Fixing Transactions...\n");

    const transactionsQuery = query(
      transactionsCollection,
      where("resourceIdentifier", "==", "card_SBI_XX2115")
    );

    const transactionsSnapshot = await getDocs(transactionsQuery);
    const transactions = transactionsSnapshot.docs;

    if (transactions.length === 0) {
      console.log("   ℹ️  No transactions found with card_SBI_XX2115\n");
    } else {
      console.log(`   Found ${transactions.length} transaction(s) to fix\n`);

      let updated = 0;
      for (const transactionDoc of transactions) {
        await updateDoc(transactionDoc.ref, {
          resourceIdentifier: "card_SBI_XX5965",
        });
        updated++;

        if (updated % 10 === 0) {
          process.stdout.write(
            `   Updated ${updated}/${transactions.length} transactions...\r`
          );
        }
      }

      console.log(`   ✅ Fixed ${transactions.length} transaction(s)\n`);
    }

    // Summary
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("✅ FIX COMPLETED SUCCESSFULLY!\n");
    console.log("Summary:");
    console.log(`  • Statements updated: ${statements.length}`);
    console.log(`  • Transactions updated: ${transactions.length}`);
    console.log(
      `  • Total documents updated: ${statements.length + transactions.length}\n`
    );
    console.log("All SBI records now use card_SBI_XX5965 ✅\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("❌ Error during fix:", error);
    throw error;
  }
}

// Run the fix
fixSbiCardNumber()
  .then(() => {
    console.log("🎉 Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
