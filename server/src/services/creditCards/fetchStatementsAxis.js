import fs from "fs";
import { JSDOM } from "jsdom";
import {
  addStatement,
  checkStatementExists,
  uploadPdfBytesToDrive,
} from "../../repository/statements.js";
import { getEmailMessages } from "../../utils/index.js";
import { decryptPdfTmp } from "../../utils/pdfDecrypter.js";

// --- Utility Functions for Parsing Email Content ---

// --- Main Function to Fetch and Process Emails ---
function extractStatementPeriod(text) {
  const match = text.split("-")[1].trim();

  if (!match) return null;

  const date = new Date(`${match} 1`);
  date.setDate(13);

  console.log("date==========>", date);

  let startDate = new Date(date);
  startDate = startDate.setMonth(startDate.getMonth() - 1);

  // Convert to ISO using Date
  const startISO = new Date(startDate).toISOString().split("T")[0]; // YYYY-MM-DD
  const endISO = new Date(date).toISOString().split("T")[0];

  return { startISO, endISO };
}

function extractStatementData(document) {
  // find all tbody elements
  const tbodies = document.querySelectorAll("tbody");

  for (const tbody of tbodies) {
    const rows = tbody.querySelectorAll("tr");
    if (rows.length !== 2) continue;

    const headerCells = [...rows[0].querySelectorAll("td")].map((td) =>
      td.textContent.trim().replace(/\s+/g, " ")
    );
    // check if this is the right table
    if (headerCells.includes("Total Amount Due INR")) {
      const dataCells = [...rows[1].querySelectorAll("td")].map((td) =>
        td.textContent.trim()
      );

      // build key-value object
      let result = {};
      result.amountDue = dataCells[headerCells.indexOf("Total Amount Due INR")];
      result.minimumAmountDue = dataCells[1];
      result.paymentDueDate = dataCells[2];
      return result; // stop at first match
    }
  }

  return null; // not found
}

const fetchStatementsAXIS = async (gmail, drive) => {
  const emailQuery = `from:(cc.statements@axisbank.com) subject:("Flipkart Axis Bank Credit Card Statement") newer_than:${365}d`;
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

        const bodyData = email.data.payload.parts[0].body.data;
        const rawHtml = Buffer.from(bodyData, "base64").toString("utf8");
        const dom = new JSDOM(rawHtml);
        const document = dom.window.document;

        // Example: Extract key fields
        const statementData = extractStatementData(document);

        const info = {
          cardNumber: "XX2376",
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

        const resourceIdentifier = `card_AXIS_${info.cardNumber}`;
        const fileName = `${resourceIdentifier}_${info.startISO}_to_${info.endISO}.pdf`;

        // Decrypt and upload PDF
        const decryptedPdfBytes = await decryptPdfTmp(
          `/tmp/statement.pdf`,
          "SUMA0709"
        );

        const res = await uploadPdfBytesToDrive(
          drive,
          decryptedPdfBytes,
          fileName
        );
        console.log("✅ PDF uploaded to Drive:", fileName);

        // Extract transactions from the PDF
        let extractedTransactions = [];
        try {
          console.log("📊 Extracting transactions from PDF...");
          const { extractTransactionsFromPDF } = await import(
            "../transactions/transactionExtractor.js"
          );
          const extractionResult = await extractTransactionsFromPDF(
            `/tmp/statement.pdf`,
            "SUMA0709"
          );

          console.log(
            `✅ Extracted ${extractionResult.totalTransactions} transactions from ${extractionResult.bank} statement`
          );

          // Format transactions for database
          if (extractionResult.transactions.length > 0) {
            extractedTransactions = extractionResult.transactions.map(
              (txn) => ({
                id: txn.id,
                resourceIdentifier: resourceIdentifier,
                statementId: message.id,
                date: txn.date,
                description: txn.description,
                merchant: txn.merchant,
                amount: txn.amount,
                type: txn.type,
                category: txn.category,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
            );
          }
        } catch (extractionError) {
          console.error(
            "⚠️  Error extracting transactions:",
            extractionError.message
          );
        }

        // Clean up temp file
        fs.unlinkSync(`/tmp/statement.pdf`);

        // Save statement to database
        await addStatement({
          id: message.id,
          resourceIdentifier: resourceIdentifier,
          driveFileId: res.id,
          driveFileWebViewLink: res.webViewLink,
          driveFileWebContentLink: res.webContentLink,
          period: {
            start: info.startISO,
            end: info.endISO,
          },
          statementData,
        });

        console.log(
          "✅ Statement processed and saved for email id:",
          message.id
        );

        // Save transactions to database
        if (extractedTransactions.length > 0) {
          try {
            const { addMultipleTransactions } = await import(
              "../../repository/transactions.js"
            );
            console.log(
              `💾 Saving ${extractedTransactions.length} transactions to database...`
            );
            await addMultipleTransactions(extractedTransactions);
            console.log(
              `✅ Successfully saved ${extractedTransactions.length} transactions`
            );
          } catch (error) {
            console.error("❌ Error saving transactions:", error.message);
          }
        }
      } else {
        continue;
      }
    }
  }
};
export { fetchStatementsAXIS };
