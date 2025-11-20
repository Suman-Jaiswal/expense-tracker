/**
 * Migrate Existing Cards to Encrypted Format
 * 
 * This script encrypts sensitive card data (card number, expiry, CVV) for all existing cards.
 * It reads cards from Firestore, encrypts sensitive fields, and updates them back.
 * 
 * Prerequisites:
 *   1. Set CARD_ENCRYPTION_KEY in your .env file
 *   2. Run: node generate-encryption-key.js (if you don't have a key yet)
 * 
 * Usage:
 *   node migrate-encrypt-cards.js
 * 
 * What it does:
 *   - Reads all cards from Firestore
 *   - Checks if card data is already encrypted
 *   - Encrypts cardNumber, cardExpiry, and cardCVV
 *   - Adds lastFourDigits field for display purposes
 *   - Updates cards in Firestore
 * 
 * IMPORTANT:
 *   - This is a ONE-TIME migration
 *   - Make a backup of your Firestore database before running
 *   - Test on a development database first
 *   - Do NOT run this multiple times (it will double-encrypt)
 */

import dotenv from "dotenv";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { db } from "./firebase.js";
import {
  encryptCardSensitiveData,
  getLastFourDigits,
} from "./src/utils/encryption.js";

dotenv.config();

const isAlreadyEncrypted = (value) => {
  // Encrypted values have the format: iv:authTag:encryptedData (3 colon-separated parts)
  return typeof value === "string" && value.split(":").length === 3;
};

const migrateCards = async () => {
  console.log("\n🔄 Starting Card Encryption Migration\n");
  console.log("=" .repeat(70));

  try {
    // Verify encryption key is set
    if (!process.env.CARD_ENCRYPTION_KEY) {
      throw new Error(
        "CARD_ENCRYPTION_KEY not found in environment variables.\n" +
          "Please run: node generate-encryption-key.js"
      );
    }

    console.log("\n✅ Encryption key found");
    console.log("📥 Fetching cards from Firestore...\n");

    const cardsCollection = collection(db, "cards");
    const snapshot = await getDocs(cardsCollection);

    if (snapshot.empty) {
      console.log("⚠️  No cards found in database");
      return;
    }

    console.log(`📊 Found ${snapshot.docs.length} card(s)\n`);

    let encrypted = 0;
    let skipped = 0;
    let errors = 0;

    for (const cardDoc of snapshot.docs) {
      const cardData = cardDoc.data();
      const cardId = cardDoc.id;

      console.log(`\n🔍 Processing card: ${cardId}`);

      // Check if already encrypted
      const metadata = cardData.metaData || {};
      const isEncrypted =
        isAlreadyEncrypted(metadata.cardNumber) ||
        isAlreadyEncrypted(metadata.cardExpiry) ||
        isAlreadyEncrypted(metadata.cardCVV);

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

        // Encrypt the sensitive fields
        const encryptedMetadata = encryptCardSensitiveData(metadata);

        // Get last 4 digits for display
        const lastFour = getLastFourDigits(metadata.cardNumber);

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
            },
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        console.log(`   ✅ Encrypted and saved (last 4 digits: ${lastFour})`);
        encrypted++;
      } catch (error) {
        console.error(`   ❌ Error encrypting card: ${error.message}`);
        errors++;
      }
    }

    console.log("\n" + "=" .repeat(70));
    console.log("\n📊 Migration Summary:\n");
    console.log(`   ✅ Successfully encrypted: ${encrypted}`);
    console.log(`   ⏭️  Skipped (already encrypted): ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total processed: ${snapshot.docs.length}`);
    console.log("\n✨ Migration complete!\n");
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error("\nStack trace:", error.stack);
    process.exit(1);
  }
};

// Run migration
migrateCards()
  .then(() => {
    console.log("✅ Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });

