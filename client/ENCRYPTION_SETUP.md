# 🔐 Card Encryption Setup Guide

This guide explains how to set up card encryption for the expense tracker client.

## Why Encryption?

Card numbers, expiry dates, and CVVs are encrypted before being stored in Firebase to protect sensitive data. The client uses AES-GCM encryption via the Web Crypto API.

## Setup Steps

### 1. Generate an Encryption Key

You need a 32-byte (64 hex character) encryption key. Generate one using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This will output something like:
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### 2. Add to Environment Variables

Create a `.env` file in the `client` directory (if it doesn't exist):

```env
# Card Encryption Key (32 bytes = 64 hex characters)
REACT_APP_CARD_ENCRYPTION_KEY=your_64_character_hex_key_here

# Other environment variables...
REACT_APP_API_URL=http://localhost:4000
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_GOOGLE_SHEETS_API_KEY=...
```

**⚠️ Important:** 
- The key must be exactly 64 hex characters
- Keep this key secret - do NOT commit it to version control
- Use the same key on both client and server for consistency

### 3. Restart the Development Server

After adding the key to `.env`:

```bash
npm start
```

## How It Works

### Encryption Format

Encrypted data is stored in the format: `iv:encryptedData`

Example:
```
a1b2c3d4e5f6789012345678:9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d...
```

- **IV (Initialization Vector)**: First 24 hex characters (12 bytes)
- **Encrypted Data**: Remaining hex characters

### Fields That Are Encrypted

- ✅ Card Number
- ✅ Card Expiry (MM/YY or MM/YYYY)
- ✅ Card CVV

### Fields That Are NOT Encrypted

- Card Name (e.g., "Flipkart Axis Bank")
- Card Type (e.g., "Credit", "Platinum")
- Bank Name
- Last 4 Digits (stored separately for display)
- Card Brand (Visa, Mastercard, etc.)

## Troubleshooting

### "REACT_APP_CARD_ENCRYPTION_KEY not found"

**Problem:** The encryption key is not set in your `.env` file.

**Solution:**
1. Generate a key using the command above
2. Add it to your `.env` file
3. Restart the development server

### Card fields showing encrypted strings

**Problem:** Decryption is failing.

**Possible causes:**
1. Encryption key is missing or incorrect
2. Key length is not 64 characters
3. Data was encrypted with a different key

**Solution:**
1. Check browser console for error messages
2. Verify the key is 64 hex characters
3. Ensure you're using the same key that was used to encrypt the data

### Cards showing "MM/YY" or "***" instead of real data

**Problem:** Decryption failed, so fallback values are shown.

**Solution:**
1. Check if `REACT_APP_CARD_ENCRYPTION_KEY` is set
2. Look at browser console for decryption errors
3. Verify the encryption key matches the server key

## Security Best Practices

### ✅ Do:
- Keep encryption keys in `.env` files (never committed)
- Use environment variables for all sensitive keys
- Generate strong random keys (32 bytes minimum)
- Use the same key on client and server
- Rotate keys periodically

### ❌ Don't:
- Commit `.env` files to version control
- Share encryption keys in plain text
- Use weak or predictable keys
- Store keys in the codebase
- Use different keys for client and server

## Key Rotation

If you need to change the encryption key:

1. **Decrypt all existing data** with the old key
2. **Update the key** in `.env`
3. **Re-encrypt all data** with the new key
4. **Update both client and server** keys simultaneously

**Note:** Key rotation requires a migration script to re-encrypt existing data.

## Development vs Production

### Development
- Use a local `.env` file
- Key can be simpler (but still secure)
- Test encryption/decryption flows

### Production
- Use environment variables from hosting platform
- Use a strong, randomly generated key
- Never expose keys in logs or error messages
- Consider using a key management service (KMS)

## Testing Encryption

You can test if encryption is working by:

1. Open browser console
2. Check for any encryption warnings or errors
3. Add a new card and verify it's encrypted in Firebase
4. Verify cards display correctly without showing encrypted strings

Example console output when working correctly:
```
✅ Card data encrypted successfully
✅ Card data decrypted successfully
```

Example console output when key is missing:
```
⚠️ REACT_APP_CARD_ENCRYPTION_KEY not found. Please add it to your .env file.
```

## Need Help?

If you're still having issues:

1. Check browser console for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure you restarted the dev server after changing `.env`
4. Check that the key format is correct (64 hex characters)

