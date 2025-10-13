import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";

async function removeDuplicates() {
  try {
    console.log("🔍 Finding and removing duplicate statements...\n");

    const statementsSnapshot = await getDocs(collection(db, "statements"));
    const statements = [];

    statementsSnapshot.forEach((docSnap) => {
      statements.push({ id: docSnap.id, ...docSnap.data() });
    });

    console.log(`📊 Total statements: ${statements.length}\n`);

    // Group by resourceIdentifier and period
    const grouped = {};

    statements.forEach((stmt) => {
      const key = `${stmt.resourceIdentifier}_${stmt.period?.start}_${stmt.period?.end}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(stmt);
    });

    // Find and remove duplicates (keep the first one)
    let removedCount = 0;
    for (const [key, stmts] of Object.entries(grouped)) {
      if (stmts.length > 1) {
        console.log(`\n🔴 Found ${stmts.length} duplicates for: ${key}`);

        // Keep the first statement, remove the rest
        const [keep, ...remove] = stmts.sort((a, b) =>
          (a.createdAt || "").localeCompare(b.createdAt || "")
        );

        console.log(`   ✅ Keeping: ${keep.id} (created: ${keep.createdAt})`);

        for (const stmt of remove) {
          console.log(
            `   ❌ Removing: ${stmt.id} (created: ${stmt.createdAt})`
          );
          await deleteDoc(doc(db, "statements", stmt.id));
          removedCount++;
        }
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`✅ Removed ${removedCount} duplicate statements`);
    console.log(
      `📊 Remaining statements: ${statements.length - removedCount}\n`
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

removeDuplicates();
