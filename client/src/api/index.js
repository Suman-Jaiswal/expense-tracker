import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";

const transactionsCollection = collection(db, "transactions");

export const getAllTransactions = async () => {
  const transactions = getDocs(transactionsCollection);
  const snapshot = await transactions;
  const transactionsList = snapshot.docs.map((doc) => doc.data());
  console.log("Fetched transactions:", transactionsList);

  return transactionsList;
};

export const getAllResources = async () => {
  const cardsCollection = collection(db, "cards");
  const bankAcoountsCollection = collection(db, "accounts");
  const cardsSnapshot = await getDocs(cardsCollection);
  const bankAccountsSnapshot = await getDocs(bankAcoountsCollection);
  const cardsList = cardsSnapshot.docs.map((doc) => doc.data());
  const bankAccountsList = bankAccountsSnapshot.docs.map((doc) => doc.data());
  const resources = { cards: cardsList, accounts: bankAccountsList };
  console.log("Fetched resources:", resources);
  return resources;
};

export const getTransactionsByResourceidentifier = async (
  resourceIdentifier
) => {
  const transactions = getDocs(transactionsCollection);
  const snapshot = await transactions;
  const transactionsList = snapshot.docs
    .map((doc) => doc.data())
    .filter((tx) => tx.resourceIdentifier === resourceIdentifier);
  console.log(
    `Fetched transactions for ${resourceIdentifier}:`,
    transactionsList
  );

  return transactionsList;
};
