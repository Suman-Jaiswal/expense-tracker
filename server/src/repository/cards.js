import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.js";

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
  await setDoc(cardRef, {
    ...card,
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
