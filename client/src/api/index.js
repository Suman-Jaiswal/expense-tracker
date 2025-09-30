import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
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

export const getAllStatements = async () => {
  const statementsCollection = collection(db, "statements");
  const statements = getDocs(statementsCollection);
  const snapshot = await statements;
  const statementsList = snapshot.docs.map((doc) => doc.data());
  console.log("Fetched statements:", statementsList);

  return statementsList;
};

export const getBanksDropdownOptions = async () => {
  const docRef = doc(db, "ui_data", "banks_dropdown_options");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().json;
  } else {
    console.log("No such document!");
    return [];
  }
};

export const addCard = async (cardMetaData) => {
  const cardId = `${cardMetaData?.bankName}_XX${cardMetaData?.cardNumber?.slice(
    -4
  )}`;
  const card = {
    id: cardId,
    resourceIdentifier: `card_${cardId}`,
    metaData: cardMetaData || {},
    billingDate: "10",
    dueDate: "30",
    billDue: "0",
    lastBillAmount: "0",
    lastBilledDate: "2024-05-10",
    creditLimit: "300000",
    availableCredit: "300000",
    offset: "0",
    outstanding: "0",
  };
  await setDoc(doc(db, "cards", card.id), card);
  return { success: true };
};

export const deleteCard = async (cardId) => {
  await setDoc(doc(db, "cards", cardId), { deleted: true }, { merge: true });
  return { success: true };
};
