# Client-Side Card Encryption Guide

## Overview

This application uses **client-side encryption** for sensitive card data (card numbers, expiry dates, and CVVs) using the **Web Crypto API** with AES-GCM encryption. All encryption/decryption happens in the browser before data is sent to Firestore.

## 🔐 Security Features

- **Algorithm**: AES-256-GCM (Web Crypto API)
  - 256-bit encryption keys
  - Random initialization vectors (IV) for each encryption
  - Client-side encryption (no sensitive data sent to server unencrypted)
- **What's Encrypted**:
  - Full card numbers
  - Card expiry dates
  - CVV/CVC codes
- **What's NOT Encrypted** (for display):
  - Last 4 digits of card number
  - Card name
  - Bank name
  - Card brand (Visa, Mastercard, etc.)

## 📁 Data Structure

### Card Object in Firestore

```javascript
{
  id: "ICICI_XX9003",
  resourceIdentifier: "card_ICICI_XX9003",
  metaData: {
    cardName: "Saphiro Mastercard",
    bankName: "ICICI",
    cardType: "credit",
    // Encrypted fields (format: iv:encryptedData in hex)
    cardNumber: "a1b2c3d4e5f6...:g7h8i9j0k1l2...",
    cardExpiry: "m3n4o5p6q7r8...:s9t0u1v2w3x4...",
    cardCVV: "y5z6a7b8c9d0...:e1f2g3h4i5j6...",
    // Plain text for display
    lastFourDigits: "9003",
    cardBrand: "Mastercard"
  },
  billingDate: "10",
  dueDate: "30",
  creditLimit: "300000",
  outstanding: "0",
  createdAt: "2024-10-14T10:00:00.000Z"
}
```

## 🚀 Setup Instructions

### Step 1: Generate Encryption Key

You can use the server-side script to generate a key:

```bash
cd server
node generate-encryption-key.js
```

This outputs a 64-character hex string.

### Step 2: Add Key to Client Environment

Add the key to your client `.env` file:

```bash
# client/.env
REACT_APP_CARD_ENCRYPTION_KEY=your_64_character_hex_key_here
```

**⚠️ IMPORTANT**:

- Never commit this key to version control
- Add `.env` to `.gitignore`
- Use different keys for development and production
- Store production keys securely

### Step 3: Restart Development Server

```bash
cd client
npm start
```

## 💻 Usage in Code

### Adding a Card

```javascript
import { addCard } from "./api";

// Plain card data (will be encrypted automatically)
const cardData = {
  cardName: "My Credit Card",
  bankName: "ICICI",
  cardType: "credit",
  cardNumber: "4111111111111111",
  cardExpiry: "12/2025",
  cardCVV: "123",
};

await addCard(cardData);
// Card is automatically encrypted before saving to Firestore
```

### Getting Cards (Display)

```javascript
import { getAllResources } from "./api";

// Get cards with encrypted data (default - safe for display)
const { cards } = await getAllResources();

// Display using lastFourDigits
cards.forEach((card) => {
  console.log(`Card: **** **** **** ${card.metaData.lastFourDigits}`);
  console.log(`Brand: ${card.metaData.cardBrand}`);
});
```

### Getting Cards (Decrypted - Only When Needed)

```javascript
import { getAllResources } from "./api";

// Decrypt cards only when absolutely necessary
const { cards } = await getAllResources(true);

// Now you can access full card numbers
cards.forEach((card) => {
  console.log(`Full number: ${card.metaData.cardNumber}`);
  console.log(`Expiry: ${card.metaData.cardExpiry}`);
  console.log(`CVV: ${card.metaData.cardCVV}`);
});
```

### Updating a Card

```javascript
import { updateCard } from "./api";

// Update non-sensitive fields
await updateCard("ICICI_XX9003", {
  creditLimit: "500000",
  outstanding: "25000",
});

// Update sensitive fields (will be encrypted automatically)
await updateCard("ICICI_XX9003", {
  metaData: {
    cardNumber: "4111111111111111", // Will be encrypted
    cardExpiry: "12/2026", // Will be encrypted
    cardCVV: "456", // Will be encrypted
  },
});
```

### Direct Encryption/Decryption

```javascript
import { encrypt, decrypt, maskCardNumber } from "./utils/encryption";

// Encrypt a value
const encrypted = await encrypt("4111111111111111");
console.log(encrypted); // "iv:encryptedData"

// Decrypt a value
const decrypted = await decrypt(encrypted);
console.log(decrypted); // "4111111111111111"

// Mask card number for display
const masked = await maskCardNumber("4111111111111111");
console.log(masked); // "**** **** **** 1111"
```

## 🔧 Utility Functions

### Available in `utils/encryption.js`

```javascript
// Basic encryption/decryption
encrypt(plaintext); // Returns Promise<string>
decrypt(encryptedData); // Returns Promise<string>

// Card-specific functions
encryptCardSensitiveData(cardData); // Encrypts cardNumber, cardExpiry, cardCVV
decryptCardSensitiveData(cardData); // Decrypts encrypted fields
maskCardNumber(cardNumber); // Returns "**** **** **** 1234"
getLastFourDigits(cardNumber); // Returns "1234"
detectCardBrand(cardNumber); // Returns "Visa", "Mastercard", etc.
isEncrypted(value); // Checks if value is encrypted

// All functions return Promises (use await)
```

## 🛡️ Security Best Practices

### DO ✅

- Store encryption keys in `.env` files (gitignored)
- Use HTTPS for all communication
- Only decrypt data when absolutely necessary
- Clear decrypted data from memory after use
- Use different keys for dev/staging/production
- Implement proper authentication
- Test encryption regularly

### DON'T ❌

- Commit encryption keys to version control
- Log decrypted card data to console in production
- Store decrypted data in localStorage or sessionStorage
- Share keys via email or chat
- Use same key across environments
- Decrypt "just in case"

## 🔄 Migrating Existing Cards

If you have existing cards with plain text data, you need to encrypt them:

### Option 1: Manual Re-add (Recommended for few cards)

1. Note down your card details
2. Delete old cards
3. Add them again (will be encrypted automatically)

### Option 2: Use Browser Console (For many cards)

```javascript
import { getAllResources } from "./api";
import {
  encryptCardSensitiveData,
  getLastFourDigits,
  detectCardBrand,
} from "./utils/encryption";
import { setDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

async function migrateCards() {
  const { cards } = await getAllResources();

  for (const card of cards) {
    // Skip if already encrypted
    if (card.metaData.cardNumber?.includes(":")) {
      console.log(`Skipping ${card.id} - already encrypted`);
      continue;
    }

    // Encrypt sensitive data
    const encrypted = await encryptCardSensitiveData(card.metaData);
    const lastFour = await getLastFourDigits(card.metaData.cardNumber);
    const brand = await detectCardBrand(card.metaData.cardNumber);

    // Update in Firestore
    await setDoc(
      doc(db, "cards", card.id),
      {
        ...card,
        metaData: {
          ...encrypted,
          lastFourDigits: lastFour,
          cardBrand: brand,
        },
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log(`Encrypted ${card.id}`);
  }

  console.log("Migration complete!");
}

// Run migration
migrateCards();
```

## 🐛 Troubleshooting

### Error: "REACT_APP_CARD_ENCRYPTION_KEY not found"

**Solution**: Add the encryption key to `client/.env`

```bash
REACT_APP_CARD_ENCRYPTION_KEY=your_key_here
```

### Cards Not Displaying

**Cause**: Encryption key missing or incorrect

**Solution**:

1. Check `.env` file has correct key
2. Restart development server
3. Clear browser cache
4. Check browser console for errors

### "Decryption failed" Error

**Causes**:

1. Wrong encryption key
2. Data corrupted
3. Key changed after encryption

**Solution**:

- Verify correct key in `.env`
- If key was changed, use old key to decrypt and new key to re-encrypt
- Check browser console for detailed error

### Cards Show Encrypted Data in UI

**Cause**: Using encrypted fields directly instead of `lastFourDigits`

**Solution**: Update your display code to use:

```javascript
// Instead of: card.metaData.cardNumber
// Use:
card.metaData.lastFourDigits; // "9003"
// Or:
await maskCardNumber(card.metaData.cardNumber); // "**** **** **** 9003"
```

## 📊 Performance Considerations

- **Encryption overhead**: ~5-10ms per card operation
- **Storage overhead**: ~2x original size (IV + encrypted data in hex)
- **Browser compatibility**: Requires modern browsers with Web Crypto API support
- **Recommendations**:
  - Batch encrypt/decrypt when possible
  - Don't decrypt unnecessarily
  - Use lastFourDigits for display (no decryption needed)

## 🌐 Browser Compatibility

Web Crypto API is supported in:

- ✅ Chrome 37+
- ✅ Firefox 34+
- ✅ Safari 11+
- ✅ Edge 79+
- ✅ All modern mobile browsers

For IE11 or older browsers, consider using a polyfill or server-side encryption.

## 🔒 Client vs Server Encryption

### Pros of Client-Side Encryption:

- ✅ No server-side processing needed
- ✅ Works directly with Firestore
- ✅ Sensitive data never sent unencrypted to server
- ✅ Simpler architecture

### Cons of Client-Side Encryption:

- ❌ Key must be accessible in client
- ❌ Less secure than server-side key management
- ❌ Can't use server-side encryption for backups
- ❌ Browser requirement (Web Crypto API)

**Best Practice**: For high-security applications, consider moving to server-side encryption with proper key management (AWS KMS, Google Secret Manager, etc.).

## 📚 References

- [Web Crypto API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [SubtleCrypto Interface](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)
- [AES-GCM Encryption](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

## 🆘 Support

If you encounter issues:

1. Check browser console for detailed errors
2. Verify `.env` file has correct key
3. Ensure you've restarted the dev server
4. Test with a fresh browser session
5. Check browser compatibility
