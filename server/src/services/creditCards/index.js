import * as cheerio from "cheerio";
import fs from "fs";
import {
  addStatement,
  checkStatementExists,
  uploadPdfBytesToDrive,
} from "../../repository/statements.js";
import { addTransaction } from "../../repository/transactions.js";
import { decryptPdfTmp } from "../../utils/pdfDecrypter.js";

// --- Utility Functions for Parsing Email Content ---
function parseDebitTransaction(html) {
  const $ = cheerio.load(html);
  const text = $("body").text();

  const transactionAmount =
    text.match(/transaction of INR ([\d,]+\.\d{2})/i)?.[1] || null;
  const transactionDate = text.match(/on (\w+ \d{2}, \d{4})/i)?.[1] || null;
  const availableCreditLimit =
    text.match(
      /Available Credit Limit on your card is INR ([\d,]+\.\d{2})/i
    )?.[1] || null;
  const cardNumber = text.match(
    /ICICI Bank Credit Card(?:\s*):?\s*XX(\d{4})/i
  )?.[1]
    ? `XX${text.match(/ICICI Bank Credit Card(?:\s*):?\s*XX(\d{4})/i)?.[1]}`
    : null;

  return {
    transactionAmount,
    transactionDate,
    availableCreditLimit,
    cardNumber,
    type: "debit",
  };
}

function parsePaymentReceived(html) {
  const $ = cheerio.load(html);
  const text = $("body").text();

  const transactionAmount =
    text.match(/payment of INR ([\d,]+\.\d{2})/i)?.[1] || null;
  const creditedDate = text.match(/on (\d{2}-[A-Za-z]{3}-\d{4})/i)?.[1] || null;
  const cardNumber = text.match(/XXXX XXXX (\d{4})\b/)?.[1]
    ? `XX${text.match(/XXXX XXXX (\d{4})\b/)?.[1]}`
    : null;

  return {
    transactionAmount,
    creditedDate,
    cardNumber,
    type: "credit",
  };
}

function parseTransactionSuccess(html) {
  const $ = cheerio.load(html);
  const text = $("body").text();

  const transactionAmount =
    text.match(/payment of INR ([\d,]+\.\d{2})/i)?.[1] || null;
  const transactionDate = text.match(/on (\d{2}\/\d{2}\/\d{4})/i)?.[1] || null;
  const cardNumber = text.match(/ICICI Bank Credit Card (\d{4})/i)?.[1] || null;
  const merchantInfo = text.match(/towards (.+?),/i)?.[1] || null;

  return {
    transactionAmount,
    transactionDate,
    cardNumber,
    merchantInfo,
    type: "debit",
  };
}

const getEmailMessages = async (gmail, query, maxResults = 10) => {
  const emailListResponse = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  return emailListResponse.data.messages;
};

// --- Main Function to Fetch and Process Emails ---
async function fetchAndCalculateOutstanding(gmail) {
  const currentDayOfMonth = new Date().getDate();

  console.log("Current Day of Month:", currentDayOfMonth);

  const emailQuery = `from:(credit_cards@icicibank.com OR cards@icicibank.com) subject:("Transaction" OR "Payment Received") newer_than:${
    currentDayOfMonth + 15
  }d`;

  const messages = await getEmailMessages(gmail, emailQuery, 60);
  console.log("messages:", messages);

  if (messages && messages.length > 0) {
    console.log(`Total Transaction Emails: ${messages.length}`);
    const processedMessages = [];

    for (const message of messages) {
      const email = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
      });
      const subject =
        email.data.payload.headers.find((header) => header.name === "Subject")
          ?.value || "";
      console.log("Processing email with subject:", subject);

      let parsedInfo;
      const bodyData =
        email.data.payload.parts?.[0]?.body?.data ||
        email.data.payload.body?.data;
      const decodedBody = Buffer.from(bodyData, "base64").toString("utf-8");

      if (subject.toLowerCase().includes("payment received")) {
        parsedInfo = parsePaymentReceived(decodedBody);
      } else if (subject.toLowerCase().includes("transaction alert")) {
        parsedInfo = parseDebitTransaction(decodedBody);
      } else if (subject.toLowerCase().includes("transaction success")) {
        parsedInfo = parseTransactionSuccess(decodedBody);
      }
      const transaction = {
        ...parsedInfo,
        id: message.id,
        resourceIdentifier: `card_ICICI_${parsedInfo.cardNumber}`,
      };
      processedMessages.push(transaction);
      addTransaction(transaction);
    }

    // fs.writeFileSync(`output.json`, JSON.stringify(processedMessages, null, 2));
    return processedMessages;
  }
}

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

const fetchStatement = async (gmail, drive) => {
  const emailQuery = `from:(credit_cards@icicibank.com OR cards@icicibank.com) subject:("Statement") newer_than:${365}d`;
  const messages = await getEmailMessages(gmail, emailQuery, 12);
  console.log(messages);
  if (messages && messages.length > 0) {
    console.log(`Total Transaction Emails: ${messages.length}`);

    for (const message of messages) {
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

        if (await checkStatementExists(message.id)) {
          console.log("Statement already processed for email id:", message.id);
          continue;
        }

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
export { fetchAndCalculateOutstanding, fetchStatement };
