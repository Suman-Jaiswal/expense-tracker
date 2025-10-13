# 🚀 Quick Start: Statement Sync with Transaction Extraction

## ✅ What's Ready

- ✅ Transaction extraction engine (AXIS & ICICI)
- ✅ Integration with statement sync
- ✅ Database format verified
- ✅ Test outputs confirmed

---

## 🔧 Start Server & Authenticate

### 1. Delete Expired Token

```bash
rm server/token.json
```

### 2. Start Server

```bash
cd server
npm start
```

### 3. Authorize Google OAuth

- Server will display a URL
- Copy and open in browser
- Authorize Gmail & Drive access
- Server will save `token.json`

---

## 🔄 Run Statement Sync

### Trigger Sync

```bash
curl http://localhost:4000/sync-statements
```

### Expected Console Output

```
Starting statement synchronization...
Total Statement Emails: 2

Processing email: Flipkart Axis Bank Credit Card Statement...
📄 Reading PDF: /tmp/statement.pdf
🏦 Detected bank: AXIS
✅ Extracted 2 transactions from AXIS statement
💾 Formatted 2 transactions for database
✅ PDF uploaded to Drive: card_AXIS_XX2376_xxx.pdf
✅ Statement processed and saved
💾 Saving 2 transactions to database...
Transaction added with id: txn_xxx_0
Transaction added with id: txn_xxx_1
✅ Successfully saved 2 transactions

Processing email: ICICI Credit Card Statement...
📄 Reading PDF: /tmp/statement.pdf
🏦 Detected bank: ICICI
✅ Extracted 6 transactions from ICICI statement
💾 Formatted 6 transactions for database
✅ PDF uploaded to Drive: card_ICICI_9003_xxx.pdf
✅ Statement processed and saved
💾 Saving 6 transactions to database...
Transaction added with id: txn_xxx_0
...
✅ Successfully saved 6 transactions
```

---

## 📊 What Gets Saved to Firebase

### Statements Collection

```javascript
{
  id: "gmail_message_id",
  resourceIdentifier: "card_AXIS_XX2376",
  driveFileId: "google_drive_file_id",
  driveFileWebViewLink: "https://drive.google.com/...",
  driveFileWebContentLink: "https://drive.google.com/...",
  period: {
    start: "2025-08-12",
    end: "2025-09-12"
  },
  statementData: { ... }
}
```

### Transactions Collection

```javascript
{
  id: "txn_1760310699019_0",
  resourceIdentifier: "card_AXIS_XX2376",
  statementId: "gmail_message_id",
  date: "2025-08-04",
  description: "FLIPKART,BANGLORE",
  merchant: "FLIPKART,BANGLORE",
  amount: 192,
  type: "debit",
  category: "Shopping",
  createdAt: "2025-10-12T23:11:39.020Z",
  updatedAt: "2025-10-12T23:11:39.020Z"
}
```

---

## 🧪 Test Without OAuth

If you want to test extraction without running full sync:

```bash
cd server
node src/services/transactions/testExtractor.js \
  "../temp/Card Axis XX2376 Aug 12 to Sep 12 2025.pdf" \
  SUMA0709 \
  card_AXIS_XX2376 \
  stmt_2025_08
```

This will:

- Extract all transactions
- Show database format
- Save JSON files
- No Firebase/OAuth needed

---

## 📋 Supported Banks

| Bank       | Status     | Tested          |
| ---------- | ---------- | --------------- |
| AXIS Bank  | ✅ Working | ✅ Yes (2 txns) |
| ICICI Bank | ✅ Working | ✅ Yes (6 txns) |
| HDFC Bank  | ⚠️ Generic | ❌ Not yet      |
| SBI        | ⚠️ Generic | ❌ Not yet      |

---

## 🎯 Workflow Summary

```
1. Gmail API → Fetch statement emails
2. Download → PDF attachments
3. Decrypt → Using configured passwords
4. Upload → Google Drive (public link)
5. Extract → Transactions from PDF ⭐ NEW
6. Save → Statement to Firebase
7. Save → Transactions to Firebase ⭐ NEW
```

---

## 🔍 Check Results

### In Firebase Console

1. Go to Firestore Database
2. Check `statements` collection - statement metadata
3. Check `transactions` collection - all transactions

### In Your App

- Dashboard will show extracted transactions
- Linked to correct credit cards
- Auto-categorized
- Ready for analytics

---

## 🐛 Troubleshooting

### "invalid_grant" Error

- Token expired
- Solution: `rm server/token.json` and re-authenticate

### "No transactions found"

- PDF format not recognized
- Check console for bank detection
- Verify PDF can be decrypted

### Transaction Amounts Wrong

- Pattern matching issue
- Check `rawText` field in output
- May need pattern adjustment

---

## 📚 Documentation

- `TRANSACTION_EXTRACTION_GUIDE.md` - Full API & CLI docs
- `TRANSACTION_EXTRACTION_INTEGRATION.md` - Integration details
- Test outputs in `temp/` folder

---

## ✨ Key Features

- ✅ **Zero Manual Entry** - All transactions auto-extracted
- ✅ **Multi-Bank** - AXIS & ICICI supported
- ✅ **Smart Categories** - 10+ auto-categories
- ✅ **Accurate Parsing** - Dates, amounts, merchants
- ✅ **Firebase Ready** - Direct database insertion
- ✅ **Error Tolerant** - Continues on extraction failures

---

## 🎉 You're All Set!

Everything is configured and tested. Just authenticate with Google and run the sync!
