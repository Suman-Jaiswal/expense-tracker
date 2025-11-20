import crypto from "crypto";

/**
 * Encryption utility for sensitive card data
 * Uses AES-256-GCM for encryption with authentication
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 16 bytes for AES
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 * In production, this should be stored securely (e.g., AWS Secrets Manager, Google Secret Manager)
 */
const getEncryptionKey = () => {
  const key = process.env.CARD_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error(
      "CARD_ENCRYPTION_KEY not found in environment variables. " +
      "Please set a 32-byte (256-bit) encryption key."
    );
  }

  // Ensure key is exactly 32 bytes
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(
      `Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters). ` +
      `Current length: ${keyBuffer.length} bytes`
    );
  }

  return keyBuffer;
};

/**
 * Encrypt sensitive data
 * @param {string} plaintext - The data to encrypt
 * @returns {string} - Encrypted data in format: iv:authTag:encryptedData (all hex encoded)
 */
export const encrypt = (plaintext) => {
  if (!plaintext || typeof plaintext !== "string") {
    throw new Error("Plaintext must be a non-empty string");
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag();
    
    // Return format: iv:authTag:encryptedData (all hex encoded)
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - The encrypted data in format: iv:authTag:encryptedData
 * @returns {string} - Decrypted plaintext
 */
export const decrypt = (encryptedData) => {
  if (!encryptedData || typeof encryptedData !== "string") {
    throw new Error("Encrypted data must be a non-empty string");
  }

  try {
    const key = getEncryptionKey();
    
    // Parse the encrypted data format: iv:authTag:encryptedData
    const parts = encryptedData.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }
    
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

/**
 * Encrypt sensitive card data fields
 * @param {Object} cardData - Card data with sensitive fields
 * @returns {Object} - Card data with encrypted sensitive fields
 */
export const encryptCardSensitiveData = (cardData) => {
  if (!cardData) {
    throw new Error("Card data is required");
  }

  const encrypted = { ...cardData };

  // Encrypt sensitive fields if they exist
  if (cardData.cardNumber) {
    encrypted.cardNumber = encrypt(cardData.cardNumber);
  }
  if (cardData.cardExpiry) {
    encrypted.cardExpiry = encrypt(cardData.cardExpiry);
  }
  if (cardData.cardCVV) {
    encrypted.cardCVV = encrypt(cardData.cardCVV);
  }

  return encrypted;
};

/**
 * Decrypt sensitive card data fields
 * @param {Object} encryptedCardData - Card data with encrypted sensitive fields
 * @returns {Object} - Card data with decrypted sensitive fields
 */
export const decryptCardSensitiveData = (encryptedCardData) => {
  if (!encryptedCardData) {
    throw new Error("Card data is required");
  }

  const decrypted = { ...encryptedCardData };

  // Decrypt sensitive fields if they exist
  try {
    if (encryptedCardData.cardNumber) {
      decrypted.cardNumber = decrypt(encryptedCardData.cardNumber);
    }
    if (encryptedCardData.cardExpiry) {
      decrypted.cardExpiry = decrypt(encryptedCardData.cardExpiry);
    }
    if (encryptedCardData.cardCVV) {
      decrypted.cardCVV = decrypt(encryptedCardData.cardCVV);
    }
  } catch (error) {
    console.error("Failed to decrypt card data:", error.message);
    // You may want to handle this differently based on your requirements
    throw new Error("Failed to decrypt sensitive card data");
  }

  return decrypted;
};

/**
 * Generate a new encryption key
 * This should be run once and stored securely
 * @returns {string} - Hex-encoded 256-bit key
 */
export const generateEncryptionKey = () => {
  return crypto.randomBytes(KEY_LENGTH).toString("hex");
};

/**
 * Mask card number for display (shows last 4 digits)
 * @param {string} cardNumber - Full card number (can be encrypted or plain)
 * @returns {string} - Masked card number (e.g., "**** **** **** 1234")
 */
export const maskCardNumber = (cardNumber) => {
  if (!cardNumber) return "****";
  
  // If it looks encrypted (contains colons), try to decrypt it first
  if (cardNumber.includes(":")) {
    try {
      cardNumber = decrypt(cardNumber);
    } catch (error) {
      return "****";
    }
  }
  
  const lastFour = cardNumber.slice(-4);
  return `**** **** **** ${lastFour}`;
};

/**
 * Get last 4 digits of card
 * @param {string} cardNumber - Full card number (can be encrypted or plain)
 * @returns {string} - Last 4 digits
 */
export const getLastFourDigits = (cardNumber) => {
  if (!cardNumber) return "";
  
  // If it looks encrypted, try to decrypt it first
  if (cardNumber.includes(":")) {
    try {
      cardNumber = decrypt(cardNumber);
    } catch (error) {
      return "";
    }
  }
  
  return cardNumber.slice(-4);
};

