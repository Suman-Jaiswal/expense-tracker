import fs from "fs";
import { JSDOM } from "jsdom";
import {
  addStatement,
  checkStatementExists,
  uploadPdfBytesToDrive,
} from "../../repository/statements.js";
import { getEmailMessages } from "../../utils/index.js";
import { decryptPdfTmp } from "../../utils/pdfDecrypter.js";

// --- Main Function to Fetch and Process Emails ---
function extractStatementPeriod(text) {
  // Pattern 1: "period  August 16 2025 to September 15 2025" (with possible double spaces)
  // Pattern 2: "period August 13, 2025 to September 12, 2025" (with commas)
  let match = text.match(
    /period\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})\s+to\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i
  );

  if (!match) {
    console.warn("⚠️  Could not extract period from subject:", text);
    // Return current month as fallback
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: firstDay.toLocaleDateString(),
      endDate: lastDay.toLocaleDateString(),
      startISO: firstDay.toISOString().split("T")[0],
      endISO: lastDay.toISOString().split("T")[0],
    };
  }

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

function extractStatementData(document) {
  // Extract ICICI statement data from email HTML
  // ICICI emails typically have billing summary in the HTML
  try {
    // Look for common ICICI patterns
    const allText = document.body.textContent;
    const result = {};

    // Try to extract Total Amount Due
    const amountDueMatch = allText.match(
      /Total Amount Due[:\s]*(?:INR|Rs\.?)?[\s]*([0-9,]+\.?\d*)/i
    );
    if (amountDueMatch) {
      result.amountDue = amountDueMatch[1].replace(/,/g, "");
    }

    // Try to extract Minimum Amount Due
    const minAmountMatch = allText.match(
      /Minimum Amount Due[:\s]*(?:INR|Rs\.?)?[\s]*([0-9,]+\.?\d*)/i
    );
    if (minAmountMatch) {
      result.minimumAmountDue = minAmountMatch[1].replace(/,/g, "");
    }

    // Try to extract Payment Due Date
    const dueDateMatch = allText.match(
      /Payment Due Date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i
    );
    if (dueDateMatch) {
      result.paymentDueDate = dueDateMatch[1];
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    console.warn("⚠️  Could not extract statement data:", error.message);
    return null;
  }
}

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

        // Extract HTML body FIRST (same as AXIS)
        const bodyData = email.data.payload.parts[0].body.data;
        const rawHtml = Buffer.from(bodyData, "base64").toString("utf8");
        const dom = new JSDOM(rawHtml);
        const document = dom.window.document;

        // Extract statement data from HTML
        const statementData = extractStatementData(document);

        // Extract period from subject
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

        const resourceIdentifier = `card_ICICI_${info.cardNumber}`;
        const fileName = `${resourceIdentifier}_${info.startISO}_to_${info.endISO}.pdf`;

        // Decrypt and upload PDF
        const decryptedPdfBytes = await decryptPdfTmp(
          `/tmp/statement.pdf`,
          "suma0709"
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
            "suma0709"
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
export { fetchStatementsICICI };
