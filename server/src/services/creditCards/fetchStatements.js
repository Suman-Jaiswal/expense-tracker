import { JSDOM } from "jsdom";
import {
  getEmailMessages,
  prepareStatementObjectAndSaveInDB,
  validateStatementPDFAndUploadToDrive,
} from "../../utils/index.js";

function extractStatementDetailsFromHTMLBodyTextContentAXIS(text) {
  // Normalize spaces
  const cleanText = text
    .split("+")
    .map((line) => line.replace(/\s+/g, " ").trim())[0]
    .split(" Dr ")
    .map((line) => line.replace(/\s+/g, " ").trim());

  console.log("Cleaned Text:", cleanText);

  // Regex patterns
  const periodRe = /statement for\s+([A-Z]+\s+\d{4})/i;

  // Extract matches
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

function extractStatementDataFromBody(bodyData) {
  const rawHtml = Buffer.from(bodyData, "base64").toString("utf8");

  const dom = new JSDOM(rawHtml);
  const document = dom.window.document;

  // Example: Extract key fields
  return extractStatementDetailsFromHTMLBodyTextContentAXIS(
    document.body.textContent
  );
}

function extractStatementPeriod(subject, resourceConfig) {
  // Example subject: "Flipkart Axis Bank Credit Card Statement ending XX76 - September 2025"
  const periodRe = /statement ending \w+ - ([A-Za-z]+ \d{4})/i;
  const match = subject.match(periodRe);
  if (match) {
    const [month, year] = match[1].split(" ");
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
  return { startISO: null, endISO: null };
}

const fetchStatements = async (gmail, drive, resourceConfig) => {
  const messages = await getEmailMessages(gmail, resourceConfig.emailQuery, 12);

  if (messages && messages.length > 0) {
    console.log(`Total Statement Emails: ${messages.length}`);

    for (const message of messages) {
      const email = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
      });
      const subject =
        email.data.payload.headers.find((header) => header.name === "Subject")
          ?.value || "";

      if (subject.toLowerCase().includes("statement")) {
        const attachmentPart =
          email.data.payload.parts.find(
            (part) =>
              part.filename && part.filename.toLowerCase().endsWith(".pdf")
          ) || null;

        if (!attachmentPart) {
          console.log("No PDF attachment found in the email.");
          continue;
        }

        const bodyData =
          email.data.payload.parts[0].body.data || email.data.payload.body.data;

        // Example: Extract key fields
        const statementData = extractStatementDataFromBody(bodyData);
        console.log("Extracted statement data:", statementData);

        const info = {
          cardNumber: resourceConfig.cards[0],
          ...extractStatementPeriod(subject, resourceConfig),
        };
        const resourceIdentifier = `${resourceConfig.identifierPrefix}${info.cardNumber}`;
        const fileName = `${resourceIdentifier}_${statementData.statementPeriod}.pdf`;

        const { driveRes, transactions } =
          await validateStatementPDFAndUploadToDrive(
            gmail,
            drive,
            attachmentPart,
            fileName,
            message,
            resourceConfig.pdfPassword,
            resourceIdentifier,
            message.id
          );

        if (driveRes) {
          await prepareStatementObjectAndSaveInDB(
            message.id,
            subject,
            resourceIdentifier,
            driveRes,
            info,
            statementData,
            transactions
          );
        }
      } else {
        continue;
      }
    }
  }
};
export { fetchStatements };
