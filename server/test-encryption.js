/**
 * Test Encryption Utilities
 * 
 * This script tests the encryption/decryption functions to ensure they work correctly.
 * 
 * Prerequisites:
 *   1. Set CARD_ENCRYPTION_KEY in your .env file
 * 
 * Usage:
 *   node test-encryption.js
 */

import dotenv from "dotenv";
import {
  encrypt,
  decrypt,
  encryptCardSensitiveData,
  decryptCardSensitiveData,
  maskCardNumber,
  getLastFourDigits,
} from "./src/utils/encryption.js";

dotenv.config();

const runTests = () => {
  console.log("\n🧪 Testing Encryption Utilities\n");
  console.log("=" .repeat(70));

  try {
    // Test 1: Basic encryption/decryption
    console.log("\n1️⃣  Test: Basic Encryption/Decryption");
    const testData = "4111111111111111";
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    
    console.log(`   Original: ${testData}`);
    console.log(`   Encrypted: ${encrypted.substring(0, 50)}...`);
    console.log(`   Decrypted: ${decrypted}`);
    console.log(`   ✅ ${decrypted === testData ? "PASS" : "FAIL"}`);

    // Test 2: Card metadata encryption
    console.log("\n2️⃣  Test: Card Metadata Encryption");
    const cardData = {
      cardName: "Test Card",
      bankName: "Test Bank",
      cardType: "credit",
      cardNumber: "4111111111111111",
      cardExpiry: "12/2025",
      cardCVV: "123",
    };

    const encryptedCard = encryptCardSensitiveData(cardData);
    console.log(`   Original Card Number: ${cardData.cardNumber}`);
    console.log(`   Encrypted Card Number: ${encryptedCard.cardNumber.substring(0, 50)}...`);
    console.log(`   Original Expiry: ${cardData.cardExpiry}`);
    console.log(`   Encrypted Expiry: ${encryptedCard.cardExpiry.substring(0, 50)}...`);
    console.log(`   Original CVV: ${cardData.cardCVV}`);
    console.log(`   Encrypted CVV: ${encryptedCard.cardCVV.substring(0, 50)}...`);

    // Test 3: Card metadata decryption
    console.log("\n3️⃣  Test: Card Metadata Decryption");
    const decryptedCard = decryptCardSensitiveData(encryptedCard);
    console.log(`   Decrypted Card Number: ${decryptedCard.cardNumber}`);
    console.log(`   Decrypted Expiry: ${decryptedCard.cardExpiry}`);
    console.log(`   Decrypted CVV: ${decryptedCard.cardCVV}`);
    
    const allMatch =
      decryptedCard.cardNumber === cardData.cardNumber &&
      decryptedCard.cardExpiry === cardData.cardExpiry &&
      decryptedCard.cardCVV === cardData.cardCVV;
    console.log(`   ✅ ${allMatch ? "PASS" : "FAIL"}`);

    // Test 4: Masking
    console.log("\n4️⃣  Test: Card Number Masking");
    const masked = maskCardNumber(cardData.cardNumber);
    console.log(`   Original: ${cardData.cardNumber}`);
    console.log(`   Masked: ${masked}`);
    console.log(`   ✅ ${masked === "**** **** **** 1111" ? "PASS" : "FAIL"}`);

    // Test 5: Last 4 digits
    console.log("\n5️⃣  Test: Get Last 4 Digits");
    const lastFour = getLastFourDigits(cardData.cardNumber);
    console.log(`   Original: ${cardData.cardNumber}`);
    console.log(`   Last 4: ${lastFour}`);
    console.log(`   ✅ ${lastFour === "1111" ? "PASS" : "FAIL"}`);

    // Test 6: Masking encrypted data
    console.log("\n6️⃣  Test: Mask Encrypted Card Number");
    const maskedEncrypted = maskCardNumber(encryptedCard.cardNumber);
    console.log(`   Encrypted: ${encryptedCard.cardNumber.substring(0, 50)}...`);
    console.log(`   Masked: ${maskedEncrypted}`);
    console.log(`   ✅ ${maskedEncrypted === "**** **** **** 1111" ? "PASS" : "FAIL"}`);

    console.log("\n" + "=" .repeat(70));
    console.log("\n✅ All tests completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("\nStack trace:", error.stack);
    process.exit(1);
  }
};

// Run tests
runTests();

