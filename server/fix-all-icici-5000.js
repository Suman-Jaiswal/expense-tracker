import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import fs from "fs";
import { db } from "./firebase.js";

const validationResults = JSON.parse(
  fs.readFileSync("./validation-results.json", "utf8")
);

async function analyzeStatement(statementId) {
  const validation = validationResults.find(
    (v) => v.statementId === statementId
  );
  if (!validation) {
    console.log(`❌ Statement ${statementId} not found in validation results`);
    return null;
  }

  const period = validation.period;
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📄 Statement: ${statementId}`);
  console.log(`📅 Period: ${period.start} to ${period.end}`);
  console.log(`${"=".repeat(80)}\n`);

  // Get current DB transactions
  const q = query(
    collection(db, "transactions"),
    where("statementId", "==", statementId)
  );
  const snapshot = await getDocs(q);
  const currentDbTxns = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  console.log(`📊 Current State:`);
  console.log(`  PDF Transactions: ${validation.pdfTransactions.length}`);
  console.log(`  DB Transactions: ${currentDbTxns.length}`);
  console.log(`  Missing from DB: ${validation.missingInDB.length}`);
  console.log(`  Extra in DB (not in PDF): ${validation.extraInDB.length}`);

  // Check ambiguous transactions
  const ambiguousErrors =
    validation.errors?.filter((e) => e.type === "ambiguous_transactions") || [];

  if (ambiguousErrors.length > 0) {
    console.log(`\n⚠️  Ambiguous Transactions Found:`);
    ambiguousErrors.forEach((error) => {
      error.details?.forEach((detail) => {
        console.log(
          `  ${detail.date} | ${detail.type.padEnd(6)} | ₹${String(detail.suggestedAmount).padStart(12)} | ${detail.description}`
        );
        console.log(`    Reason: ${detail.reason}`);
      });
    });
  }

  // Check if "extra" transactions still exist
  const transactionsToRestore = [];
  if (validation.extraInDB.length > 0) {
    console.log(`\n🔍 Checking "extra" transactions status:`);
    for (const extraTxn of validation.extraInDB) {
      const docRef = doc(db, "transactions", extraTxn.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        console.log(
          `  ❌ DELETED: ${extraTxn.id} - ${extraTxn.date} | ₹${extraTxn.amount} | ${extraTxn.description}`
        );
        transactionsToRestore.push(extraTxn);
      } else {
        console.log(
          `  ✅ EXISTS: ${extraTxn.id} - ${extraTxn.date} | ₹${extraTxn.amount}`
        );
      }
    }
  }

  return {
    statementId,
    period,
    currentDbTxns,
    transactionsToRestore,
    ambiguousErrors,
  };
}

async function restoreTransactions(transactionsToRestore) {
  if (transactionsToRestore.length === 0) {
    console.log(`\n✅ No transactions need to be restored`);
    return;
  }

  console.log(
    `\n🔧 Restoring ${transactionsToRestore.length} transactions...\n`
  );

  for (const txn of transactionsToRestore) {
    try {
      const txnRef = doc(db, "transactions", txn.id);
      await setDoc(txnRef, {
        ...txn,
        updatedAt: new Date().toISOString(),
        restoredAt: new Date().toISOString(),
        fixReason:
          "Restored - was incorrectly removed during validation cleanup",
      });
      console.log(
        `  ✅ Restored: ${txn.date} | ${txn.type.padEnd(6)} | ₹${String(txn.amount).padStart(10)} | ${txn.description}`
      );
    } catch (error) {
      console.error(`  ❌ Failed to restore ${txn.id}:`, error.message);
    }
  }
}

async function fixAllICICI5000Statements() {
  console.log("\n🔧 FIXING ALL ICICI XX5000 STATEMENTS\n");

  const iciciStatements = validationResults.filter(
    (v) => v.resourceIdentifier === "card_ICICI_XX5000"
  );

  console.log(
    `Found ${iciciStatements.length} ICICI XX5000 statements to check\n`
  );

  for (const stmt of iciciStatements) {
    const analysis = await analyzeStatement(stmt.statementId);

    if (analysis && analysis.transactionsToRestore.length > 0) {
      await restoreTransactions(analysis.transactionsToRestore);
    }

    // Verify final count
    const q = query(
      collection(db, "transactions"),
      where("statementId", "==", stmt.statementId)
    );
    const snapshot = await getDocs(q);
    console.log(`\n✅ Final transaction count: ${snapshot.docs.length}`);
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log("✅ ALL ICICI XX5000 STATEMENTS PROCESSED");
  console.log(`${"=".repeat(80)}\n`);
}

fixAllICICI5000Statements()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
