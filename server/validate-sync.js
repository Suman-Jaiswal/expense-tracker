import { collection, getDocs } from "firebase/firestore";
import { google } from "googleapis";
import { db } from "./firebase.js";
import { authorize } from "./src/auth/index.js";

const DRIVE_FOLDER_ID = "1ttdRxxehikh3TqNXoiKrSxRqe9H5yllw";

async function validateSync() {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("🔍 VALIDATING SYNC DATA");
    console.log("   • Statements in Firebase");
    console.log("   • Files in Google Drive");
    console.log("   • Period formatting");
    console.log("   • Filename consistency");
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Step 1: Get statements from Firebase
    console.log("📊 Step 1: Fetching statements from Firebase...\n");
    const statementsSnapshot = await getDocs(collection(db, "statements"));
    const statements = statementsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`   Found ${statements.length} statement(s) in Firebase\n`);

    // Step 2: Authenticate and get Drive files
    console.log("🔐 Step 2: Authenticating with Google Drive...\n");
    const auth = await authorize();
    const drive = google.drive({ version: "v3", auth });

    const driveRes = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and mimeType='application/pdf' and trashed=false`,
      fields: "files(id, name, createdTime, size)",
      orderBy: "name",
    });

    const driveFiles = driveRes.data.files;
    console.log(`   Found ${driveFiles.length} file(s) in Google Drive\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Step 3: Display Firebase statements
    console.log("📋 Step 3: Firebase Statements:\n");

    // Group by card
    const statementsByCard = statements.reduce((acc, stmt) => {
      const card = stmt.resourceIdentifier;
      if (!acc[card]) acc[card] = [];
      acc[card].push(stmt);
      return acc;
    }, {});

    for (const [card, cardStatements] of Object.entries(statementsByCard)) {
      console.log(`\n💳 ${card} (${cardStatements.length} statements):`);
      console.log("   ─────────────────────────────────────────────────────");

      // Sort by period start date
      cardStatements.sort(
        (a, b) => new Date(a.period.start) - new Date(b.period.start)
      );

      for (const stmt of cardStatements) {
        const startDate = new Date(stmt.period.start);
        const endDate = new Date(stmt.period.end);
        const startFormatted = startDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
        });
        const endFormatted = endDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
        });

        console.log(`   📅 ${startFormatted} → ${endFormatted}`);
        console.log(`      Period: ${stmt.period.start} to ${stmt.period.end}`);
        console.log(`      Drive ID: ${stmt.driveFileId}`);

        // Check if period dates are valid
        if (
          stmt.period.start === "undefined" ||
          stmt.period.end === "undefined" ||
          !stmt.period.start ||
          !stmt.period.end
        ) {
          console.log(`      ⚠️  WARNING: Invalid period dates!`);
        }
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Step 4: Display Drive files
    console.log("☁️  Step 4: Google Drive Files:\n");

    // Group by card prefix
    const filesByCard = driveFiles.reduce((acc, file) => {
      const match = file.name.match(/^(card_[A-Z]+_XX\d+)/);
      const card = match ? match[1] : "Unknown";
      if (!acc[card]) acc[card] = [];
      acc[card].push(file);
      return acc;
    }, {});

    for (const [card, files] of Object.entries(filesByCard)) {
      console.log(`\n💳 ${card} (${files.length} files):`);
      console.log("   ─────────────────────────────────────────────────────");

      for (const file of files) {
        const sizeKB = (parseInt(file.size) / 1024).toFixed(2);
        console.log(`   📄 ${file.name}`);
        console.log(`      Size: ${sizeKB} KB`);
        console.log(`      ID: ${file.id}`);

        // Check filename format
        const match = file.name.match(
          /^card_([A-Z]+)_XX(\d+)_(\d{4})-(\d{2})-(\d{2})\.pdf$/
        );
        if (!match) {
          console.log(
            `      ⚠️  WARNING: Filename format doesn't match expected pattern!`
          );
        }
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Step 5: Cross-validation
    console.log("🔗 Step 5: Cross-Validation:\n");

    let missingInDrive = 0;
    let missingInFirebase = 0;

    // Check if all Firebase statements have corresponding Drive files
    for (const stmt of statements) {
      const matchingFile = driveFiles.find((f) => f.id === stmt.driveFileId);
      if (!matchingFile) {
        console.log(
          `   ⚠️  Statement ${stmt.resourceIdentifier} (${stmt.period.start}) references Drive file ${stmt.driveFileId} but file not found!`
        );
        missingInDrive++;
      }
    }

    // Check if all Drive files have corresponding Firebase statements
    const fbDriveIds = new Set(statements.map((s) => s.driveFileId));
    for (const file of driveFiles) {
      if (!fbDriveIds.has(file.id)) {
        console.log(
          `   ⚠️  Drive file ${file.name} (${file.id}) has no corresponding statement in Firebase!`
        );
        missingInFirebase++;
      }
    }

    if (missingInDrive === 0 && missingInFirebase === 0) {
      console.log("   ✅ All statements and files are properly linked!");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Step 6: Summary
    console.log("📊 VALIDATION SUMMARY:\n");
    console.log(`   Firebase Statements: ${statements.length}`);
    console.log(`   Google Drive Files: ${driveFiles.length}`);
    console.log(`   Unique Cards: ${Object.keys(statementsByCard).length}`);
    console.log(`   Missing in Drive: ${missingInDrive}`);
    console.log(`   Missing in Firebase: ${missingInFirebase}`);

    if (
      statements.length === driveFiles.length &&
      missingInDrive === 0 &&
      missingInFirebase === 0
    ) {
      console.log("\n   ✅ VALIDATION PASSED - All data is consistent!");
    } else {
      console.log("\n   ⚠️  VALIDATION ISSUES FOUND - Please review above");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Validation error:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

validateSync();
