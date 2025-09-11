import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.js";

const transactionsCollection = collection(db, "transactions");

export const addTransaction = async (transaction) => {
  const id = transaction.id; // Ensure the transaction has a unique 'id' field
  // check for id in db
  const transactionRef = doc(db, "transactions", id);
  const docSnap = await getDoc(transactionRef);
  if (docSnap.exists()) {
    console.log("Transaction already exists with id:", id);
    return;
  }
  await setDoc(transactionRef, {
    ...transaction,
    createdAt: new Date().toISOString(),
  });
  console.log("Transaction added with id:", id);
};
export const getTransactions = async () => {
  // Implement fetching transactions if needed
};
export const updateTransaction = async (id, updatedData) => {
  // Implement updating a transaction if needed
};
export const deleteTransaction = async (id) => {
  // Implement deleting a transaction if needed
};

export const addMultipleTransactions = async (transactions) => {
  for (const transaction of transactions) {
    await addTransaction(transaction);
  }
};
