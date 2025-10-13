import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { Readable } from "stream";
import { db } from "../../firebase.js";

const statementsCollection = collection(db, "statements");

export const checkStatementExists = async (id) => {
  const statementRef = doc(db, "statements", id);
  const docSnap = await getDoc(statementRef);
  return docSnap.exists();
};

/**
 * Check if a statement exists by resourceIdentifier and period
 * This prevents duplicate statements for the same card/period even if from different emails
 */
export const checkStatementExistsByPeriod = async (
  resourceIdentifier,
  period
) => {
  const q = query(
    statementsCollection,
    where("resourceIdentifier", "==", resourceIdentifier),
    where("period.start", "==", period.start),
    where("period.end", "==", period.end)
  );

  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const existingStatement = snapshot.docs[0].data();
    return existingStatement;
  }
  return null;
};

export const getAllStatements = async () => {
  const snapshot = await getDocs(statementsCollection);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const addStatement = async (statement) => {
  const id = statement.id; // Ensure the statement has a unique 'id' field
  const statementRef = doc(db, "statements", id);
  const docSnap = await getDoc(statementRef);
  if (docSnap.exists()) {
    // Already exists, skip silently (logged at higher level)
    return;
  }
  await setDoc(statementRef, {
    ...statement,
    createdAt: new Date().toISOString(),
  });
};

export const addMultipleStatements = async (statements) => {
  for (const statement of statements) {
    await addStatement(statement);
  }
};

export const deleteAllStatements = async () => {
  const snapshot = await getDocs(statementsCollection);
  const statementsList = snapshot.docs.map((doc) => doc.data());
  for (const statement of statementsList) {
    const statementRef = doc(db, "statements", statement.id);
    await deleteDoc(statementRef);
    console.log("Statement deleted with id:", statement.id);
  }
  console.log("All statements deleted");
};

function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null); // end
  return stream;
}

export async function uploadPdfBytesToDrive(drive, pdfBytes, fileName) {
  const fileMetadata = {
    name: fileName,
    mimeType: "application/pdf",
    parents: ["1ttdRxxehikh3TqNXoiKrSxRqe9H5yllw"], // Optional: specify a folder ID to upload into a specific folder
  };

  const media = {
    mimeType: "application/pdf",
    body: bufferToStream(pdfBytes),
  };

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, webViewLink, webContentLink",
  });

  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  console.log("✅ Uploaded PDF:", res.data);
  return res.data; // { id, webViewLink, webContentLink }
}

export const checkStatementExistsInDrive = async (drive, fileName) => {
  const res = await drive.files.list({
    q: `name='${fileName}' and mimeType='application/pdf'`,
    fields: "files(id, name)",
  });
  if (res.data.files.length > 0) {
    const { id } = res.data.files[0];
    const webViewLink = `https://drive.google.com/file/d/${id}/view?usp=sharing`;
    const webContentLink = `https://drive.google.com/uc?id=${id}&export=download`;
    return { id, webViewLink, webContentLink };
  }
  return false;
};
