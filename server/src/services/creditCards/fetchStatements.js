import { JSDOM } from "jsdom";
import {
  getEmailMessages,
  prepareStatementObjectAndSaveInDB,
  validateStatementPDFAndUploadToDrive,
} from "../../utils/index.js";

/**
 * Extract statement details from AXIS Bank email HTML
 * Parses period, amount due, minimum amount, and payment due date
 */
function extractStatementDetailsFromHTMLBodyTextContentAXIS(text) {
  const cleanText = text
    .split("+")
    .map((line) => line.replace(/\s+/g, " ").trim())[0]
    .split(" Dr ")
    .map((line) => line.replace(/\s+/g, " ").trim());

  const periodRe = /statement for\s+([A-Z]+\s+\d{4})/i;
  const periodMatch = cleanText[0].match(periodRe);
  const totalAmountDue = cleanText[0].split(" ").pop();
  const minimumAmountDue = cleanText[1];
  const dueDateMatch = cleanText[cleanText.length - 1].split(" ")[0];

  return {
    statementPeriod: periodMatch
      ? periodMatch[1]
          .replace(/\s+/g, " ")
          .trim()
          .replace(/, /g, "_")
          .replace(/ /g, "_")
      : null,
    totalAmountDue: totalAmountDue || null,
    minimumAmountDue: minimumAmountDue || null,
    paymentDueDate: dueDateMatch || null,
  };
}

/**
 * Extract statement data from email body
 * Decodes base64 HTML and parses using JSDOM
 */
function extractStatementDataFromBody(bodyData) {
  const rawHtml = Buffer.from(bodyData, "base64").toString("utf8");
  const dom = new JSDOM(rawHtml);
  const document = dom.window.document;

  return extractStatementDetailsFromHTMLBodyTextContentAXIS(
    document.body.textContent
  );
}

/**
 * Extract card number from email subject line
 * Examples:
 *   - "Statement ending XX76 - September 2025" → "XX76"
 *   - "Statement ending 2376 - September 2025" → "XX2376"
 *   - "ICICI period August 16 2025 to September 15 2025 XX9003" → "XX9003"
 */
function extractCardNumberFromSubject(subject) {
  // Try to find "ending XX##" or "ending XX####" or "ending ####" pattern (AXIS format)
  // Matches 2 to 4 digits after "ending" (with or without XX prefix)
  const endingMatch = subject.match(/ending\s+(XX)?(\d{2,4})/i);
  if (endingMatch) {
    return endingMatch[1] ? `XX${endingMatch[2]}` : `XX${endingMatch[2]}`;
  }

  // Try to find XX## or XX#### pattern anywhere (2 to 4 digits)
  const xxMatch = subject.match(/XX(\d{2,4})/i);
  if (xxMatch) {
    return `XX${xxMatch[1]}`;
  }

  return null;
}

/**
 * Extract card number from PDF filename
 * Examples:
 *   - "statement_XX9003.pdf" → "XX9003"
 *   - "Card_ending_2376.pdf" → "XX2376"
 *   - "ICICI_VISA_XX5000_Statement.pdf" → "XX5000"
 *   - "3718734652902115_25092025.pdf" → "XX2115" (SBI: last 4 of 16-digit card)
 */
function extractCardNumberFromFilename(filename) {
  // Try to find XX## or XX#### pattern (2 to 4 digits)
  const xxMatch = filename.match(/XX(\d{2,4})/i);
  if (xxMatch) {
    return `XX${xxMatch[1]}`;
  }

  // Try to find "ending ##" or "ending ####" pattern (2 to 4 digits)
  const endingMatch = filename.match(/ending\s*(\d{2,4})/i);
  if (endingMatch) {
    return `XX${endingMatch[1]}`;
  }

  // Try to find a long number (12-16 digits) - likely full card number (SBI format)
  // Extract last 4 digits
  const longNumberMatch = filename.match(/(\d{12,16})/);
  if (longNumberMatch) {
    const fullNumber = longNumberMatch[1];
    const last4 = fullNumber.slice(-4);
    return `XX${last4}`;
  }

  // Try to find any 2 to 4 consecutive digits (fallback)
  const digitsMatch = filename.match(/(\d{2,4})/);
  if (digitsMatch) {
    return `XX${digitsMatch[1]}`;
  }

  return null;
}

/**
 * Extract card number from subject or filename
 * Tries subject first (for AXIS), then filename (for ICICI)
 */
function extractCardNumber(subject, filename) {
  // Try subject line first (AXIS bank includes card number in subject)
  let cardNumber = extractCardNumberFromSubject(subject);
  if (cardNumber) {
    return cardNumber;
  }

  // Try filename (ICICI includes card number in filename)
  cardNumber = extractCardNumberFromFilename(filename);
  if (cardNumber) {
    return cardNumber;
  }

  console.warn(
    `⚠️  Could not extract card number from subject or filename:`,
    `\n     Subject: ${subject}`,
    `\n     Filename: ${filename}`
  );
  return null;
}

/**
 * Match card number against configured cards
 * Strategy:
 *   1. Try exact match first (e.g., "XX9003" == "XX9003")
 *   2. If no exact match and extracted has 2 digits, try matching last 2 digits
 *      (e.g., "XX76" matches "XX2376" by comparing last 2 digits: "76" == "76")
 *
 * @returns {string|null} Matched full card number from config, or null
 */
function matchCardNumber(extractedCardNumber, configuredCards) {
  // Step 1: Try exact match first (highest priority)
  if (configuredCards.includes(extractedCardNumber)) {
    console.log(`   ✅ Exact match found: ${extractedCardNumber}`);
    return extractedCardNumber;
  }

  // Step 2: If no exact match, try matching by last 2 digits (for AXIS statements)
  const extractedDigits = extractedCardNumber.replace(/XX/i, "");

  // Only try 2-digit matching if extracted card has 2 digits
  if (extractedDigits.length === 2) {
    for (const configCard of configuredCards) {
      const configDigits = configCard.replace(/XX/i, "");

      // Check if config card ends with the 2 extracted digits
      if (configDigits.endsWith(extractedDigits)) {
        console.log(
          `   🔍 Matched ${extractedCardNumber} to ${configCard} (last 2 digits: ${extractedDigits})`
        );
        return configCard;
      }
    }
  }

  // No match found
  return null;
}

/**
 * Extract statement period from email subject
 * Supports AXIS, ICICI, and SBI formats
 * Month names are normalized to title case (e.g., "SEPTEMBER" → "September")
 *
 * AXIS: "Statement ending XX76 - September 2025" (or "SEPTEMBER 2025")
 * ICICI: "period August 16 2025 to September 15 2025" (or "AUGUST" / "SEPTEMBER")
 * SBI: "SimplySAVE - SBI Card Monthly Statement -Sep 2025" (or "SEP 2025")
 *
 * @returns {Object} { startISO, endISO } in YYYY-MM-DD format
 */
function extractStatementPeriod(subject, resourceConfig) {
  // Try AXIS format: "statement ending XX76 - September 2025" or "SEPTEMBER 2025"
  const axisRe = /statement ending \w+ - ([A-Za-z]+ \d{4})/i;
  const axisMatch = subject.match(axisRe);
  if (axisMatch) {
    const [month, year] = axisMatch[1].split(" ");
    // Normalize month to title case (e.g., "SEPTEMBER" → "September")
    const normalizedMonth =
      month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();

    const startISO = new Date(
      `${normalizedMonth} ${resourceConfig.statementGenerationDay}, ${year}`
    )
      .toISOString()
      .split("T")[0];
    const endISO = new Date(
      year,
      new Date(`${normalizedMonth} 1, ${year}`).getMonth() + 1,
      0
    )
      .toISOString()
      .split("T")[0];
    return { startISO, endISO };
  }

  // Try ICICI format: "period August 16 2025 to September 15 2025"
  const iciciRe =
    /period\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\s+to\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i;
  const iciciMatch = subject.match(iciciRe);
  if (iciciMatch) {
    const [_, startMonth, startDay, startYear, endMonth, endDay, endYear] =
      iciciMatch;
    // Normalize months to title case (e.g., "AUGUST" → "August")
    const normalizedStartMonth =
      startMonth.charAt(0).toUpperCase() + startMonth.slice(1).toLowerCase();
    const normalizedEndMonth =
      endMonth.charAt(0).toUpperCase() + endMonth.slice(1).toLowerCase();

    const startDate = `${normalizedStartMonth} ${startDay} ${startYear}`;
    const endDate = `${normalizedEndMonth} ${endDay} ${endYear}`;
    const startISO = new Date(startDate).toISOString().split("T")[0];
    const endISO = new Date(endDate).toISOString().split("T")[0];
    return { startISO, endISO };
  }

  // Try SBI format: "SimplySAVE - SBI Card Monthly Statement -Sep 2025" or "Statement -Sep 2025"
  const sbiRe = /Statement\s+-?([A-Za-z]{3})\s+(\d{4})/i;
  const sbiMatch = subject.match(sbiRe);
  if (sbiMatch) {
    const month = sbiMatch[1]; // "Sep" or "SEP"
    const year = sbiMatch[2]; // "2025"

    // Normalize short month to title case (e.g., "SEP" → "Sep")
    const normalizedMonth =
      month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();

    // Convert short month to full month name
    const fullMonth = new Date(`${normalizedMonth} 1, ${year}`).toLocaleString(
      "en-US",
      {
        month: "long",
      }
    );

    const startISO = new Date(
      `${fullMonth} ${resourceConfig.statementGenerationDay}, ${year}`
    )
      .toISOString()
      .split("T")[0];
    const endISO = new Date(
      year,
      new Date(`${fullMonth} 1, ${year}`).getMonth() + 1,
      0
    )
      .toISOString()
      .split("T")[0];
    return { startISO, endISO };
  }

  console.warn("⚠️  Could not extract period from subject:", subject);
  return { startISO: null, endISO: null };
}

/**
 * Extract comprehensive metadata from PDF
 * Extracts due date, due amount, total spend, and statement date
 */
async function extractMetadataFromPDF(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    const pdfText = pdfData.text;
    const lines = pdfText.split("\n").map((l) => l.trim());

    const metadata = {
      dueDate: null,
      dueAmount: null,
      totalSpend: null,
      statementDate: null,
    };

    // AXIS-specific extraction
    const axisDueDateMatch = pdfText.match(
      /(\d{2}\/\d{2}\/\d{4})\s*-\s*\d{2}\/\d{2}\/\d{4}(\d{2}\/\d{2}\/\d{4})(\d{2}\/\d{2}\/\d{4})/
    );
    if (axisDueDateMatch) {
      metadata.dueDate = axisDueDateMatch[2];
      metadata.statementDate = axisDueDateMatch[3];
    }

    const axisTableMatch = pdfText.match(
      /Previous Balance.*?Purchase.*?Total Payment Due.*?\n\s*([\d,]+\.?\d{0,2})\s+([\d,]+\.?\d{0,2})([\d,]+\.?\d{0,2})([\d,]+\.?\d{0,2})([\d,]+\.?\d{0,2})([\d,]+\.?\d{0,2})([\d,]+\.?\d{0,2})/i
    );
    if (axisTableMatch) {
      const purchaseAmount = parseFloat(axisTableMatch[4].replace(/,/g, ""));
      if (purchaseAmount > 0 && !metadata.totalSpend) {
        metadata.totalSpend = purchaseAmount;
      }
      const totalAmount = parseFloat(axisTableMatch[7].replace(/,/g, ""));
      if (totalAmount > 0 && !metadata.dueAmount) {
        metadata.dueAmount = totalAmount;
      }
    }

    // ICICI: Search for standalone date lines
    const iciciDates = [];
    for (let i = 0; i < Math.min(100, lines.length); i++) {
      if (
        /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}$/.test(
          lines[i]
        )
      ) {
        iciciDates.push(lines[i]);
      }
    }
    if (iciciDates.length >= 1 && !metadata.statementDate) {
      metadata.statementDate = iciciDates[0];
    }
    if (iciciDates.length >= 2 && !metadata.dueDate) {
      metadata.dueDate = iciciDates[1];
    }

    // ICICI: Extract total spend and due amount
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Due amount in backtick format
      if (i < 50 && /^`[\d,]+\.?\d{0,2}$/.test(line) && !metadata.dueAmount) {
        const amountMatch = line.match(/`([\d,]+\.?\d{0,2})/);
        if (amountMatch) {
          const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
          if (amount > 200 && amount < 10000000) {
            metadata.dueAmount = amount;
          }
        }
      }

      // Total spend from table
      if (
        /Previous Balance.*?Purchases.*?Charges.*?Cash Advances/i.test(line)
      ) {
        const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
        const amounts = nextLine.match(
          /`([\d,]+\.?\d{0,2})`([\d,]+\.?\d{0,2})`([\d,]+\.?\d{0,2})/
        );
        if (amounts && !metadata.totalSpend) {
          const purchaseAmount = parseFloat(amounts[2].replace(/,/g, ""));
          if (purchaseAmount > 0) {
            metadata.totalSpend = purchaseAmount;
          }
        }
      }
    }

    // Fallback: Sum debit transactions
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
  } catch (error) {
    console.log(`   ⚠️  PDF extraction error: ${error.message}`);
    return {
      dueDate: null,
      dueAmount: null,
      totalSpend: null,
      statementDate: null,
    };
  }
}

/**
 * Extract metadata from email subject and body
 */
function extractMetadataFromEmail(subject, bodyHTML) {
  const metadata = {
    dueDate: null,
    dueAmount: null,
    totalSpend: null,
    statementDate: null,
  };

  // Extract from subject
  const subjectText = subject.toLowerCase();

  // Extract from HTML body if available
  if (bodyHTML) {
    try {
      const dom = new JSDOM(bodyHTML);
      const bodyText = dom.window.document.body.textContent || "";

      // Look for common patterns in email body
      const dueDateMatch = bodyText.match(
        /(?:payment\s+due\s+date|pay\s+by)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i
      );
      if (dueDateMatch) {
        metadata.dueDate = dueDateMatch[1];
      }

      const dueAmountMatch = bodyText.match(
        /(?:total\s+amount\s+due|amount\s+due)[:\s]*(?:rs\.?|₹)?\s*([\d,]+\.?\d{0,2})/i
      );
      if (dueAmountMatch) {
        const amount = parseFloat(dueAmountMatch[1].replace(/,/g, ""));
        if (amount > 0 && amount < 10000000) {
          metadata.dueAmount = amount;
        }
      }

      const totalSpendMatch = bodyText.match(
        /(?:purchases?|total\s+spend)[:\s]*(?:rs\.?|₹)?\s*([\d,]+\.?\d{0,2})/i
      );
      if (totalSpendMatch) {
        const amount = parseFloat(totalSpendMatch[1].replace(/,/g, ""));
        if (amount > 0 && amount < 10000000) {
          metadata.totalSpend = amount;
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Email body parsing error: ${error.message}`);
    }
  }

  return metadata;
}

/**
 * Merge metadata from email and PDF (PDF takes priority)
 */
function mergeMetadata(emailMeta, pdfMeta) {
  return {
    dueDate: pdfMeta.dueDate || emailMeta.dueDate,
    dueAmount: pdfMeta.dueAmount || emailMeta.dueAmount,
    totalSpend: pdfMeta.totalSpend || emailMeta.totalSpend,
    statementDate: pdfMeta.statementDate || emailMeta.statementDate,
  };
}

/**
 * Fetch and process credit card statements from Gmail
 *
 * Flow:
 * 1. Search for statement emails in Gmail
 * 2. Extract PDF attachments
 * 3. Validate card numbers against configuration
 * 4. Decrypt PDFs and upload to Google Drive
 * 5. Extract metadata from both email and PDF
 * 6. Save statement metadata to Firebase
 *
 * Note: Transaction extraction happens separately via /sync-transactions
 */
const fetchStatements = async (gmail, drive, resourceConfig) => {
  console.log(
    `\n📧 Fetching statement emails for ${resourceConfig.identifierPrefix}...`
  );
  console.log(`   Query: ${resourceConfig.emailQuery}`);

  const messages = await getEmailMessages(gmail, resourceConfig.emailQuery, 12);

  if (!messages || messages.length === 0) {
    console.log(`   ⚠️  No statement emails found`);
    return {
      processed: 0,
      skipped: 0,
      errors: 0,
      newStatements: [],
    };
  }

  console.log(`   ✅ Found ${messages.length} statement email(s)\n`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let updated = 0;
  const newStatements = [];

  for (const message of messages) {
    try {
      // Fetch email details
      const email = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
      });

      const subject =
        email.data.payload.headers.find((header) => header.name === "Subject")
          ?.value || "";

      // Skip non-statement emails
      if (!subject.toLowerCase().includes("statement")) {
        continue;
      }

      console.log(`\n📄 Processing email: "${subject.substring(0, 60)}..."`);

      // Find PDF attachment
      const attachmentPart =
        email.data.payload.parts?.find(
          (part) =>
            part.filename && part.filename.toLowerCase().endsWith(".pdf")
        ) || null;

      if (!attachmentPart) {
        console.log(`   ⚠️  No PDF attachment found, skipping`);
        skipped++;
        continue;
      }

      console.log(`   📎 Attachment: ${attachmentPart.filename}`);

      // Determine card number
      let cardNumber;

      // If only one card configured for this resource, use it directly (e.g., SBI)
      if (resourceConfig.cards.length === 1) {
        cardNumber = resourceConfig.cards[0];
        console.log(
          `   💳 Card: ${cardNumber} (only card configured for ${resourceConfig.identifierPrefix})`
        );
      } else {
        // Multiple cards configured, need to extract and match (e.g., ICICI, AXIS)
        const extractedCardNumber = extractCardNumber(
          subject,
          attachmentPart.filename
        );

        if (!extractedCardNumber) {
          console.log(`   ⚠️  Could not extract card number, skipping`);
          skipped++;
          continue;
        }

        // Match against configured cards (handles partial matches for AXIS)
        cardNumber = matchCardNumber(extractedCardNumber, resourceConfig.cards);

        if (!cardNumber) {
          console.log(
            `   ⚠️  Card ${extractedCardNumber} not in configured cards [${resourceConfig.cards.join(", ")}], skipping`
          );
          skipped++;
          continue;
        }

        console.log(`   💳 Card: ${cardNumber}`);
      }

      // Extract statement data from email body
      const bodyData =
        email.data.payload.parts[0]?.body?.data ||
        email.data.payload.body?.data;

      const statementData = bodyData
        ? extractStatementDataFromBody(bodyData)
        : { statementPeriod: null };

      // Extract period from subject
      const periodInfo = extractStatementPeriod(subject, resourceConfig);

      if (!periodInfo.startISO || !periodInfo.endISO) {
        console.log(`   ⚠️  Could not extract statement period, skipping`);
        skipped++;
        continue;
      }

      console.log(
        `   📅 Period: ${periodInfo.startISO} to ${periodInfo.endISO}`
      );

      // Prepare file naming (consistent format: card_BANK_XXNNNN_YYYY-MM-DD.pdf)
      const resourceIdentifier = `${resourceConfig.identifierPrefix}${cardNumber}`;
      const fileName = `${resourceIdentifier}_${periodInfo.startISO}.pdf`;

      console.log(`   📁 File: ${fileName}`);

      // Upload PDF to Drive
      const { driveRes, localPdfPath } =
        await validateStatementPDFAndUploadToDrive(
          gmail,
          drive,
          attachmentPart,
          fileName,
          message,
          resourceConfig.pdfPassword
        );

      if (!driveRes) {
        console.log(`   ❌ Failed to upload to Drive`);
        errors++;
        continue;
      }

      // Extract metadata from email body
      const bodyHTML = bodyData
        ? Buffer.from(bodyData, "base64").toString("utf8")
        : null;
      const emailMetadata = extractMetadataFromEmail(subject, bodyHTML);

      // Extract metadata from PDF (if local path is available)
      console.log(`   📊 Extracting metadata from PDF and email...`);
      let pdfMetadata = {
        dueDate: null,
        dueAmount: null,
        totalSpend: null,
        statementDate: null,
      };

      if (localPdfPath && fs.existsSync(localPdfPath)) {
        pdfMetadata = await extractMetadataFromPDF(localPdfPath);
      }

      // Merge metadata (PDF takes priority)
      const combinedMetadata = mergeMetadata(emailMetadata, pdfMetadata);

      // Log extracted metadata
      if (combinedMetadata.dueDate) {
        console.log(`   📅 Due Date: ${combinedMetadata.dueDate}`);
      }
      if (combinedMetadata.dueAmount) {
        console.log(
          `   💰 Due Amount: ₹${combinedMetadata.dueAmount.toLocaleString("en-IN")}`
        );
      }
      if (combinedMetadata.totalSpend) {
        console.log(
          `   💳 Total Spend: ₹${combinedMetadata.totalSpend.toLocaleString("en-IN")}`
        );
      }
      if (combinedMetadata.statementDate) {
        console.log(`   📆 Statement Date: ${combinedMetadata.statementDate}`);
      }

      // Merge with statementData
      const enhancedStatementData = {
        ...statementData,
        ...combinedMetadata,
      };

      // Clean up temporary PDF file
      if (localPdfPath && fs.existsSync(localPdfPath)) {
        try {
          fs.unlinkSync(localPdfPath);
        } catch (cleanupError) {
          console.log(
            `   ⚠️  Could not clean up temp file: ${cleanupError.message}`
          );
        }
      }

      // Save statement metadata to Firebase
      const saveResult = await prepareStatementObjectAndSaveInDB(
        message.id,
        subject,
        resourceIdentifier,
        driveRes,
        {
          cardNumber,
          ...periodInfo,
        },
        enhancedStatementData
      );

      if (saveResult && saveResult.isNew) {
        newStatements.push({
          ...saveResult.statement,
          subject,
          cardNumber,
          displayName: `${resourceConfig.label} XX${cardNumber.slice(-4)}`,
        });
      } else if (saveResult && saveResult.updated) {
        updated++;
      }

      console.log(`   ✅ Statement processing complete\n`);
      processed++;
    } catch (error) {
      console.error(`   ❌ Error processing statement:`, error.message);
      errors++;
    }
  }

  // Summary
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 ${resourceConfig.identifierPrefix} Summary:`);
  console.log(`   Total emails: ${messages.length}`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   New statements: ${newStatements.length}`);
  console.log(`   Updated statements: ${updated}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  return {
    processed,
    skipped,
    errors,
    updated,
    newStatements,
  };
};
export { fetchStatements };
