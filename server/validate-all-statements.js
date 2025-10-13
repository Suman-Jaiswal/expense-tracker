import { collection, getDocs, query, where } from "firebase/firestore";
import fs from "fs";
import { google } from "googleapis";
import path from "path";
import { db } from "./firebase.js";
import { authorize } from "./src/auth/index.js";
import { config } from "./src/config.js";
import { extractTransactionsFromPDF } from "./src/services/transactions/transactionExtractor.js";

const TEMP_DIR = path.join(process.cwd(), "temp");
const VALIDATION_RESULTS_PATH = path.join(
  process.cwd(),
  "validation-results.json"
);
const FIX_SCRIPT_PATH = path.join(process.cwd(), "fix-transactions.js");

/**
 * Download PDF from Google Drive
 */
async function downloadPDFFromDrive(drive, fileId, outputPath) {
  const dest = fs.createWriteStream(outputPath);
  const res = await drive.files.get(
    { fileId: fileId, alt: "media" },
    { responseType: "stream" }
  );

  return new Promise((resolve, reject) => {
    res.data
      .on("end", () => {
        console.log(`   ✅ Downloaded PDF to ${outputPath}`);
        resolve();
      })
      .on("error", (err) => {
        console.error("   ❌ Error downloading file:", err);
        reject(err);
      })
      .pipe(dest);
  });
}

/**
 * Get password for a card
 */
function getPasswordForCard(resourceIdentifier) {
  if (resourceIdentifier.includes("SBI")) {
    return config.RESOURCES.SBI.pdfPassword;
  } else if (resourceIdentifier.includes("AXIS")) {
    return config.RESOURCES.AXIS.pdfPassword;
  } else if (resourceIdentifier.includes("ICICI")) {
    return config.RESOURCES.ICICI.pdfPassword;
  }
  return "";
}

/**
 * Get all statements from Firebase
 */
async function getAllStatements() {
  const statementsCollection = collection(db, "statements");
  const snapshot = await getDocs(statementsCollection);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get transactions for a statement from Firebase
 */
async function getTransactionsForStatement(statementId) {
  const transactionsCollection = collection(db, "transactions");
  const q = query(
    transactionsCollection,
    where("statementId", "==", statementId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Compare two transactions for equality
 */
function compareTransactions(txn1, txn2) {
  const differences = [];

  if (txn1.date !== txn2.date) {
    differences.push(`date: ${txn1.date} vs ${txn2.date}`);
  }
  if (Math.abs(txn1.amount - txn2.amount) > 0.01) {
    differences.push(`amount: ${txn1.amount} vs ${txn2.amount}`);
  }
  if (txn1.type !== txn2.type) {
    differences.push(`type: ${txn1.type} vs ${txn2.type}`);
  }
  if (txn1.description !== txn2.description) {
    differences.push(
      `description: "${txn1.description}" vs "${txn2.description}"`
    );
  }

  return differences;
}

/**
 * Validate a single statement
 */
async function validateStatement(
  drive,
  statement,
  statementIndex,
  totalStatements
) {
  console.log(
    `\n${"=".repeat(80)}\n📄 [${statementIndex + 1}/${totalStatements}] Validating Statement: ${statement.id}`
  );
  console.log(`   Card: ${statement.resourceIdentifier}`);
  console.log(
    `   Period: ${statement.period.start} to ${statement.period.end}`
  );

  const result = {
    statementId: statement.id,
    resourceIdentifier: statement.resourceIdentifier,
    period: statement.period,
    pdfPath: null,
    pdfTransactions: [],
    dbTransactions: [],
    missingInDB: [],
    extraInDB: [],
    incorrect: [],
    errors: [],
  };

  try {
    // Step 1: Download PDF from Google Drive
    const password = getPasswordForCard(statement.resourceIdentifier);

    // Ensure temp directory exists
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const tempPdfPath = path.join(TEMP_DIR, `statement_${statement.id}.pdf`);

    // Download from Drive
    console.log(`   ☁️  Downloading PDF from Google Drive...`);
    await downloadPDFFromDrive(drive, statement.driveFileId, tempPdfPath);

    result.pdfPath = tempPdfPath;

    // Step 2: Extract transactions from PDF
    console.log(`   🔍 Extracting transactions from PDF...`);
    const extractionResult = await extractTransactionsFromPDF(
      tempPdfPath,
      password,
      statement.resourceIdentifier
    );

    result.pdfTransactions = extractionResult.transactions || [];
    console.log(
      `   ✅ Extracted ${result.pdfTransactions.length} transactions from PDF`
    );

    if (extractionResult.ambiguousTransactions?.length > 0) {
      console.log(
        `   ⚠️  ${extractionResult.ambiguousTransactions.length} ambiguous transactions found in PDF`
      );
      result.errors.push({
        type: "ambiguous_transactions",
        count: extractionResult.ambiguousTransactions.length,
        details: extractionResult.ambiguousTransactions,
      });
    }

    // Step 3: Get transactions from database
    console.log(`   📊 Fetching transactions from database...`);
    const dbTransactions = await getTransactionsForStatement(statement.id);
    result.dbTransactions = dbTransactions;
    console.log(
      `   ✅ Found ${dbTransactions.length} transactions in database`
    );

    // Step 4: Compare transactions
    console.log(`   🔄 Comparing transactions...`);

    // Create maps for efficient lookup
    const pdfTxnMap = new Map();
    result.pdfTransactions.forEach((txn) => {
      const key = `${txn.date}|${txn.description}|${txn.amount}|${txn.type}`;
      pdfTxnMap.set(key, txn);
    });

    const dbTxnMap = new Map();
    dbTransactions.forEach((txn) => {
      const key = `${txn.date}|${txn.description}|${txn.amount}|${txn.type}`;
      dbTxnMap.set(key, txn);
    });

    // Find missing transactions (in PDF but not in DB)
    for (const [key, pdfTxn] of pdfTxnMap) {
      if (!dbTxnMap.has(key)) {
        result.missingInDB.push(pdfTxn);
      }
    }

    // Find extra transactions (in DB but not in PDF)
    for (const [key, dbTxn] of dbTxnMap) {
      if (!pdfTxnMap.has(key)) {
        result.extraInDB.push(dbTxn);
      }
    }

    // Find incorrect transactions (matching by ID but different data)
    const dbTxnById = new Map(dbTransactions.map((txn) => [txn.id, txn]));
    for (const pdfTxn of result.pdfTransactions) {
      const dbTxn = dbTxnById.get(pdfTxn.id);
      if (dbTxn) {
        const differences = compareTransactions(pdfTxn, dbTxn);
        if (differences.length > 0) {
          result.incorrect.push({
            id: pdfTxn.id,
            pdfData: pdfTxn,
            dbData: dbTxn,
            differences,
          });
        }
      }
    }

    // Step 5: Report results
    console.log(`\n   📊 Validation Results:`);
    console.log(`      PDF Transactions: ${result.pdfTransactions.length}`);
    console.log(`      DB Transactions: ${result.dbTransactions.length}`);
    console.log(
      `      ✅ Matching: ${result.pdfTransactions.length - result.missingInDB.length - result.incorrect.length}`
    );
    console.log(`      ❌ Missing in DB: ${result.missingInDB.length}`);
    console.log(`      ⚠️  Extra in DB: ${result.extraInDB.length}`);
    console.log(`      🔧 Incorrect: ${result.incorrect.length}`);

    if (result.missingInDB.length > 0) {
      console.log(`\n   🔍 Missing Transactions (in PDF but not in DB):`);
      result.missingInDB.forEach((txn, idx) => {
        console.log(
          `      ${idx + 1}. ${txn.date} | ${txn.description.substring(0, 40)} | ₹${txn.amount} ${txn.type}`
        );
      });
    }

    if (result.extraInDB.length > 0) {
      console.log(`\n   🔍 Extra Transactions (in DB but not in PDF):`);
      result.extraInDB.forEach((txn, idx) => {
        console.log(
          `      ${idx + 1}. ${txn.date} | ${txn.description.substring(0, 40)} | ₹${txn.amount} ${txn.type}`
        );
      });
    }

    if (result.incorrect.length > 0) {
      console.log(`\n   🔍 Incorrect Transactions:`);
      result.incorrect.forEach((item, idx) => {
        console.log(`      ${idx + 1}. Transaction ID: ${item.id}`);
        console.log(`         Differences: ${item.differences.join(", ")}`);
      });
    }

    // Clean up downloaded file
    if (fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
      console.log(`   🗑️  Cleaned up temporary file`);
    }
  } catch (error) {
    console.error(`   ❌ Error validating statement:`, error.message);
    result.errors.push({
      type: "validation_error",
      message: error.message,
      stack: error.stack,
    });
  }

  return result;
}

/**
 * Generate fix script
 */
function generateFixScript(validationResults) {
  const missingTransactions = [];
  const extraTransactions = [];
  const incorrectTransactions = [];

  for (const result of validationResults) {
    for (const txn of result.missingInDB) {
      missingTransactions.push({
        ...txn,
        statementId: result.statementId,
        resourceIdentifier: result.resourceIdentifier,
      });
    }

    for (const txn of result.extraInDB) {
      extraTransactions.push(txn);
    }

    for (const item of result.incorrect) {
      incorrectTransactions.push({
        id: item.id,
        statementId: result.statementId,
        correctData: item.pdfData,
        currentData: item.dbData,
        differences: item.differences,
      });
    }
  }

  const scriptContent = `import { db } from "./firebase.js";
import { collection, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";

/**
 * FIX SCRIPT - Generated on ${new Date().toISOString()}
 * 
 * Summary:
 * - Missing transactions to add: ${missingTransactions.length}
 * - Extra transactions to remove: ${extraTransactions.length}
 * - Incorrect transactions to fix: ${incorrectTransactions.length}
 * 
 * ⚠️  REVIEW THIS SCRIPT CAREFULLY BEFORE RUNNING!
 */

const MISSING_TRANSACTIONS = ${JSON.stringify(missingTransactions, null, 2)};

const EXTRA_TRANSACTIONS = ${JSON.stringify(
    extraTransactions.map((t) => t.id),
    null,
    2
  )};

const INCORRECT_TRANSACTIONS = ${JSON.stringify(incorrectTransactions, null, 2)};

async function addMissingTransactions() {
  console.log(\`\\n📝 Adding \${MISSING_TRANSACTIONS.length} missing transactions...\\n\`);
  
  for (const txn of MISSING_TRANSACTIONS) {
    try {
      const transactionRef = doc(db, "transactions", txn.id);
      await setDoc(transactionRef, {
        ...txn,
        createdAt: new Date().toISOString(),
        fixedAt: new Date().toISOString(),
        fixReason: "Missing from validation",
      });
      console.log(\`   ✅ Added: \${txn.id} | \${txn.date} | \${txn.description.substring(0, 40)}\`);
    } catch (error) {
      console.error(\`   ❌ Failed to add \${txn.id}:\`, error.message);
    }
  }
}

async function removeExtraTransactions() {
  console.log(\`\\n🗑️  Removing \${EXTRA_TRANSACTIONS.length} extra transactions...\\n\`);
  
  for (const txnId of EXTRA_TRANSACTIONS) {
    try {
      const transactionRef = doc(db, "transactions", txnId);
      await deleteDoc(transactionRef);
      console.log(\`   ✅ Removed: \${txnId}\`);
    } catch (error) {
      console.error(\`   ❌ Failed to remove \${txnId}:\`, error.message);
    }
  }
}

async function fixIncorrectTransactions() {
  console.log(\`\\n🔧 Fixing \${INCORRECT_TRANSACTIONS.length} incorrect transactions...\\n\`);
  
  for (const item of INCORRECT_TRANSACTIONS) {
    try {
      const transactionRef = doc(db, "transactions", item.id);
      const correctData = item.correctData;
      await updateDoc(transactionRef, {
        date: correctData.date,
        description: correctData.description,
        merchant: correctData.merchant,
        amount: correctData.amount,
        type: correctData.type,
        category: correctData.category,
        updatedAt: new Date().toISOString(),
        fixedAt: new Date().toISOString(),
        fixReason: \`Corrected: \${item.differences.join(", ")}\`,
      });
      console.log(\`   ✅ Fixed: \${item.id}\`);
      console.log(\`      Changes: \${item.differences.join(", ")}\`);
    } catch (error) {
      console.error(\`   ❌ Failed to fix \${item.id}:\`, error.message);
    }
  }
}

async function runFix() {
  console.log(\`\\n${"=".repeat(80)}\`);
  console.log("🔧 STARTING DATABASE FIX");
  console.log(\`${"=".repeat(80)}\\n\`);
  
  console.log("Summary:");
  console.log(\`  - Missing transactions to add: \${MISSING_TRANSACTIONS.length}\`);
  console.log(\`  - Extra transactions to remove: \${EXTRA_TRANSACTIONS.length}\`);
  console.log(\`  - Incorrect transactions to fix: \${INCORRECT_TRANSACTIONS.length}\`);
  
  // Ask for confirmation
  console.log(\`\\n⚠️  This will modify your database. Press Ctrl+C to cancel.\\n\`);
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    await addMissingTransactions();
    await fixIncorrectTransactions();
    // Uncomment the line below if you want to remove extra transactions
    // await removeExtraTransactions();
    
    console.log(\`\\n${"=".repeat(80)}\`);
    console.log("✅ FIX COMPLETED SUCCESSFULLY");
    console.log(\`${"=".repeat(80)}\\n\`);
  } catch (error) {
    console.error("\\n❌ Fix failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the fix
runFix();
`;

  fs.writeFileSync(FIX_SCRIPT_PATH, scriptContent);
  console.log(`\n✅ Fix script generated: ${FIX_SCRIPT_PATH}`);
}

/**
 * Main validation function
 */
async function main() {
  console.log(`\n${"=".repeat(80)}`);
  console.log("🔍 STATEMENT VALIDATION TOOL");
  console.log(`${"=".repeat(80)}\n`);

  try {
    // Step 1: Authorize with Google
    console.log("🔐 Authorizing with Google...");
    const auth = await authorize();
    const drive = google.drive({ version: "v3", auth });
    console.log("✅ Authorization successful\n");

    // Step 2: Get all statements
    console.log("📊 Fetching statements from Firebase...");
    const statements = await getAllStatements();
    console.log(`✅ Found ${statements.length} statements\n`);

    if (statements.length === 0) {
      console.log("⚠️  No statements found in database. Exiting.");
      return;
    }

    // Step 3: Validate each statement
    const validationResults = [];
    for (let i = 0; i < statements.length; i++) {
      const result = await validateStatement(
        drive,
        statements[i],
        i,
        statements.length
      );
      validationResults.push(result);
    }

    // Step 4: Generate summary report
    console.log(`\n${"=".repeat(80)}`);
    console.log("📊 VALIDATION SUMMARY");
    console.log(`${"=".repeat(80)}\n`);

    const totalMissing = validationResults.reduce(
      (sum, r) => sum + r.missingInDB.length,
      0
    );
    const totalExtra = validationResults.reduce(
      (sum, r) => sum + r.extraInDB.length,
      0
    );
    const totalIncorrect = validationResults.reduce(
      (sum, r) => sum + r.incorrect.length,
      0
    );
    const totalErrors = validationResults.reduce(
      (sum, r) => sum + r.errors.length,
      0
    );

    console.log(`Total Statements Validated: ${statements.length}`);
    console.log(`Total Missing Transactions: ${totalMissing}`);
    console.log(`Total Extra Transactions: ${totalExtra}`);
    console.log(`Total Incorrect Transactions: ${totalIncorrect}`);
    console.log(`Total Errors: ${totalErrors}`);

    // Step 5: Save detailed results
    fs.writeFileSync(
      VALIDATION_RESULTS_PATH,
      JSON.stringify(validationResults, null, 2)
    );
    console.log(`\n✅ Detailed results saved: ${VALIDATION_RESULTS_PATH}`);

    // Step 6: Generate fix script
    if (totalMissing > 0 || totalExtra > 0 || totalIncorrect > 0) {
      generateFixScript(validationResults);
      console.log(
        `\n📝 Review the fix script and run it with: node ${FIX_SCRIPT_PATH}`
      );
    } else {
      console.log(`\n✅ All transactions are correct! No fixes needed.`);
    }

    console.log(`\n${"=".repeat(80)}\n`);
  } catch (error) {
    console.error("❌ Validation failed:", error);
    process.exit(1);
  }
}

// Run the validation
main();
