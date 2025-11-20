import { deleteDoc, doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.js";
import { encryptCardSensitiveData, decryptCardSensitiveData, getLastFourDigits } from "../utils/encryption.js";

const cards = [
  {
    id: "ICICI_XX9003",
    resourceIdentifier: "card_ICICI_XX9003",
    metaData: {
      cardName: "Saphiro Mastercard",
      bankName: "ICICI",
      cardType: "credit",
      cardNumber: "5241939506469003",
      cardExpiry: "09/31",
      cardCVV: "444",
    },
    billingDate: "10",
    dueDate: "30",
    billDue: "0",
    lastBillAmount: "0",
    lastBilledDate: "2024-05-10",
    creditLimit: "300000",
    availableCredit: "300000",
    offset: "0",
    outstanding: "0",
  },
  {
    id: "ICICI_XX7009",
    resourceIdentifier: "card_ICICI_XX7009",
    metaData: {
      cardName: "Saphiro AMEX",
      bankName: "ICICI",
      cardType: "credit",
      cardNumber: "374741621027009",
      cardExpiry: "09/31",
      cardCVV: "1841",
    },
    billingDate: "15",
    dueDate: "5",
    billDue: "0",
    lastBillAmount: "0",
    lastBilledDate: "2024-05-15",
    creditLimit: "200000",
    availableCredit: "200000",
    offset: "0",
    outstanding: "0",
  },
  {
    id: "ICICI_XX5000",
    resourceIdentifier: "card_ICICI_XX5000",
    metaData: {
      cardName: "Amazon Pay",
      bankName: "ICICI",
      cardType: "credit",
      cardNumber: "4315815700135000",
      cardExpiry: "07/32",
      cardCVV: "675",
    },
    billingDate: "20",
    dueDate: "10",
    billDue: "0",
    lastBillAmount: "0",
    lastBilledDate: "2024-05-20",
    creditLimit: "150000",
    availableCredit: "150000",
    offset: "0",
    outstanding: "0",
  },
  {
    id: "AXIS_XX2376",
    resourceIdentifier: "card_AXIS_XX2376",
    metaData: {
      cardName: "Flipkart Axis",
      bankName: "Axis",
      cardType: "credit",
      cardNumber: "5334670053872376",
      cardExpiry: "06/30",
      cardCVV: "976",
    },
    billingDate: "25",
    dueDate: "15",
    billDue: "0",
    lastBillAmount: "0",
    lastBilledDate: "2024-05-25",
    creditLimit: "250000",
    availableCredit: "250000",
    offset: "0",
    outstanding: "0",
  },
  {
    id: "SBI_XX5965",
    resourceIdentifier: "card_SBI_XX5965",
    metaData: {
      cardName: "SimplySAVE",
      bankName: "SBI",
      cardType: "credit",
      cardNumber: "6529023715095965",
      cardExpiry: "03/32",
      cardCVV: "931",
    },
    billingDate: "5",
    dueDate: "25",
    billDue: "0",
    lastBillAmount: "0",
    lastBilledDate: "2024-06-05",
    creditLimit: "180000",
    availableCredit: "180000",
    offset: "0",
    outstanding: "0",
  },
];

const addCard = async (card) => {
  const id = card.id; // Ensure the card has a unique 'id' field
  // check for id in db
  const cardRef = doc(db, "cards", id);
  const docSnap = await getDoc(cardRef);
  if (docSnap.exists()) {
    console.log("Card already exists with id:", id);
    return;
  }

  // Encrypt sensitive card data before storing
  const encryptedMetadata = encryptCardSensitiveData(card.metaData);
  
  // Also store last 4 digits in plain text for easy display
  const lastFour = getLastFourDigits(card.metaData.cardNumber);
  
  await setDoc(cardRef, {
    ...card,
    metaData: {
      ...encryptedMetadata,
      lastFourDigits: lastFour,
    },
    createdAt: new Date().toISOString(),
  });
  console.log("Card added with id:", id);
};

export const initializeCards = async () => {
  for (const card of cards) {
    await addCard(card);
  }
};

export const deleteAllCards = async () => {
  for (const card of cards) {
    const cardRef = doc(db, "cards", card.id);
    // hard delete
    await deleteDoc(cardRef);
    console.log("Card deleted with id:", card.id);
  }
};

/**
 * Get a single card by ID with decrypted sensitive data
 * @param {string} cardId - Card ID
 * @param {boolean} decrypt - Whether to decrypt sensitive data (default: false)
 * @returns {Object} - Card object
 */
export const getCard = async (cardId, decrypt = false) => {
  const cardRef = doc(db, "cards", cardId);
  const docSnap = await getDoc(cardRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const cardData = docSnap.data();
  
  // Return encrypted data by default (for display purposes, use lastFourDigits)
  if (!decrypt) {
    return cardData;
  }
  
  // Decrypt sensitive data if requested
  try {
    const decryptedMetadata = decryptCardSensitiveData(cardData.metaData);
    return {
      ...cardData,
      metaData: {
        ...cardData.metaData,
        ...decryptedMetadata,
      },
    };
  } catch (error) {
    console.error(`Failed to decrypt card ${cardId}:`, error.message);
    // Return encrypted data if decryption fails
    return cardData;
  }
};

/**
 * Get all cards with optional decryption
 * @param {boolean} decrypt - Whether to decrypt sensitive data (default: false)
 * @returns {Array} - Array of card objects
 */
export const getAllCards = async (decrypt = false) => {
  const cardsCollection = collection(db, "cards");
  const snapshot = await getDocs(cardsCollection);
  
  const cardsList = [];
  
  for (const doc of snapshot.docs) {
    const cardData = doc.data();
    
    if (!decrypt) {
      cardsList.push(cardData);
      continue;
    }
    
    // Decrypt sensitive data if requested
    try {
      const decryptedMetadata = decryptCardSensitiveData(cardData.metaData);
      cardsList.push({
        ...cardData,
        metaData: {
          ...cardData.metaData,
          ...decryptedMetadata,
        },
      });
    } catch (error) {
      console.error(`Failed to decrypt card ${cardData.id}:`, error.message);
      // Add encrypted card if decryption fails
      cardsList.push(cardData);
    }
  }
  
  return cardsList;
};

/**
 * Update a card (encrypts sensitive data automatically)
 * @param {string} cardId - Card ID
 * @param {Object} updates - Card updates
 * @returns {Object} - Success status
 */
export const updateCard = async (cardId, updates) => {
  const cardRef = doc(db, "cards", cardId);
  
  // If updating metadata with sensitive data, encrypt it
  if (updates.metaData) {
    const hasCardNumber = updates.metaData.cardNumber;
    const hasCardExpiry = updates.metaData.cardExpiry;
    const hasCardCVV = updates.metaData.cardCVV;
    
    if (hasCardNumber || hasCardExpiry || hasCardCVV) {
      // Encrypt the sensitive fields
      const encryptedMetadata = encryptCardSensitiveData(updates.metaData);
      
      // Update last 4 digits if card number is being updated
      if (hasCardNumber) {
        const lastFour = getLastFourDigits(updates.metaData.cardNumber);
        encryptedMetadata.lastFourDigits = lastFour;
      }
      
      updates.metaData = {
        ...updates.metaData,
        ...encryptedMetadata,
      };
    }
  }
  
  await setDoc(
    cardRef,
    {
      ...updates,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  
  console.log("Card updated with id:", cardId);
  return { success: true };
};
