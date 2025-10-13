import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";

async function checkDuplicates() {
  try {
    console.log("🔍 Checking for duplicate statements...\n");

    const statementsSnapshot = await getDocs(collection(db, "statements"));
    const statements = [];

    statementsSnapshot.forEach((doc) => {
      statements.push({ id: doc.id, ...doc.data() });
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

    // Find duplicates
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("🔴 DUPLICATE STATEMENTS:\n");

    let duplicateCount = 0;
    for (const [key, stmts] of Object.entries(grouped)) {
      if (stmts.length > 1) {
        duplicateCount++;
        console.log(`${duplicateCount}. ${key}`);
        console.log(`   Count: ${stmts.length} duplicates`);
        stmts.forEach((stmt, idx) => {
          console.log(`   [${idx + 1}] ID: ${stmt.id}`);
          console.log(`       Resource: ${stmt.resourceIdentifier}`);
          console.log(
            `       Period: ${stmt.period?.start} to ${stmt.period?.end}`
          );
          console.log(`       Drive: ${stmt.driveFileId}`);
        });
        console.log("");
      }
    }

    if (duplicateCount === 0) {
      console.log("✅ No duplicates found!\n");
    } else {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      console.log(`⚠️  Found ${duplicateCount} sets of duplicate statements\n`);
    }

    // Show ICICI XX9003 statements specifically
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("📋 ALL ICICI XX9003 STATEMENTS:\n");

    const iciciStatements = statements
      .filter((s) => s.resourceIdentifier === "card_ICICI_XX9003")
      .sort((a, b) =>
        (a.period?.start || "").localeCompare(b.period?.start || "")
      );

    iciciStatements.forEach((stmt, idx) => {
      console.log(
        `${idx + 1}. ${stmt.period?.start} to ${stmt.period?.end} | ID: ${stmt.id.substring(0, 8)}...`
      );
    });

    console.log(`\nTotal ICICI XX9003 statements: ${iciciStatements.length}`);

    // Count by month
    const byMonth = {};
    iciciStatements.forEach((stmt) => {
      const month = stmt.period?.start?.substring(0, 7) || "unknown";
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    console.log("\n📅 By Month:");
    Object.entries(byMonth)
      .sort()
      .forEach(([month, count]) => {
        const flag = count > 1 ? "⚠️  DUPLICATE" : "✅";
        console.log(`   ${month}: ${count} ${flag}`);
      });
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkDuplicates();
