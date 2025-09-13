import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { Readable } from "stream";
import { db } from "../../firebase.js";

const statementsCollection = collection(db, "statements");

export const checkStatementExists = async (id) => {
  const statementRef = doc(db, "statements", id);
  const docSnap = await getDoc(statementRef);
  return docSnap.exists();
};

export const addStatement = async (statement) => {
  const id = statement.id; // Ensure the statement has a unique 'id' field
  // check for id in db
  const statementRef = doc(db, "statements", id);
  const docSnap = await getDoc(statementRef);
  if (docSnap.exists()) {
    console.log("Statement already exists with id:", id);
    return;
  }
  await setDoc(statementRef, {
    ...statement,
    createdAt: new Date().toISOString(),
  });
  console.log("Statement added with id:", id);
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
