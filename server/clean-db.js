import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { google } from "googleapis";
import { db } from "./firebase.js";
import { authorize } from "./src/auth/index.js";

const DRIVE_FOLDER_ID = "1ttdRxxehikh3TqNXoiKrSxRqe9H5yllw";

async function cleanDriveFiles(drive) {
  console.log("☁️  Deleting files from Google Drive...");

  try {
    // List all PDF files in the statements folder
    const res = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and mimeType='application/pdf' and trashed=false`,
      fields: "files(id, name)",
      pageSize: 1000,
    });

    const files = res.data.files;

    if (files.length === 0) {
      console.log("   ℹ️  No files found in Google Drive\n");
      return 0;
    }

    console.log(`   Found ${files.length} file(s) to delete`);

    let deletedCount = 0;
    for (const file of files) {
      try {
        await drive.files.delete({ fileId: file.id });
        deletedCount++;
        if (deletedCount % 5 === 0) {
          process.stdout.write(
            `   Deleted ${deletedCount}/${files.length} files...\r`
          );
        }
      } catch (error) {
        console.log(`\n   ⚠️  Failed to delete ${file.name}: ${error.message}`);
      }
    }

    console.log(`✅ Deleted ${deletedCount} file(s) from Google Drive\n`);
    return deletedCount;
  } catch (error) {
    console.error(`❌ Error accessing Google Drive: ${error.message}\n`);
    return 0;
  }
}

async function cleanFirebaseData() {
  // Delete all transactions
  console.log("🗑️  Deleting transactions from Firebase...");
  const transactionsSnapshot = await getDocs(collection(db, "transactions"));
  let txnCount = 0;

  for (const docSnap of transactionsSnapshot.docs) {
    await deleteDoc(doc(db, "transactions", docSnap.id));
    txnCount++;
    if (txnCount % 10 === 0) {
      process.stdout.write(`   Deleted ${txnCount} transactions...\r`);
    }
  }
  console.log(`✅ Deleted ${txnCount} transactions from Firebase\n`);

  // Delete all statements
  console.log("🗑️  Deleting statements from Firebase...");
  const statementsSnapshot = await getDocs(collection(db, "statements"));
  let stmtCount = 0;

  for (const docSnap of statementsSnapshot.docs) {
    await deleteDoc(doc(db, "statements", docSnap.id));
    stmtCount++;
    if (stmtCount % 5 === 0) {
      process.stdout.write(`   Deleted ${stmtCount} statements...\r`);
    }
  }
  console.log(`✅ Deleted ${stmtCount} statements from Firebase\n`);

  return { txnCount, stmtCount };
}

async function cleanDatabase() {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("🧹 STARTING COMPLETE CLEANUP");
    console.log("   • Google Drive PDFs");
    console.log("   • Firebase Statements");
    console.log("   • Firebase Transactions");
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Authenticate with Google
    console.log("🔐 Authenticating with Google...");
    const auth = await authorize();
    const drive = google.drive({ version: "v3", auth });
    console.log("✅ Authenticated successfully\n");

    // Step 1: Clean Google Drive files
    const driveCount = await cleanDriveFiles(drive);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Step 2: Clean Firebase data
    const { txnCount, stmtCount } = await cleanFirebaseData();

    // Summary
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("✅ CLEANUP COMPLETED SUCCESSFULLY!\n");
    console.log(`Summary:`);
    console.log(`  • Google Drive PDFs deleted: ${driveCount}`);
    console.log(`  • Firebase transactions deleted: ${txnCount}`);
    console.log(`  • Firebase statements deleted: ${stmtCount}`);
    console.log(
      `  • Total items deleted: ${driveCount + txnCount + stmtCount}\n`
    );
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

cleanDatabase();
