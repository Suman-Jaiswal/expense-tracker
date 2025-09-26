import fs from "fs";
import {
  addStatement,
  checkStatementExists,
  uploadPdfBytesToDrive,
} from "../../repository/statements.js";
import { getEmailMessages } from "../../utils/index.js";
import { decryptPdfTmp } from "../../utils/pdfDecrypter.js";

// --- Main Function to Fetch and Process Emails ---
function extractStatementPeriod(text) {
  const match = text.match(
    /period\s+([A-Za-z]+\s+\d{1,2}[\s,\s]+\d{4})\s+to\s+([A-Za-z]+\s+\d{1,2}[\s,\s]+\d{4})/i
  );

  if (!match) return null;

  const startDate = match[1];
  const endDate = match[2];

  // Convert to ISO using Date
  const startISO = new Date(startDate).toISOString().split("T")[0]; // YYYY-MM-DD
  const endISO = new Date(endDate).toISOString().split("T")[0];

  return { startDate, endDate, startISO, endISO };
}

const extractCardNumberFromFilename = (filename) => {
  // 5241XXXXXXXX9003_316671_Retail_Sapphiro_NORM.pdf // take last 6 digits
  const cardNumber = filename.split("_")[0];
  return `XX${cardNumber.slice(-4)}`;
};

const fetchStatementsICICI = async (gmail, drive) => {
  const emailQuery = `from:(credit_cards@icicibank.com OR cards@icicibank.com) subject:("Statement") newer_than:${365}d`;
  const messages = await getEmailMessages(gmail, emailQuery, 12);
  console.log(messages);
  if (messages && messages.length > 0) {
    console.log(`Total Transaction Emails: ${messages.length}`);

    for (const message of messages) {
      if (await checkStatementExists(message.id)) {
        console.log("Statement already processed for message id:", message.id);
        continue;
      }
      const email = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
      });
      const subject =
        email.data.payload.headers.find((header) => header.name === "Subject")
          ?.value || "";
      console.log("Processing email with subject:", subject);

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

        const info = {
          cardNumber: extractCardNumberFromFilename(attachmentPart.filename),
          ...extractStatementPeriod(subject),
        };

        const attachmentId = attachmentPart.body?.attachmentId;

        const attachment = await gmail.users.messages.attachments.get({
          userId: "me",
          messageId: message.id,
          id: attachmentId,
        });
        const attachmentDataBuffer = attachment.data.data;

        fs.writeFileSync(
          `/tmp/statement.pdf`,
          Buffer.from(attachmentDataBuffer, "base64")
        );

        // const data = await getStatement(); // decrypt and parse the saved PDF
        const decryptedPdfBytes = await decryptPdfTmp(
          `/tmp/statement.pdf`,
          "suma0709" // Replace with actual password if needed
        );

        console.log(decryptedPdfBytes);
        const res = await uploadPdfBytesToDrive(
          drive,
          decryptedPdfBytes,
          `card_ICICI_${info.cardNumber}_${info.startISO}_to_${info.endISO}.pdf`
        );

        await addStatement({
          id: message.id,
          resourceIdentifier: `card_ICICI_${info.cardNumber}`,
          driveFileId: res.id,
          driveFileWebViewLink: res.webViewLink,
          driveFileWebContentLink: res.webContentLink,
          period: {
            start: info.startISO,
            end: info.endISO,
          },
        });

        console.log("Statement processed and saved for email id:", message.id);
      } else {
        continue;
      }
    }
  }
};
export { fetchStatementsICICI };
