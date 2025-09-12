// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAGRi-yUgDdFCQSlMy_4JpZPKPfBqh5Tm4",
  authDomain: "expense-tracker-8f5a6.firebaseapp.com",
  projectId: "expense-tracker-8f5a6",
  storageBucket: "expense-tracker-8f5a6.firebasestorage.app",
  messagingSenderId: "839766349911",
  appId: "1:839766349911:web:9535e4fef613e4bc1b2b12",
  measurementId: "G-PLC4ZBRD1W",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };
