/**
 * Generate Encryption Key
 * 
 * This script generates a secure 256-bit encryption key for encrypting sensitive card data.
 * 
 * Usage:
 *   node generate-encryption-key.js
 * 
 * Output:
 *   A 64-character hex string that should be stored in your .env file as CARD_ENCRYPTION_KEY
 * 
 * IMPORTANT SECURITY NOTES:
 * 1. Store this key securely and NEVER commit it to version control
 * 2. Use environment variables or a secrets manager (AWS Secrets Manager, Google Secret Manager, etc.)
 * 3. If you lose this key, you will NOT be able to decrypt existing card data
 * 4. In production, consider using a Key Management Service (KMS)
 * 5. Rotate keys periodically and re-encrypt data with the new key
 */

import { generateEncryptionKey } from "./src/utils/encryption.js";

console.log("\n🔐 Generating 256-bit AES Encryption Key\n");
console.log("=" .repeat(70));

const key = generateEncryptionKey();

console.log("\n✅ Encryption Key Generated Successfully!\n");
console.log("Key (hex format):");
console.log("-" .repeat(70));
console.log(key);
console.log("-" .repeat(70));

console.log("\n📝 Add this to your .env file:\n");
console.log(`CARD_ENCRYPTION_KEY=${key}`);

console.log("\n⚠️  SECURITY WARNINGS:\n");
console.log("  1. Store this key securely");
console.log("  2. NEVER commit this to version control");
console.log("  3. If you lose this key, you cannot decrypt existing data");
console.log("  4. Use a secrets manager in production (AWS, GCP, Azure, etc.)");
console.log("  5. Rotate keys periodically for better security");
console.log("\n");

