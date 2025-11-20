import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import {
  decryptCardSensitiveData,
  detectCardBrand,
  encryptCardSensitiveData,
  getLastFourDigits,
  isEncrypted,
} from "../utils/encryption.js";

const transactionsCollection = collection(db, "transactions");

export const getAllTransactions = async () => {
  const transactions = getDocs(transactionsCollection);
  const snapshot = await transactions;
  const transactionsList = snapshot.docs.map((doc) => doc.data());
  console.log("Fetched transactions:", transactionsList.length);

  return transactionsList;
};

export const getAllResources = async (decryptCards = false) => {
  const cardsCollection = collection(db, "cards");
  const bankAcoountsCollection = collection(db, "accounts");
  const cardsSnapshot = await getDocs(cardsCollection);
  const bankAccountsSnapshot = await getDocs(bankAcoountsCollection);

  let cardsList = cardsSnapshot.docs.map((doc) => doc.data());

  // Optionally decrypt card data
  if (decryptCards) {
    cardsList = await Promise.all(
      cardsList.map(async (card) => {
        try {
          if (card.metaData && isEncrypted(card.metaData.cardNumber)) {
            const decryptedMetadata = await decryptCardSensitiveData(
              card.metaData
            );
            return {
              ...card,
              metaData: {
                ...card.metaData,
                ...decryptedMetadata,
              },
            };
          }
        } catch (error) {
          console.error(`Failed to decrypt card ${card.id}:`, error);
        }
        return card;
      })
    );
  }

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
  try {
    const cardId = `${
      cardMetaData?.bankName
    }_XX${cardMetaData?.cardNumber?.slice(-4)}`;

    // Encrypt sensitive card data
    const encryptedMetadata = await encryptCardSensitiveData(cardMetaData);

    // Get last 4 digits and card brand for display
    const lastFour = await getLastFourDigits(cardMetaData.cardNumber);
    const cardBrand = await detectCardBrand(cardMetaData.cardNumber);

    const card = {
      id: cardId,
      resourceIdentifier: `card_${cardId}`,
      metaData: {
        ...encryptedMetadata,
        lastFourDigits: lastFour,
        cardBrand: cardBrand,
      },
      billingDate: "10",
      dueDate: "30",
      billDue: "0",
      lastBillAmount: "0",
      lastBilledDate: new Date().toISOString().split("T")[0],
      creditLimit: "300000",
      availableCredit: "300000",
      offset: "0",
      outstanding: "0",
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "cards", card.id), card);
    console.log("Card added with encryption:", cardId);
    return { success: true, cardId };
  } catch (error) {
    console.error("Failed to add card:", error);
    throw error;
  }
};

export const deleteCard = async (cardId) => {
  await setDoc(doc(db, "cards", cardId), { deleted: true }, { merge: true });
  return { success: true };
};

export const updateCard = async (cardId, updates) => {
  try {
    const cardRef = doc(db, "cards", cardId);

    const updateData = {
      creditLimit: updates.creditLimit?.toString() || "0",
      outstanding: updates.outstanding?.toString() || "0",
      availableCredit: (
        (parseFloat(updates.creditLimit) || 0) -
        (parseFloat(updates.outstanding) || 0)
      ).toString(),
      billingDate: updates.billingDate?.toString() || "1",
      dueDate: updates.dueDate?.toString() || "1",
      updatedAt: new Date().toISOString(),
    };

    // Handle metadata updates
    if (updates.metaData) {
      const metaDataUpdates = { ...updates.metaData };

      // Check if we need to encrypt sensitive fields
      const hasCardNumber = updates.metaData.cardNumber;
      const hasCardExpiry = updates.metaData.cardExpiry;
      const hasCardCVV = updates.metaData.cardCVV;

      if (hasCardNumber || hasCardExpiry || hasCardCVV) {
        // Encrypt sensitive fields
        const encryptedMetadata = await encryptCardSensitiveData(
          metaDataUpdates
        );

        // Update last 4 digits if card number changed
        if (hasCardNumber) {
          const lastFour = await getLastFourDigits(updates.metaData.cardNumber);
          const cardBrand = await detectCardBrand(updates.metaData.cardNumber);
          encryptedMetadata.lastFourDigits = lastFour;
          encryptedMetadata.cardBrand = cardBrand;
        }

        updateData.metaData = encryptedMetadata;
      } else {
        // Non-sensitive metadata updates
        updateData.metaData = {
          cardName: updates.cardName || "",
          cardType: updates.cardType || "",
          ...metaDataUpdates,
        };
      }
    }

    await setDoc(cardRef, updateData, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Failed to update card:", error);
    throw error;
  }
};

export const updateBankAccount = async (accountId, updates) => {
  const accountRef = doc(db, "accounts", accountId);
  const updateData = {
    balance: updates.balance?.toString() || "0",
    metaData: {
      accountName: updates.accountName || "",
      accountNumber: updates.accountNumber || "",
      ifscCode: updates.ifscCode || "",
      branch: updates.branch || "",
      ...updates.metaData,
    },
    updatedAt: new Date().toISOString(),
  };
  await setDoc(accountRef, updateData, { merge: true });
  return { success: true };
};

// Backend sync API endpoints
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

// Sync statements
export const syncStatements = async () => {
  const response = await fetch(`${API_BASE_URL}/sync-statements`);
  return response.json();
};

// Sync transactions
export const syncTransactions = async () => {
  const response = await fetch(`${API_BASE_URL}/sync-transactions`);
  return response.json();
};

// Check for new statements
export const checkNewStatements = async () => {
  const response = await fetch(`${API_BASE_URL}/statements/check-new`);
  return response.json();
};

// Add manual transaction
export const addManualTransaction = async (transaction) => {
  const response = await fetch(`${API_BASE_URL}/transactions/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction),
  });
  return response.json();
};

// Update existing transaction
export const updateTransaction = async (id, updates) => {
  const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return response.json();
};
