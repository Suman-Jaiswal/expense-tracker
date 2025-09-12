import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
const accounts = [
  {
    id: "HDFC_XX1234",
    metaData: {
      accountName: "HDFC Savings",
      bankName: "HDFC",
      accountType: "Savings",
      accountNumber: "1234567890",
      ifscCode: "HDFC0001234",
      branch: "Mumbai",
    },
  },
];

const addAccount = async (account) => {
  const id = account.id; // Ensure the account has a unique 'id' field
  // check for id in db
  const accountRef = doc(db, "accounts", id);
  const docSnap = await getDoc(accountRef);
  if (docSnap.exists()) {
    console.log("account already exists with id:", id);
    return;
  }
  await setDoc(accountRef, {
    ...account,
    createdAt: new Date().toISOString(),
  });
  console.log("account added with id:", id);
};
export const initializeAccounts = async () => {
  for (const account of accounts) {
    await addAccount(account);
  }
};
