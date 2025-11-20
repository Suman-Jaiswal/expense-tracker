/**
 * Verify Card Encryption
 * Quick check to see your cards are properly encrypted
 */

import dotenv from "dotenv";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";

dotenv.config();

const verifyEncryption = async () => {
  console.log("\n🔍 Verifying Card Encryption\n");
  console.log("=".repeat(70));

  const cardsCollection = collection(db, "cards");
  const snapshot = await getDocs(cardsCollection);

  console.log(`\n📊 Total Cards: ${snapshot.docs.length}\n`);

  snapshot.docs.forEach((doc) => {
    const card = doc.data();
    const isEncrypted = card.metaData?.cardNumber?.includes(":");

    console.log(`\n💳 ${card.id}`);
    console.log(`   Name: ${card.metaData?.cardName}`);
    console.log(`   Brand: ${card.metaData?.cardBrand || "Not set"}`);
    console.log(`   Last 4: ${card.metaData?.lastFourDigits || "Not set"}`);
    console.log(
      `   Card Number: ${isEncrypted ? "🔒 Encrypted ✅" : "⚠️  Plain Text"}`
    );
    console.log(
      `   Expiry: ${card.metaData?.cardExpiry?.includes(":") ? "🔒 Encrypted ✅" : "⚠️  Plain Text"}`
    );
    console.log(
      `   CVV: ${card.metaData?.cardCVV?.includes(":") ? "🔒 Encrypted ✅" : "⚠️  Plain Text"}`
    );
  });

  console.log("\n" + "=".repeat(70));
  console.log("\n✅ Verification complete!\n");
};

verifyEncryption()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
