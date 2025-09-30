import fs from "fs";
import { config } from "../config.js";
import {
  addStatement,
  checkStatementExists,
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
  const driveRes = await checkStatementExistsInDrive(drive, fileName);
  if (driveRes) {
    console.log("Statement pdf already exists in Drive:", driveRes);
    return driveRes; // { id, webViewLink, webContentLink }
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

    // const data = await getStatement(); // decrypt and parse the saved PDF
    const decryptedPdfBytes = await decryptPdfTmp(
      config.TEMP_PDF_PATH,
      password // Replace with actual password if needed
    );
    const res = await uploadPdfBytesToDrive(drive, decryptedPdfBytes, fileName);
    fs.unlinkSync(config.TEMP_PDF_PATH);
    console.log("PDF uploaded to Drive:", fileName);
    return res; // { id, webViewLink, webContentLink }
  }
};

export const prepareStatementObjectAndSaveInDB = async (
  messageId,
  subject,
  resourceIdentifier,
  driveRes,
  info,
  statementData = {}
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
    console.log("Statement data processed and saved for:", subject);
  } else {
    console.log("Statement data already exists, skipping:", subject);
  }
};
