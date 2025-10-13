# Troubleshooting: Transaction Review Modal Not Showing

## The Setup

The transaction review modal should automatically open when you click "Sync Transactions" IF there are ambiguous transactions that need manual review.

## How to Test

### 1. **Make sure the backend server is running**

```bash
cd server
node index.js
```

### 2. **Click "Sync Transactions" button**

- You can find this button on:
  - Dashboard page
  - Transactions page

### 3. **Check browser console**

You should see logs like:

```
Sync result: { success: true, message: "...", ambiguousTransactions: [...], needsReview: true }
```

If you see:

```
Opening review modal with X ambiguous transactions
```

Then the modal should open.

If you see:

```
No ambiguous transactions, refreshing list
```

Then there are no ambiguous transactions to review.

## Why the Modal Might Not Show

### A. No Ambiguous Transactions

The modal only shows when there are SBI transactions with concatenated amounts (e.g., `000PP015122BX5RR0XO887815,199.37C`).

**To verify:**

- Check if you have SBI statements synced
- Check if those statements have transactions with concatenated amounts
- Look at the backend console logs during sync

### B. Backend Not Returning Ambiguous Transactions

Check the backend response in browser console:

```javascript
// Should have these fields:
{
  success: true,
  ambiguousTransactions: [...],  // Array of transactions
  needsReview: true,              // Boolean flag
  stats: {
    ambiguousCount: 3             // Number > 0
  }
}
```

### C. Server Needs Restart

If you recently made changes to the backend code, restart the server:

```bash
# In server directory
# Stop the server (Ctrl+C)
# Start it again
node index.js
```

## Testing with Sample Data

Currently, the system detects ambiguous transactions in SBI statements where:

- Transaction ID digits are concatenated with the amount
- Example: `02 May 25PAYMENT RECEIVED 000PP015122BX5RR0XO887815,199.37C`
  - The `887815` before the amount creates ambiguity

To test:

1. Make sure you have SBI statements synced
2. The May 2025 SBI statement had such transactions
3. Delete those transactions from Firebase
4. Click "Sync Transactions"
5. The modal should open

## Manual Test

Open browser console and run:

```javascript
// This will test if the modal opens
setReviewModalVisible(true);
```

If the modal doesn't open, check:

- TransactionReviewModal component is imported
- Modal dependencies (antd Modal, Form, etc.) are installed

## What Should Happen

When ambiguous transactions are found:

1. ✅ Toast shows: "Transaction sync completed. X transaction(s) need manual review."
2. ✅ Console log: "Opening review modal with X ambiguous transactions"
3. ✅ Modal opens showing the first ambiguous transaction
4. ✅ You can review, edit amount, and save or skip each one

## Current Status

**All Code is Implemented:**

- ✅ Backend extracts ambiguous transactions
- ✅ Backend returns them in API response
- ✅ Frontend receives the data
- ✅ Frontend opens modal when `needsReview: true`
- ✅ Modal component exists and is functional

**Next Step:**
Check browser console when you click "Sync Transactions" to see what's being logged!
