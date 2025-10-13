import fs from "fs";
import { config } from "../config.js";
import {
  addStatement,
  checkStatementExists,
  checkStatementExistsByPeriod,
  checkStatementExistsInDrive,
  uploadPdfBytesToDrive,
} from "../repository/statements.js";
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
  password
) => {
  // Check if PDF already exists in Drive
  const existingDriveFile = await checkStatementExistsInDrive(drive, fileName);

  if (existingDriveFile) {
    console.log(`   ℹ️  PDF already in Drive: ${fileName}`);
    console.log(
      `   ℹ️  Will check if statement metadata exists in Firebase...`
    );
    return { driveRes: existingDriveFile };
  }

  console.log(`   📥 Downloading attachment from email...`);

  // Download attachment from Gmail
  const attachmentId = attachmentPart.body?.attachmentId;
  const attachment = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId: message.id,
    id: attachmentId,
  });

  // Save to temporary file
  const attachmentBuffer = Buffer.from(attachment.data.data, "base64");
  fs.writeFileSync(config.TEMP_PDF_PATH, attachmentBuffer);
  console.log(
    `   💾 Attachment saved temporarily (${(attachmentBuffer.length / 1024).toFixed(2)} KB)`
  );

  // Decrypt the PDF
  console.log(`   🔓 Decrypting PDF...`);
  const decryptedPdfBytes = await decryptPdfTmp(config.TEMP_PDF_PATH, password);
  console.log(`   ✅ PDF decrypted successfully`);

  // Upload to Google Drive
  console.log(`   ☁️  Uploading to Google Drive...`);
  const driveFile = await uploadPdfBytesToDrive(
    drive,
    decryptedPdfBytes,
    fileName
  );
  console.log(`   ✅ Uploaded to Drive: ${driveFile.id}`);

  // Clean up temporary file
  fs.unlinkSync(config.TEMP_PDF_PATH);

  return { driveRes: driveFile };
};

export const prepareStatementObjectAndSaveInDB = async (
  messageId,
  subject,
  resourceIdentifier,
  driveRes,
  info,
  statementData = {}
) => {
  const period = {
    start: info.startISO,
    end: info.endISO,
  };

  console.log(`   🔍 Checking if statement exists in Firebase...`);

  // Check for duplicate by period (primary check)
  const existingByPeriod = await checkStatementExistsByPeriod(
    resourceIdentifier,
    period
  );
  if (existingByPeriod) {
    console.log(
      `   ✅ Statement metadata already exists in Firebase (${period.start} to ${period.end})`
    );
    return { isNew: false, statement: existingByPeriod };
  }

  // Check for duplicate by message ID (secondary check)
  const existingByMessageId = await checkStatementExists(messageId);
  if (existingByMessageId) {
    console.log(
      `   ✅ Statement metadata already exists in Firebase (message ID: ${messageId})`
    );
    return { isNew: false, statement: null };
  }

  // Statement doesn't exist in Firebase, add it
  console.log(`   💾 Statement metadata not found in Firebase, saving...`);
  const newStatement = {
    id: messageId,
    resourceIdentifier,
    driveFileId: driveRes.id,
    driveFileWebViewLink: driveRes.webViewLink,
    driveFileWebContentLink: driveRes.webContentLink,
    period,
    statementData,
  };
  await addStatement(newStatement);
  console.log(`   ✅ Statement metadata saved to Firebase`);
  return { isNew: true, statement: newStatement };
};
