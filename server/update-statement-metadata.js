import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import fs from "fs";
import { google } from "googleapis";
import path from "path";
import pdfParse from "pdf-parse";
import { fileURLToPath } from "url";
import { db } from "./firebase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");

async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

async function downloadPDFFromDrive(auth, driveFileId, outputPath) {
  const drive = google.drive({ version: "v3", auth });
  const dest = fs.createWriteStream(outputPath);
  const response = await drive.files.get(
    { fileId: driveFileId, alt: "media" },
    { responseType: "stream" }
  );
  return new Promise((resolve, reject) => {
    response.data
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .pipe(dest);
  });
}

function extractStatementMetadata(pdfText) {
  const metadata = {
    dueDate: null,
    dueAmount: null,
    totalSpend: null,
    statementDate: null,
  };

  const lines = pdfText.split("\n").map((l) => l.trim());

  // AXIS-specific extraction (different pattern)
  // Pattern: "01/08/2025 - 13/09/202503/10/202513/09/2025" where middle date is due date
  const axisDueDateMatch = pdfText.match(
    /(\d{2}\/\d{2}\/\d{4})\s*-\s*\d{2}\/\d{2}\/\d{4}(\d{2}\/\d{2}\/\d{4})(\d{2}\/\d{2}\/\d{4})/
  );
  if (axisDueDateMatch) {
    metadata.dueDate = axisDueDateMatch[2]; // Payment Due Date
    metadata.statementDate = axisDueDateMatch[3]; // Statement Generation Date
  }

  // AXIS: Table row "0.00   0.000.009,319.000.000.009,319.00   Dr"
  // Pattern: Previous Balance, Payments, Credits, Purchase, Cash Advance, Other, Total
  const axisTableMatch = pdfText.match(
    /Previous Balance.*?Purchase.*?Total Payment Due.*?\n\s*([\d,]+\.?\d{0,2})\s+([\d,]+\.?\d{0,2})([\d,]+\.?\d{0,2})([\d,]+\.?\d{0,2})([\d,]+\.?\d{0,2})([\d,]+\.?\d{0,2})([\d,]+\.?\d{0,2})/i
  );
  if (axisTableMatch) {
    // Purchase is the 4th value (index 4 in match)
    const purchaseAmount = parseFloat(axisTableMatch[4].replace(/,/g, ""));
    if (purchaseAmount > 0 && !metadata.totalSpend) {
      metadata.totalSpend = purchaseAmount;
    }
    // Total is the 7th value (index 7 in match)
    const totalAmount = parseFloat(axisTableMatch[7].replace(/,/g, ""));
    if (totalAmount > 0 && !metadata.dueAmount) {
      metadata.dueAmount = totalAmount;
    }
  }

  // ICICI: Search for standalone date lines (format: "September 12, 2025")
  // These appear separately in the PDF, not directly after labels
  const iciciDates = [];
  for (let i = 0; i < Math.min(100, lines.length); i++) {
    const line = lines[i];
    // Match full date format: "September 12, 2025" or "September 30, 2025"
    if (
      /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}$/.test(
        line
      )
    ) {
      iciciDates.push(line);
    }
  }

  // First date is typically statement date, second is due date
  if (iciciDates.length >= 1 && !metadata.statementDate) {
    metadata.statementDate = iciciDates[0];
  }
  if (iciciDates.length >= 2 && !metadata.dueDate) {
    metadata.dueDate = iciciDates[1];
  }

  // Iterate through lines with context for ICICI and SBI
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ICICI: Look for amount in backtick format (appears later in PDF, not after label)
    // Format: "`2,868.39" - look in first 50 lines
    if (i < 50 && /^`[\d,]+\.?\d{0,2}$/.test(line) && !metadata.dueAmount) {
      const amountMatch = line.match(/`([\d,]+\.?\d{0,2})/);
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
        // Skip if it's too small (likely minimum payment like 150.00)
        // Due amount should be larger
        if (amount > 200 && amount < 10000000) {
          metadata.dueAmount = amount;
        }
      }
    }

    // ICICI: "Previous BalancePurchases / ChargesCash AdvancesPayments / Credits"
    // Next line: "`1,34,763.25`3,837.37`0.00"
    if (/Previous Balance.*?Purchases.*?Charges.*?Cash Advances/i.test(line)) {
      const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
      // Extract amounts with backticks: `amount`amount`amount
      const amounts = nextLine.match(
        /`([\d,]+\.?\d{0,2})`([\d,]+\.?\d{0,2})`([\d,]+\.?\d{0,2})/
      );
      if (amounts && !metadata.totalSpend) {
        // Second value (index 2) is Purchases / Charges
        const purchaseAmount = parseFloat(amounts[2].replace(/,/g, ""));
        if (purchaseAmount > 0) {
          metadata.totalSpend = purchaseAmount;
        }
      }
    }

    // SBI: "Purchases & Other" followed by "Debits" then amount with ( ` ) markers
    if (/Purchases\s*&\s*Other/i.test(line) && !metadata.totalSpend) {
      for (let j = i + 1; j <= Math.min(i + 15, lines.length - 1); j++) {
        if (/Debits/i.test(lines[j])) {
          // Found "Debits", look for amount in next lines
          // SBI uses format with "( ` )" markers
          for (let k = j + 1; k <= Math.min(j + 10, lines.length - 1); k++) {
            const amountLine = lines[k];
            // Match lines with ( ` ) or standalone amounts
            const amountMatch = amountLine.match(
              /^\(?\s*`?\s*\)?\s*([\d,]+\.?\d{0,2})\s*$/
            );
            if (amountMatch) {
              const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
              if (amount > 100 && amount < 10000000) {
                metadata.totalSpend = amount;
                break;
              }
            }
          }
          break;
        }
      }
    }

    // SBI: Extract due date - generic pattern (only if not already found by ICICI logic)
    if (
      /Payment [Dd]ue [Dd]ate/i.test(line) &&
      !/^PAYMENT DUE DATE$/i.test(line) &&
      !metadata.dueDate
    ) {
      // Check next several lines for SBI format
      for (let j = i; j <= Math.min(i + 10, lines.length - 1); j++) {
        const dateMatch = lines[j].match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
        if (dateMatch) {
          metadata.dueDate = dateMatch[1];
          break;
        }
      }
    }

    // SBI: Extract statement date (only if not already found by ICICI logic)
    if (
      /Statement [Dd]ate/i.test(line) &&
      !/^STATEMENT DATE$/i.test(line) &&
      !metadata.statementDate
    ) {
      for (let j = i; j <= Math.min(i + 10, lines.length - 1); j++) {
        const dateMatch = lines[j].match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
        if (dateMatch && dateMatch[1] !== metadata.dueDate) {
          metadata.statementDate = dateMatch[1];
          break;
        }
      }
    }

    // SBI: Extract due amount with * prefix (only if not already found by ICICI logic)
    if (
      /\*Total Amount Due/i.test(line) &&
      !/^Total\s+Amount\s+due$/i.test(line) &&
      !metadata.dueAmount
    ) {
      // SBI uses format with ( ` ) markers
      for (let j = i; j <= Math.min(i + 10, lines.length - 1); j++) {
        const checkLine = lines[j];
        // Match amounts with various formats
        const amountMatch = checkLine.match(
          /^\(?\s*`?\s*\)?\s*([\d,]+\.?\d{0,2})\s*$/
        );
        if (amountMatch) {
          const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
          if (amount > 0 && amount < 10000000) {
            metadata.dueAmount = amount;
            break;
          }
        }
      }
    }
  }

  // Fallback: Sum debit transactions for total spend
  if (!metadata.totalSpend) {
    const debitMatches = pdfText.matchAll(
      /(\d{1,3}(?:,\d{3})*\.?\d{0,2})\s*Dr/gi
    );
    let totalDebits = 0;
    let count = 0;

    for (const match of debitMatches) {
      const amount = parseFloat(match[1].replace(/,/g, ""));
      if (amount > 0 && amount < 1000000) {
        totalDebits += amount;
        count++;
      }
    }

    if (count > 0 && totalDebits > 100) {
      metadata.totalSpend = totalDebits;
    }
  }

  return metadata;
}

async function processStatement(auth, statement) {
  const pdfPath = `/tmp/stmt-${statement.id}.pdf`;

  try {
    console.log(`\n📄 Processing: ${statement.id}`);
    console.log(`   Card: ${statement.resourceIdentifier || "N/A"}`);

    await downloadPDFFromDrive(auth, statement.driveFileId, pdfPath);

    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);

    const metadata = extractStatementMetadata(pdfData.text);

    console.log(`   Due Date: ${metadata.dueDate || "Not found"}`);
    console.log(
      `   Due Amount: ${
        metadata.dueAmount
          ? `₹${metadata.dueAmount.toLocaleString("en-IN")}`
          : "Not found"
      }`
    );
    console.log(
      `   Total Spend: ${
        metadata.totalSpend
          ? `₹${metadata.totalSpend.toLocaleString("en-IN")}`
          : "Not found"
      }`
    );

    // Update statement in DB - only update fields that were found
    const stmtRef = doc(db, "statements", statement.id);
    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    if (metadata.dueDate) updateData.dueDate = metadata.dueDate;
    if (metadata.dueAmount) updateData.dueAmount = metadata.dueAmount;
    if (metadata.totalSpend) updateData.totalSpend = metadata.totalSpend;
    if (metadata.statementDate)
      updateData.statementDate = metadata.statementDate;

    await updateDoc(stmtRef, updateData);
    console.log(`   ✅ Updated in DB`);

    // Cleanup
    fs.unlinkSync(pdfPath);

    return { success: true, metadata };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("\n🔧 Extracting Statement Metadata from PDFs");
  console.log("════════════════════════════════════════════════════════════");

  const auth = await authorize();
  console.log("✅ Google Drive authorized\n");

  // Get all statements
  const statementsCollection = collection(db, "statements");
  const statementsSnapshot = await getDocs(statementsCollection);

  const statements = [];
  statementsSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.driveFileId) {
      statements.push({ id: doc.id, ...data });
    }
  });

  console.log(`📑 Found ${statements.length} statements with PDFs\n`);

  const results = {
    total: statements.length,
    updated: 0,
    failed: 0,
  };

  for (const statement of statements) {
    const result = await processStatement(auth, statement);
    if (result.success) {
      results.updated++;
    } else {
      results.failed++;
    }
  }

  console.log(
    "\n════════════════════════════════════════════════════════════\n"
  );
  console.log("📊 Summary:");
  console.log(`   Total: ${results.total}`);
  console.log(`   ✅ Updated: ${results.updated}`);
  console.log(`   ❌ Failed: ${results.failed}\n`);
}

main()
  .then(() => {
    console.log("✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
