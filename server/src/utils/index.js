import fs from "fs";
import { config } from "../config.js";
import {
  addStatement,
  checkStatementExists,
  checkStatementExistsInDrive,
  uploadPdfBytesToDrive,
} from "../repository/statements.js";
import { addMultipleTransactions } from "../repository/transactions.js";
import { extractTransactionsFromPDF } from "../services/transactions/transactionExtractor.js";
import { decryptPdfTmp } from "./pdfDecrypter.js";

export const getEmailMessages = async (gmail, query, maxResults = 10) => {
  const emailListResponse = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  return emailListResponse.data.messages;
};

export const validateStatementPDFAndUploadToDrive = async (
  gmail,
  drive,
  attachmentPart,
  fileName,
  message,
  password,
  resourceIdentifier = null,
  statementId = null
) => {
  const driveRes = await checkStatementExistsInDrive(drive, fileName);
  if (driveRes) {
    console.log("Statement pdf already exists in Drive:", driveRes);
    return { driveRes, transactions: [] }; // { id, webViewLink, webContentLink }
  } else {
    console.log(
      "Statement pdf not found in Drive, proceeding to upload:",
      fileName
    );
    const attachmentId = attachmentPart.body?.attachmentId;

    const attachment = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId: message.id,
      id: attachmentId,
    });
    const attachmentDataBuffer = attachment.data.data;

    fs.writeFileSync(
      config.TEMP_PDF_PATH,
      Buffer.from(attachmentDataBuffer, "base64")
    );

    // Decrypt the PDF
    const decryptedPdfBytes = await decryptPdfTmp(
      config.TEMP_PDF_PATH,
      password
    );

    // Upload to Drive
    const res = await uploadPdfBytesToDrive(drive, decryptedPdfBytes, fileName);
    console.log("✅ PDF uploaded to Drive:", fileName);

    // Extract transactions from the PDF
    let extractedTransactions = [];
    try {
      console.log("📊 Extracting transactions from PDF...");
      const extractionResult = await extractTransactionsFromPDF(
        config.TEMP_PDF_PATH,
        password
      );

      console.log(
        `✅ Extracted ${extractionResult.totalTransactions} transactions from ${extractionResult.bank} statement`
      );

      // Format transactions for database
      if (resourceIdentifier && extractionResult.transactions.length > 0) {
        extractedTransactions = extractionResult.transactions.map((txn) => ({
          id: txn.id,
          resourceIdentifier: resourceIdentifier,
          statementId: statementId || message.id,
          date: txn.date,
          description: txn.description,
          merchant: txn.merchant,
          amount: txn.amount,
          type: txn.type,
          category: txn.category,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        console.log(
          `💾 Formatted ${extractedTransactions.length} transactions for database`
        );
      }
    } catch (extractionError) {
      console.error(
        "⚠️  Error extracting transactions:",
        extractionError.message
      );
      // Continue even if extraction fails - we still want to save the statement
    }

    // Clean up temp file
    fs.unlinkSync(config.TEMP_PDF_PATH);

    return { driveRes: res, transactions: extractedTransactions };
  }
};

export const prepareStatementObjectAndSaveInDB = async (
  messageId,
  subject,
  resourceIdentifier,
  driveRes,
  info,
  statementData = {},
  transactions = []
) => {
  if (!(await checkStatementExists(messageId))) {
    await addStatement({
      id: messageId,
      resourceIdentifier,
      driveFileId: driveRes.id,
      driveFileWebViewLink: driveRes.webViewLink,
      driveFileWebContentLink: driveRes.webContentLink,
      period: {
        start: info.startISO,
        end: info.endISO,
      },
      statementData,
    });
    console.log("✅ Statement data processed and saved for:", subject);

    // Save transactions to database
    if (transactions && transactions.length > 0) {
      try {
        console.log(
          `💾 Saving ${transactions.length} transactions to database...`
        );
        await addMultipleTransactions(transactions);
        console.log(
          `✅ Successfully saved ${transactions.length} transactions`
        );
      } catch (error) {
        console.error("❌ Error saving transactions:", error.message);
        // Continue even if transaction save fails
      }
    }
  } else {
    console.log("⚠️  Statement data already exists, skipping:", subject);
  }
};
