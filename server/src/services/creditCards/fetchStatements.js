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

  // Try to find any 2 to 4 consecutive digits
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
 * Supports both AXIS and ICICI format
 *
 * AXIS: "Statement ending XX76 - September 2025"
 * ICICI: "period August 16 2025 to September 15 2025"
 *
 * @returns {Object} { startISO, endISO } in YYYY-MM-DD format
 */
function extractStatementPeriod(subject, resourceConfig) {
  // Try AXIS format
  const axisRe = /statement ending \w+ - ([A-Za-z]+ \d{4})/i;
  const axisMatch = subject.match(axisRe);
  if (axisMatch) {
    const [month, year] = axisMatch[1].split(" ");
    const startISO = new Date(
      `${month} ${resourceConfig.statementGenerationDay}, ${year}`
    )
      .toISOString()
      .split("T")[0];
    const endISO = new Date(
      year,
      new Date(`${month} 1, ${year}`).getMonth() + 1,
      0
    )
      .toISOString()
      .split("T")[0];
    return { startISO, endISO };
  }

  // Try ICICI format
  const iciciRe =
    /period\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})\s+to\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i;
  const iciciMatch = subject.match(iciciRe);
  if (iciciMatch) {
    const startDate = iciciMatch[1];
    const endDate = iciciMatch[2];
    const startISO = new Date(startDate).toISOString().split("T")[0];
    const endISO = new Date(endDate).toISOString().split("T")[0];
    return { startISO, endISO };
  }

  console.warn("⚠️  Could not extract period from subject:", subject);
  return { startISO: null, endISO: null };
}

/**
 * Fetch and process credit card statements from Gmail
 *
 * Flow:
 * 1. Search for statement emails in Gmail
 * 2. Extract PDF attachments
 * 3. Validate card numbers against configuration
 * 4. Decrypt PDFs and upload to Google Drive
 * 5. Save statement metadata to Firebase
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
    return;
  }

  console.log(`   ✅ Found ${messages.length} statement email(s)\n`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

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

      // Extract card number from subject line or filename
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
      const cardNumber = matchCardNumber(
        extractedCardNumber,
        resourceConfig.cards
      );

      if (!cardNumber) {
        console.log(
          `   ⚠️  Card ${extractedCardNumber} not in configured cards [${resourceConfig.cards.join(", ")}], skipping`
        );
        skipped++;
        continue;
      }

      console.log(`   💳 Card: ${cardNumber}`);

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

      // Prepare file naming
      const resourceIdentifier = `${resourceConfig.identifierPrefix}${cardNumber}`;
      const fileName = statementData.statementPeriod
        ? `${resourceIdentifier}_${statementData.statementPeriod}.pdf`
        : `${resourceIdentifier}_${periodInfo.startISO}.pdf`;

      console.log(`   📁 File: ${fileName}`);

      // Upload PDF to Drive
      const { driveRes } = await validateStatementPDFAndUploadToDrive(
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

      // Save statement metadata to Firebase
      await prepareStatementObjectAndSaveInDB(
        message.id,
        subject,
        resourceIdentifier,
        driveRes,
        {
          cardNumber,
          ...periodInfo,
        },
        statementData
      );

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
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
};
export { fetchStatements };
