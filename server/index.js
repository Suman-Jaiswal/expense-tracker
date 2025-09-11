import * as cheerio from "cheerio";
import fs from "fs";
import { google } from "googleapis";
import { authorize } from "./auth.js";
import { startServer } from "./server.js";

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

  const creditedAmount =
    text.match(/payment of INR ([\d,]+\.\d{2})/i)?.[1] || null;
  const creditedDate = text.match(/on (\d{2}-[A-Za-z]{3}-\d{4})/i)?.[1] || null;
  const cardNumber = text.match(/XXXX XXXX (\d{4})\b/)?.[1]
    ? `XX${text.match(/XXXX XXXX (\d{4})\b/)?.[1]}`
    : null;

  return {
    creditedAmount,
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

// --- Main Function to Fetch and Process Emails ---
async function fetchAndCalculateOutstanding() {
  const auth = await authorize();
  const gmail = google.gmail({ version: "v1", auth });

  let outstanding = 0;
  const currentDayOfMonth = new Date().getDate();

  console.log("Current Day of Month:", currentDayOfMonth);

  const emailQuery = `from:(credit_cards@icicibank.com OR cards@icicibank.com) subject:("Transaction" OR "Payment Received") newer_than:${
    currentDayOfMonth + 15
  }d`;
  const emailListResponse = await gmail.users.messages.list({
    userId: "me",
    q: emailQuery,
    maxResults: 60,
  });

  const messages = emailListResponse.data.messages;

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
        outstanding -= parseFloat(
          (parsedInfo.creditedAmount || "0").replace(/,/g, "")
        );
      } else if (subject.toLowerCase().includes("transaction alert")) {
        parsedInfo = parseDebitTransaction(decodedBody);
        outstanding += parseFloat(
          (parsedInfo.transactionAmount || "0").replace(/,/g, "")
        );
      } else if (subject.toLowerCase().includes("transaction success")) {
        parsedInfo = parseTransactionSuccess(decodedBody);
        outstanding += parseFloat(
          (parsedInfo.transactionAmount || "0").replace(/,/g, "")
        );
      }

      processedMessages.push(parsedInfo);
    }

    // fs.writeFileSync(`output.json`, JSON.stringify(processedMessages, null, 2));
    return processedMessages;
  }

  console.log("Current Outstanding:", outstanding);
}

// fetchAndCalculateOutstanding().catch(console.error);
export { fetchAndCalculateOutstanding };
startServer();
