/**
 * Quick Card Migration Script
 * Encrypts your existing 5 cards in Firestore
 */

import dotenv from "dotenv";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import {
  encryptCardSensitiveData,
  getLastFourDigits,
} from "./src/utils/encryption.js";

dotenv.config();

// Detect card brand from card number
const detectCardBrand = (cardNumber) => {
  if (!cardNumber) return "Unknown";

  const cleanNumber = cardNumber.replace(/[\s-]/g, "");

  if (/^4/.test(cleanNumber)) return "Visa";
  if (/^5[1-5]/.test(cleanNumber)) return "Mastercard";
  if (/^3[47]/.test(cleanNumber)) return "Amex";
  if (/^6(?:011|5)/.test(cleanNumber)) return "Discover";
  if (/^35/.test(cleanNumber)) return "JCB";
  if (/^62/.test(cleanNumber)) return "UnionPay";
  if (/^60/.test(cleanNumber)) return "RuPay";

  return "Unknown";
};

const isAlreadyEncrypted = (value) => {
  // Encrypted values have format: iv:authTag:encryptedData or iv:encryptedData
  return (
    typeof value === "string" &&
    value.includes(":") &&
    value.split(":").length >= 2
  );
};

const migrateCards = async () => {
  console.log("\n🔄 Starting Card Migration to Encrypted Format\n");
  console.log("=".repeat(70));

  try {
    // Check encryption key
    if (!process.env.CARD_ENCRYPTION_KEY) {
      console.error("\n❌ ERROR: CARD_ENCRYPTION_KEY not found!");
      console.log("\n📝 To fix this:");
      console.log("   1. Run: node generate-encryption-key.js");
      console.log("   2. Add the key to your .env file:");
      console.log("      CARD_ENCRYPTION_KEY=your_generated_key_here");
      console.log("   3. Run this script again\n");
      process.exit(1);
    }

    console.log("\n✅ Encryption key found");
    console.log("📥 Fetching cards from Firestore...\n");

    const cardsCollection = collection(db, "cards");
    const snapshot = await getDocs(cardsCollection);

    if (snapshot.empty) {
      console.log("⚠️  No cards found in database\n");
      return;
    }

    console.log(`📊 Found ${snapshot.docs.length} card(s)\n`);

    let encrypted = 0;
    let skipped = 0;
    let errors = 0;

    for (const cardDoc of snapshot.docs) {
      const cardData = cardDoc.data();
      const cardId = cardDoc.id;

      console.log(`\n🔍 Processing: ${cardId}`);
      console.log(`   Card: ${cardData.metaData?.cardName || "Unknown"}`);

      // Check if already encrypted
      const metadata = cardData.metaData || {};
      const isEncrypted = isAlreadyEncrypted(metadata.cardNumber);

      if (isEncrypted) {
        console.log("   ⏭️  Already encrypted, skipping...");
        skipped++;
        continue;
      }

      // Check if sensitive data exists
      if (!metadata.cardNumber) {
        console.log("   ⚠️  No card number found, skipping...");
        skipped++;
        continue;
      }

      try {
        console.log("   🔐 Encrypting sensitive data...");
        console.log(`   📄 Original card number: ${metadata.cardNumber}`);

        // Encrypt the sensitive fields
        const encryptedMetadata = encryptCardSensitiveData(metadata);

        // Get last 4 digits and brand for display
        const lastFour = getLastFourDigits(metadata.cardNumber);
        const brand = detectCardBrand(metadata.cardNumber);

        console.log(`   ✅ Encrypted successfully`);
        console.log(`   📝 Last 4 digits: ${lastFour}`);
        console.log(`   💳 Card brand: ${brand}`);

        // Update the card in Firestore
        const cardRef = doc(db, "cards", cardId);
        await setDoc(
          cardRef,
          {
            metaData: {
              ...metadata,
              cardNumber: encryptedMetadata.cardNumber,
              cardExpiry: encryptedMetadata.cardExpiry,
              cardCVV: encryptedMetadata.cardCVV,
              lastFourDigits: lastFour,
              cardBrand: brand,
            },
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        console.log(`   💾 Updated in Firestore`);
        encrypted++;
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("\n📊 Migration Summary:\n");
    console.log(`   ✅ Successfully encrypted: ${encrypted}`);
    console.log(`   ⏭️  Skipped (already encrypted): ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total cards: ${snapshot.docs.length}`);

    if (encrypted > 0) {
      console.log("\n✨ Migration complete! Your cards are now encrypted.\n");
      console.log(
        "🔒 Sensitive data (card numbers, expiry, CVV) is now secure!"
      );
      console.log(
        "📄 Display fields (lastFourDigits, cardBrand) are available.\n"
      );
    } else if (skipped > 0) {
      console.log("\n✅ All cards are already encrypted. Nothing to do!\n");
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error("\nStack trace:", error.stack);
    process.exit(1);
  }
};

// Run migration
console.log("\n╔══════════════════════════════════════════════╗");
console.log("║   🔐 CARD ENCRYPTION MIGRATION               ║");
console.log("╚══════════════════════════════════════════════╝");

migrateCards()
  .then(() => {
    console.log("✅ Script completed successfully\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
