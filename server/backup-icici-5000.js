import { collection, getDocs, query, where } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { db } from "./firebase.js";

/**
 * Backup script for ICICI XX5000 card data
 * Creates a complete snapshot of all statements and transactions
 */

const RESOURCE_IDENTIFIER = "card_ICICI_XX5000";
const BACKUP_DIR = "./backups";
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_FILE_PREFIX = `icici-5000-backup-${TIMESTAMP}`;

async function backupStatements() {
  console.log("\n📑 Backing up statements...");

  const q = query(
    collection(db, "statements"),
    where("resourceIdentifier", "==", RESOURCE_IDENTIFIER)
  );

  const snapshot = await getDocs(q);
  const statements = [];

  snapshot.forEach((doc) => {
    statements.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  // Sort by period start date
  statements.sort((a, b) => a.period.start.localeCompare(b.period.start));

  console.log(`   Found ${statements.length} statements`);

  return statements;
}

async function backupTransactions() {
  console.log("\n💳 Backing up transactions...");

  const q = query(
    collection(db, "transactions"),
    where("resourceIdentifier", "==", RESOURCE_IDENTIFIER)
  );

  const snapshot = await getDocs(q);
  const transactions = [];

  snapshot.forEach((doc) => {
    transactions.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  // Sort by date, then by description
  transactions.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return (a.description || "").localeCompare(b.description || "");
  });

  console.log(`   Found ${transactions.length} transactions`);

  return transactions;
}

function generateSummary(statements, transactions) {
  console.log("\n📊 Generating summary...");

  const summary = {
    backupDate: new Date().toISOString(),
    resourceIdentifier: RESOURCE_IDENTIFIER,
    cardName: "ICICI Bank Credit Card XX5000",
    totals: {
      statements: statements.length,
      transactions: transactions.length,
    },
    transactionsByType: {
      debit: transactions.filter((t) => t.type === "debit").length,
      credit: transactions.filter((t) => t.type === "credit").length,
    },
    amounts: {
      totalDebit: transactions
        .filter((t) => t.type === "debit")
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
      totalCredit: transactions
        .filter((t) => t.type === "credit")
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
    },
    dateRange: {
      earliest: transactions.length > 0 ? transactions[0].date : null,
      latest:
        transactions.length > 0
          ? transactions[transactions.length - 1].date
          : null,
    },
    statementPeriods: statements.map((s) => ({
      statementId: s.id,
      period: `${s.period.start} to ${s.period.end}`,
      transactionCount: transactions.filter((t) => t.statementId === s.id)
        .length,
    })),
    flags: {
      ambiguous: transactions.filter((t) => t.isAmbiguous).length,
      needsReview: transactions.filter((t) => t.needsReview).length,
      manuallyAdded: transactions.filter((t) => t.addedManually).length,
    },
  };

  summary.amounts.net =
    summary.amounts.totalCredit - summary.amounts.totalDebit;

  return summary;
}

function saveBackup(statements, transactions, summary) {
  console.log("\n💾 Saving backup files...");

  const backupData = {
    metadata: {
      backupDate: new Date().toISOString(),
      version: "1.0",
      resourceIdentifier: RESOURCE_IDENTIFIER,
      description:
        "Complete backup of ICICI XX5000 statements and transactions",
    },
    summary,
    statements,
    transactions,
  };

  // Save complete backup
  const backupFile = path.join(BACKUP_DIR, `${BACKUP_FILE_PREFIX}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`   ✅ Complete backup: ${backupFile}`);

  // Save summary only
  const summaryFile = path.join(
    BACKUP_DIR,
    `${BACKUP_FILE_PREFIX}-summary.json`
  );
  fs.writeFileSync(
    summaryFile,
    JSON.stringify({ metadata: backupData.metadata, summary }, null, 2)
  );
  console.log(`   ✅ Summary: ${summaryFile}`);

  // Save statements only
  const statementsFile = path.join(
    BACKUP_DIR,
    `${BACKUP_FILE_PREFIX}-statements.json`
  );
  fs.writeFileSync(statementsFile, JSON.stringify(statements, null, 2));
  console.log(`   ✅ Statements: ${statementsFile}`);

  // Save transactions only
  const transactionsFile = path.join(
    BACKUP_DIR,
    `${BACKUP_FILE_PREFIX}-transactions.json`
  );
  fs.writeFileSync(transactionsFile, JSON.stringify(transactions, null, 2));
  console.log(`   ✅ Transactions: ${transactionsFile}`);

  // Create human-readable report
  const reportFile = path.join(BACKUP_DIR, `${BACKUP_FILE_PREFIX}-report.txt`);
  const report = generateTextReport(summary, statements);
  fs.writeFileSync(reportFile, report);
  console.log(`   ✅ Report: ${reportFile}`);

  return backupFile;
}

function generateTextReport(summary, statements) {
  let report = "";

  report += "═══════════════════════════════════════════════════════════════\n";
  report += "         ICICI Bank Credit Card XX5000 - Data Backup\n";
  report +=
    "═══════════════════════════════════════════════════════════════\n\n";

  report += `Backup Date: ${new Date(summary.backupDate).toLocaleString()}\n`;
  report += `Resource: ${summary.resourceIdentifier}\n`;
  report += `Card: ${summary.cardName}\n\n`;

  report += "───────────────────────────────────────────────────────────────\n";
  report += "                        SUMMARY\n";
  report +=
    "───────────────────────────────────────────────────────────────\n\n";

  report += `Total Statements: ${summary.totals.statements}\n`;
  report += `Total Transactions: ${summary.totals.transactions}\n\n`;

  report += `Debit Transactions: ${summary.transactionsByType.debit}\n`;
  report += `Credit Transactions: ${summary.transactionsByType.credit}\n\n`;

  report += `Total Debits: ₹${summary.amounts.totalDebit.toLocaleString(
    "en-IN",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  )}\n`;
  report += `Total Credits: ₹${summary.amounts.totalCredit.toLocaleString(
    "en-IN",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  )}\n`;
  report += `Net Amount: ₹${summary.amounts.net.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}\n\n`;

  report += `Date Range: ${summary.dateRange.earliest} to ${summary.dateRange.latest}\n\n`;

  report += "───────────────────────────────────────────────────────────────\n";
  report += "                    DATA QUALITY FLAGS\n";
  report +=
    "───────────────────────────────────────────────────────────────\n\n";

  report += `Ambiguous Transactions: ${summary.flags.ambiguous}\n`;
  report += `Needs Review: ${summary.flags.needsReview}\n`;
  report += `Manually Added: ${summary.flags.manuallyAdded}\n\n`;

  report += "───────────────────────────────────────────────────────────────\n";
  report += "                  STATEMENT BREAKDOWN\n";
  report +=
    "───────────────────────────────────────────────────────────────\n\n";

  summary.statementPeriods.forEach((period, index) => {
    report += `${index + 1}. ${period.period}\n`;
    report += `   Statement ID: ${period.statementId}\n`;
    report += `   Transactions: ${period.transactionCount}\n\n`;
  });

  report += "═══════════════════════════════════════════════════════════════\n";
  report += "                         END OF REPORT\n";
  report += "═══════════════════════════════════════════════════════════════\n";

  return report;
}

async function main() {
  console.log("\n🔐 ICICI XX5000 Data Backup");
  console.log("════════════════════════════════════════════════════════════");

  try {
    // Backup statements
    const statements = await backupStatements();

    // Backup transactions
    const transactions = await backupTransactions();

    // Generate summary
    const summary = generateSummary(statements, transactions);

    // Save all files
    const backupFile = saveBackup(statements, transactions, summary);

    console.log(
      "\n════════════════════════════════════════════════════════════"
    );
    console.log("✅ Backup Complete!");
    console.log("════════════════════════════════════════════════════════════");
    console.log(`\n📦 Main backup file: ${backupFile}`);
    console.log(
      `📊 ${summary.totals.statements} statements | ${summary.totals.transactions} transactions`
    );
    console.log(
      `💰 Total: ₹${summary.amounts.totalDebit.toLocaleString("en-IN")} debits | ₹${summary.amounts.totalCredit.toLocaleString("en-IN")} credits`
    );
    console.log(`\n✅ All data backed up successfully!\n`);
  } catch (error) {
    console.error("\n❌ Backup failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
