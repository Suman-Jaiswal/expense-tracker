import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";

async function checkStatementDetails() {
  try {
    console.log("🔍 Checking statement details for overlapping periods...\n");

    const statementsSnapshot = await getDocs(collection(db, "statements"));
    const statements = [];

    statementsSnapshot.forEach((doc) => {
      statements.push({ id: doc.id, ...doc.data() });
    });

    // Get ICICI XX9003 statements from June onwards
    const iciciStatements = statements
      .filter(
        (s) =>
          s.resourceIdentifier === "card_ICICI_XX9003" &&
          s.period?.start >= "2025-06-01"
      )
      .sort((a, b) =>
        (a.period?.start || "").localeCompare(b.period?.start || "")
      );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("📋 ICICI XX9003 STATEMENTS (June onwards):\n");

    iciciStatements.forEach((stmt, idx) => {
      console.log(
        `${idx + 1}. Period: ${stmt.period?.start} to ${stmt.period?.end}`
      );
      console.log(`   Gmail ID: ${stmt.id}`);
      console.log(`   Drive ID: ${stmt.driveFileId}`);
      console.log(`   Resource: ${stmt.resourceIdentifier}`);
      if (stmt.statementData) {
        console.log(`   Amount Due: ₹${stmt.statementData.amountDue || "N/A"}`);
        console.log(
          `   Due Date: ${stmt.statementData.paymentDueDate || "N/A"}`
        );
      }
      console.log("");
    });

    // Check for overlapping periods
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("🔍 ANALYZING OVERLAPS:\n");

    for (let i = 0; i < iciciStatements.length - 1; i++) {
      const stmt1 = iciciStatements[i];
      const stmt2 = iciciStatements[i + 1];

      const end1 = new Date(stmt1.period.end);
      const start2 = new Date(stmt2.period.start);

      if (end1 >= start2) {
        console.log(`⚠️  OVERLAP DETECTED:`);
        console.log(
          `   Statement A: ${stmt1.period.start} to ${stmt1.period.end}`
        );
        console.log(
          `   Statement B: ${stmt2.period.start} to ${stmt2.period.end}`
        );
        console.log(
          `   Overlapping days: ${Math.floor((end1 - start2) / (1000 * 60 * 60 * 24)) + 1}`
        );
        console.log("");
      }
    }

    // Analyze the pattern
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("📊 STATEMENT CYCLE ANALYSIS:\n");

    const cycles = {};
    iciciStatements.forEach((stmt) => {
      const startDay = parseInt(stmt.period.start.split("-")[2]);
      cycles[startDay] = (cycles[startDay] || 0) + 1;
    });

    console.log("Statement generation days:");
    Object.entries(cycles).forEach(([day, count]) => {
      console.log(`   Day ${day}: ${count} statements`);
    });

    console.log("\n💡 CONCLUSION:");
    if (Object.keys(cycles).length > 1) {
      console.log("   ⚠️  Multiple statement cycles detected!");
      console.log("   This could mean:");
      console.log("   1. ICICI changed the statement generation date");
      console.log("   2. There are multiple cards with same last 4 digits");
      console.log("   3. Both old and new cycles are being processed");
    } else {
      console.log("   ✅ Single consistent statement cycle");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkStatementDetails();
