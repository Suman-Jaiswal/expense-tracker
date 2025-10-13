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
  const snapshot = await getDocs(transactionsCollection);
  const transactionsList = snapshot.docs.map((doc) => doc.data());
  return transactionsList;
};
export const updateTransaction = async (id, updatedData) => {
  // Implement updating a transaction if needed
};
export const deleteTransaction = async (id) => {
  const transactionRef = doc(db, "transactions", id);
  await deleteDoc(transactionRef);
  console.log("Transaction deleted with id:", id);
};

export const addMultipleTransactions = async (transactions) => {
  for (const transaction of transactions) {
    await addTransaction(transaction);
  }
};

export const deleteAllTransactions = async () => {
  const snapshot = await getDocs(transactionsCollection);
  const transactionsList = snapshot.docs.map((doc) => doc.data());
  for (const transaction of transactionsList) {
    const transactionRef = doc(db, "transactions", transaction.id);
    await deleteDoc(transactionRef);
    console.log("Transaction deleted with id:", transaction.id);
  }
  console.log("All transactions deleted");
};

/**
 * Check if transactions already exist for a given statement
 * @param {string} statementId - The statement ID to check
 * @returns {Promise<boolean>} - True if transactions exist, false otherwise
 */
export const hasTransactionsForStatement = async (statementId) => {
  const q = query(
    transactionsCollection,
    where("statementId", "==", statementId)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

/**
 * Get transaction count for a given statement
 * @param {string} statementId - The statement ID
 * @returns {Promise<number>} - Number of transactions for this statement
 */
export const getTransactionCountForStatement = async (statementId) => {
  const q = query(
    transactionsCollection,
    where("statementId", "==", statementId)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
};
