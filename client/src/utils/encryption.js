/**
 * Client-Side Encryption Utilities
 *
 * Uses Web Crypto API for AES-GCM encryption
 * Compatible with server-side encryption
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 12 bytes recommended for GCM

/**
 * Get encryption key from environment or derive from passphrase
 */
const getEncryptionKey = async () => {
  const keyHex = process.env.REACT_APP_CARD_ENCRYPTION_KEY;

  if (!keyHex) {
    console.warn(
      "⚠️ REACT_APP_CARD_ENCRYPTION_KEY not found. " +
        "Card encryption/decryption will not work. " +
        "Please add the key to your .env file."
    );
    throw new Error(
      "REACT_APP_CARD_ENCRYPTION_KEY not found. " +
        "Please add it to your .env file."
    );
  }

  if (keyHex.length !== 64) {
    console.warn(
      "⚠️ REACT_APP_CARD_ENCRYPTION_KEY should be 64 hex characters (32 bytes). " +
        `Current length: ${keyHex.length}`
    );
  }

  try {
    // Convert hex string to ArrayBuffer
    const keyData = hexToArrayBuffer(keyHex);

    // Import key for Web Crypto API
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: ALGORITHM },
      false,
      ["encrypt", "decrypt"]
    );

    return key;
  } catch (error) {
    console.error("Failed to import encryption key:", error);
    throw new Error(`Failed to import encryption key: ${error.message}`);
  }
};

/**
 * Convert hex string to ArrayBuffer
 */
const hexToArrayBuffer = (hex) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
};

/**
 * Convert ArrayBuffer to hex string
 */
const arrayBufferToHex = (buffer) => {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Encrypt data using AES-GCM
 * @param {string} plaintext - Data to encrypt
 * @returns {Promise<string>} - Encrypted data in format: iv:encryptedData (hex encoded)
 */
export const encrypt = async (plaintext) => {
  if (!plaintext || typeof plaintext !== "string") {
    throw new Error("Plaintext must be a non-empty string");
  }

  try {
    const key = await getEncryptionKey();

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encode plaintext as Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      data
    );

    // Convert to hex and format as iv:encryptedData
    const ivHex = arrayBufferToHex(iv.buffer);
    const encryptedHex = arrayBufferToHex(encryptedBuffer);

    return `${ivHex}:${encryptedHex}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

/**
 * Decrypt data using AES-GCM
 * @param {string} encryptedData - Encrypted data in format: iv:encryptedData
 * @returns {Promise<string>} - Decrypted plaintext
 */
export const decrypt = async (encryptedData) => {
  if (!encryptedData || typeof encryptedData !== "string") {
    throw new Error("Encrypted data must be a non-empty string");
  }

  try {
    const key = await getEncryptionKey();

    // Parse the encrypted data format: iv:encryptedData
    const parts = encryptedData.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = hexToArrayBuffer(parts[0]);
    const encrypted = hexToArrayBuffer(parts[1]);

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encrypted
    );

    // Decode to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

/**
 * Encrypt sensitive card data fields
 * @param {Object} cardData - Card data with sensitive fields
 * @returns {Promise<Object>} - Card data with encrypted sensitive fields
 */
export const encryptCardSensitiveData = async (cardData) => {
  if (!cardData) {
    throw new Error("Card data is required");
  }

  const encrypted = { ...cardData };

  // Encrypt sensitive fields if they exist
  if (cardData.cardNumber) {
    encrypted.cardNumber = await encrypt(cardData.cardNumber);
  }
  if (cardData.cardExpiry) {
    encrypted.cardExpiry = await encrypt(cardData.cardExpiry);
  }
  if (cardData.cardCVV) {
    encrypted.cardCVV = await encrypt(cardData.cardCVV);
  }

  return encrypted;
};

/**
 * Decrypt sensitive card data fields
 * @param {Object} encryptedCardData - Card data with encrypted sensitive fields
 * @returns {Promise<Object>} - Card data with decrypted sensitive fields
 */
export const decryptCardSensitiveData = async (encryptedCardData) => {
  if (!encryptedCardData) {
    throw new Error("Card data is required");
  }

  const decrypted = { ...encryptedCardData };

  // Decrypt each field independently - don't fail if one fails
  // Card Number
  if (
    encryptedCardData.cardNumber &&
    isEncrypted(encryptedCardData.cardNumber)
  ) {
    try {
      decrypted.cardNumber = await decrypt(encryptedCardData.cardNumber);
    } catch (error) {
      console.error("Failed to decrypt cardNumber:", error.message);
      // Keep original encrypted value
    }
  }

  // Card Expiry
  if (
    encryptedCardData.cardExpiry &&
    isEncrypted(encryptedCardData.cardExpiry)
  ) {
    try {
      decrypted.cardExpiry = await decrypt(encryptedCardData.cardExpiry);
    } catch (error) {
      console.error("Failed to decrypt cardExpiry:", error.message);
      // Keep original encrypted value
    }
  }

  // Card CVV
  if (encryptedCardData.cardCVV && isEncrypted(encryptedCardData.cardCVV)) {
    try {
      decrypted.cardCVV = await decrypt(encryptedCardData.cardCVV);
    } catch (error) {
      console.error("Failed to decrypt cardCVV:", error.message);
      // Keep original encrypted value
    }
  }

  return decrypted;
};

/**
 * Check if a value is encrypted
 * @param {string} value - Value to check
 * @returns {boolean}
 */
export const isEncrypted = (value) => {
  return (
    typeof value === "string" &&
    value.includes(":") &&
    value.split(":").length === 2
  );
};

/**
 * Mask card number for display (shows last 4 digits)
 * @param {string} cardNumber - Full card number (can be encrypted or plain)
 * @returns {Promise<string>} - Masked card number (e.g., "**** **** **** 1234")
 */
export const maskCardNumber = async (cardNumber) => {
  if (!cardNumber) return "****";

  try {
    // If encrypted, decrypt first
    let plainNumber = cardNumber;
    if (isEncrypted(cardNumber)) {
      plainNumber = await decrypt(cardNumber);
    }

    const lastFour = plainNumber.slice(-4);
    return `**** **** **** ${lastFour}`;
  } catch (error) {
    console.error("Failed to mask card number:", error);
    return "****";
  }
};

/**
 * Get last 4 digits of card
 * @param {string} cardNumber - Full card number (can be encrypted or plain)
 * @returns {Promise<string>} - Last 4 digits
 */
export const getLastFourDigits = async (cardNumber) => {
  if (!cardNumber) return "";

  try {
    // If encrypted, decrypt first
    let plainNumber = cardNumber;
    if (isEncrypted(cardNumber)) {
      plainNumber = await decrypt(cardNumber);
    }

    return plainNumber.slice(-4);
  } catch (error) {
    console.error("Failed to get last four digits:", error);
    return "";
  }
};

/**
 * Detect card brand from card number
 * @param {string} cardNumber - Card number (can be encrypted or plain)
 * @returns {Promise<string>} - Card brand (Visa, Mastercard, Amex, etc.)
 */
export const detectCardBrand = async (cardNumber) => {
  if (!cardNumber) return "Unknown";

  try {
    // If encrypted, decrypt first
    let plainNumber = cardNumber;
    if (isEncrypted(cardNumber)) {
      plainNumber = await decrypt(cardNumber);
    }

    // Remove spaces and dashes
    plainNumber = plainNumber.replace(/[\s-]/g, "");

    // Detect brand based on first digits
    if (/^4/.test(plainNumber)) return "Visa";
    if (/^5[1-5]/.test(plainNumber)) return "Mastercard";
    if (/^3[47]/.test(plainNumber)) return "Amex";
    if (/^6(?:011|5)/.test(plainNumber)) return "Discover";
    if (/^35/.test(plainNumber)) return "JCB";
    if (/^62/.test(plainNumber)) return "UnionPay";
    if (/^60/.test(plainNumber)) return "RuPay";

    return "Unknown";
  } catch (error) {
    console.error("Failed to detect card brand:", error);
    return "Unknown";
  }
};
