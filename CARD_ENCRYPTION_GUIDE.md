# Card Data Encryption Implementation Guide

## Overview

This application now encrypts sensitive card data (card numbers, expiry dates, and CVVs) using **AES-256-GCM** encryption with authentication tags. This ensures that sensitive information is protected both at rest (in Firestore) and in transit.

## 🔐 Security Features

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
  - 256-bit encryption keys
  - Authentication tags for data integrity
  - Random initialization vectors (IV) for each encryption
- **What's Encrypted**:
  - Full card numbers
  - Card expiry dates
  - CVV/CVC codes
- **What's NOT Encrypted** (for display purposes):
  - Last 4 digits of card number
  - Card name
  - Bank name
  - Card brand (Visa, Mastercard, etc.)

## 📁 Updated Data Structure

### Encrypted Card Object
```javascript
{
  id: "ICICI_XX9003",
  resourceIdentifier: "card_ICICI_XX9003",
  metaData: {
    cardName: "Saphiro Mastercard",
    bankName: "ICICI",
    cardType: "credit",
    // Encrypted fields (format: iv:authTag:encryptedData)
    cardNumber: "a1b2c3d4...:e5f6g7h8...:i9j0k1l2...",
    cardExpiry: "m3n4o5p6...:q7r8s9t0...:u1v2w3x4...",
    cardCVV: "y5z6a7b8...:c9d0e1f2...:g3h4i5j6...",
    // Plain text for display
    lastFourDigits: "9003",
    cardBrand: "Mastercard"
  },
  billingDate: "10",
  dueDate: "30",
  creditLimit: "300000",
  outstanding: "0",
  createdAt: "2024-10-14T10:00:00.000Z",
  updatedAt: "2024-10-14T10:00:00.000Z"
}
```

## 🚀 Setup Instructions

### Step 1: Generate Encryption Key

Generate a secure 256-bit encryption key:

```bash
cd server
node generate-encryption-key.js
```

This will output a 64-character hex string. **Copy this key!**

### Step 2: Add Key to Environment Variables

Add the generated key to your `.env` file:

```bash
# .env
CARD_ENCRYPTION_KEY=your_64_character_hex_key_here
```

**⚠️ IMPORTANT**: 
- Never commit this key to version control
- Add `.env` to your `.gitignore`
- Store the key securely (use a password manager or secrets manager in production)

### Step 3: Test Encryption

Verify that encryption is working correctly:

```bash
node test-encryption.js
```

You should see all tests pass with green checkmarks.

### Step 4: Migrate Existing Cards (One-Time)

If you have existing cards with plain text data, encrypt them:

```bash
# IMPORTANT: Backup your Firestore database first!
node migrate-encrypt-cards.js
```

**⚠️ WARNING**: 
- This is a ONE-TIME migration
- Make a backup before running
- Do NOT run multiple times (it will double-encrypt)
- Test on development database first

## 📡 API Endpoints

### Get All Cards
```bash
# Get cards with encrypted data (default)
GET /api/cards

# Get cards with decrypted data
GET /api/cards?decrypt=true
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "ICICI_XX9003",
      "metaData": {
        "cardName": "Saphiro Mastercard",
        "cardNumber": "encrypted...",
        "lastFourDigits": "9003"
      }
    }
  ],
  "count": 5,
  "encrypted": true,
  "timestamp": "2024-10-14T10:00:00.000Z"
}
```

### Get Single Card
```bash
# Get card with encrypted data (default)
GET /api/cards/ICICI_XX9003

# Get card with decrypted data
GET /api/cards/ICICI_XX9003?decrypt=true
```

## 💻 Usage in Code

### Backend Usage

```javascript
import { getAllCards, getCard, updateCard } from './repository/cards.js';

// Get encrypted cards (default - safe for display)
const cards = await getAllCards();
console.log(cards[0].metaData.lastFourDigits); // "9003"

// Get decrypted cards (only when needed)
const decryptedCards = await getAllCards(true);
console.log(decryptedCards[0].metaData.cardNumber); // "4111111111111111"

// Update card (automatically encrypts sensitive data)
await updateCard("ICICI_XX9003", {
  metaData: {
    cardNumber: "4111111111111111", // Will be encrypted
    cardExpiry: "12/2025",          // Will be encrypted
    cardCVV: "123"                   // Will be encrypted
  }
});
```

### Frontend Usage

```javascript
// Fetch cards (encrypted by default)
const response = await fetch('/api/cards');
const { data } = await response.json();

// Display using lastFourDigits
data.forEach(card => {
  console.log(`Card: **** **** **** ${card.metaData.lastFourDigits}`);
});

// Only decrypt when absolutely necessary (e.g., for payment processing)
const decryptedResponse = await fetch('/api/cards/ICICI_XX9003?decrypt=true');
const { data: decryptedCard } = await decryptedResponse.json();
// Use decrypted data carefully and never store in frontend state
```

## 🔧 Utility Functions

### Encryption/Decryption
```javascript
import { encrypt, decrypt } from './utils/encryption.js';

// Encrypt data
const encrypted = encrypt("4111111111111111");

// Decrypt data
const decrypted = decrypt(encrypted);
```

### Card-Specific Functions
```javascript
import {
  encryptCardSensitiveData,
  decryptCardSensitiveData,
  maskCardNumber,
  getLastFourDigits
} from './utils/encryption.js';

// Encrypt all sensitive card fields
const encrypted = encryptCardSensitiveData({
  cardNumber: "4111111111111111",
  cardExpiry: "12/2025",
  cardCVV: "123"
});

// Decrypt all sensitive card fields
const decrypted = decryptCardSensitiveData(encrypted);

// Mask card number for display
const masked = maskCardNumber("4111111111111111");
// Returns: "**** **** **** 1111"

// Get last 4 digits
const lastFour = getLastFourDigits("4111111111111111");
// Returns: "1111"
```

## 🔐 Best Practices

### 1. Key Management
- **Development**: Store in `.env` file (gitignored)
- **Production**: Use a secrets manager:
  - AWS Secrets Manager
  - Google Cloud Secret Manager
  - Azure Key Vault
  - HashiCorp Vault

### 2. Key Rotation
- Rotate encryption keys periodically (e.g., every 90 days)
- When rotating:
  1. Generate new key
  2. Decrypt all data with old key
  3. Re-encrypt with new key
  4. Update environment variable

### 3. Access Control
- Only decrypt data when absolutely necessary
- Never log decrypted card data
- Never send decrypted data to frontend unnecessarily
- Use `decrypt=true` parameter sparingly

### 4. Monitoring
- Monitor failed decryption attempts
- Alert on suspicious access patterns
- Audit who accesses decrypted data

### 5. Backup Strategy
- Back up encrypted data regularly
- Store backup encryption keys separately
- Test restore procedures

## 🚨 Security Considerations

### DO ✅
- Store encryption keys in secure secrets managers
- Use HTTPS/TLS for all API communication
- Implement proper authentication and authorization
- Log access to decrypted data
- Regularly audit security practices
- Test encryption/decryption regularly

### DON'T ❌
- Commit encryption keys to version control
- Log decrypted sensitive data
- Store decrypted data in frontend state
- Share encryption keys via email/chat
- Use the same key across environments
- Decrypt data "just in case"

## 🐛 Troubleshooting

### Error: "CARD_ENCRYPTION_KEY not found"
**Solution**: Add the encryption key to your `.env` file
```bash
node generate-encryption-key.js
# Copy the output to .env
```

### Error: "Encryption key must be 32 bytes"
**Solution**: Generate a new key using the provided script
```bash
node generate-encryption-key.js
```

### Error: "Decryption failed"
**Causes**:
1. Wrong encryption key
2. Data corrupted
3. Data not actually encrypted

**Solution**: 
- Verify correct key in `.env`
- Check if data is in correct format (iv:authTag:encryptedData)
- Re-run migration if needed

### Cards showing as already encrypted
**Solution**: This is normal after migration. Don't run migration again.

## 📊 Performance Considerations

- **Encryption overhead**: Minimal (~1-2ms per operation)
- **Storage overhead**: ~3x original size due to IV, auth tag, and base64 encoding
- **Recommendation**: 
  - Don't decrypt data unnecessarily
  - Cache decrypted data temporarily in memory (not in database)
  - Use batch operations when possible

## 🔄 Migration Checklist

- [ ] Backup Firestore database
- [ ] Generate encryption key
- [ ] Add key to `.env` file
- [ ] Run encryption tests
- [ ] Test on development database
- [ ] Run migration on development
- [ ] Verify encrypted data
- [ ] Test application functionality
- [ ] Run migration on production
- [ ] Verify production data
- [ ] Update monitoring/alerting
- [ ] Document key location for team

## 📚 References

- [AES-GCM Encryption](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Run `node test-encryption.js` to verify setup
3. Review server logs for error details
4. Check Firestore for data integrity

