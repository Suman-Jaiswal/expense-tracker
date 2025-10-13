# Ambiguous Transactions - Complete Implementation Plan

## Overview

Implement comprehensive ambiguous transaction detection, storage, and editing for all banks.

## Goals

1. ✅ Detect ambiguous transactions for ALL banks (AXIS, ICICI, SBI)
2. ✅ Add `isAmbiguous` field to transaction schema
3. ✅ Save ambiguous transactions to Firebase with flag
4. ✅ Show them in review modal during sync for immediate fixing
5. ✅ Add inline editing in transaction table
6. ✅ Visual indicator for ambiguous transactions

---

## Phase 1: Backend Changes

### 1.1 Transaction Schema Update

**File**: All transaction objects

Add new field:

```javascript
{
  ...existingFields,
  isAmbiguous: boolean,        // Flag for ambiguous amount
  ambiguousReason: string,      // Why it's ambiguous
  suggestedAmount: number,      // Best guess amount
}
```

### 1.2 Ambiguous Detection Logic

#### AXIS Bank Ambiguity Patterns:

- Multiple amounts in single line (main + cashback)
- Category text bleeding into amount
- Missing spaces between description and amount
- Example: `FLIPKARTDEPT STORES19200 Dr` vs `FLIPKART DEPT STORES 192.00 Dr`

#### ICICI Bank Ambiguity Patterns:

- Reference number without clear delimiter
- Amount missing decimal or spaces
- Description bleeding into amount
- Example: `07/08/202512345678901AMAZON15000` vs `07/08/2025 12345678901 AMAZON 150.00`

#### SBI Bank Ambiguity Patterns (already done):

- ✅ Concatenated transaction ID with amount
- ✅ Example: `PAYMENT RECEIVED 000PP015122BX5RR0XO887815,199.37C`

### 1.3 Extractor Functions Update

**File**: `server/src/services/transactions/transactionExtractor.js`

Update all extract functions to return:

```javascript
return {
  transactions: [...],          // Clean transactions
  ambiguousTransactions: [...], // Need review
};
```

Each ambiguous transaction includes:

```javascript
{
  date,
  rawLine,
  description,
  suggestedAmount,
  type,
  reason: 'concatenated_amount' | 'missing_decimal' | 'multiple_amounts',
  category,
  isAmbiguous: true,
}
```

### 1.4 Sync Process Update

**File**: `server/src/services/transactions/syncTransactions.js`

**Current**: Skip ambiguous transactions
**New**: Save them with `isAmbiguous: true` flag

```javascript
// Save regular transactions
await addMultipleTransactions(cleanTransactions);

// Save ambiguous transactions with flag
const ambiguousWithFlag = ambiguousTransactions.map(txn => ({
  ...txn,
  id: generateId(...),
  isAmbiguous: true,
  needsReview: true,
}));
await addMultipleTransactions(ambiguousWithFlag);

// Return both for review modal
return {
  success: true,
  stats: {
    totalTransactions: cleanTransactions.length,
    ambiguousCount: ambiguousTransactions.length,
  },
  ambiguousTransactions, // For immediate review in modal
  needsReview: ambiguousTransactions.length > 0,
};
```

---

## Phase 2: Frontend Changes

### 2.1 Transaction Table Enhancement

**File**: `client/src/components/TransactionList.jsx`

#### Add Visual Indicators:

```jsx
{
  title: "Amount",
  dataIndex: "amount",
  render: (amount, record) => (
    <Space>
      {record.isAmbiguous && (
        <Tooltip title="Amount needs verification">
          <WarningOutlined style={{ color: '#faad14' }} />
        </Tooltip>
      )}
      <Text type={record.isAmbiguous ? "warning" : undefined}>
        ₹{amount.toLocaleString('en-IN')}
      </Text>
    </Space>
  ),
}
```

#### Add Inline Editing:

```jsx
const [editingKey, setEditingKey] = useState("");
const [form] = Form.useForm();

const isEditing = (record) => record.id === editingKey;

const edit = (record) => {
  form.setFieldsValue({
    amount: record.amount,
    description: record.description,
    category: record.category,
    ...record,
  });
  setEditingKey(record.id);
};

const cancel = () => {
  setEditingKey("");
};

const save = async (id) => {
  try {
    const row = await form.validateFields();
    await updateTransaction(id, { ...row, isAmbiguous: false });
    setEditingKey("");
    toast.success("Transaction updated");
    fetchTransactions();
  } catch (error) {
    toast.error("Failed to update transaction");
  }
};
```

#### Table Columns with Editing:

```jsx
{
  title: "Amount",
  dataIndex: "amount",
  editable: true,
  render: (amount, record) => {
    if (isEditing(record)) {
      return (
        <Form.Item
          name="amount"
          style={{ margin: 0 }}
          rules={[{ required: true }]}
        >
          <InputNumber precision={2} style={{ width: '100%' }} />
        </Form.Item>
      );
    }
    return (
      <Space>
        {record.isAmbiguous && <WarningOutlined style={{ color: '#faad14' }} />}
        <Text>{formatCurrency(amount)}</Text>
      </Space>
    );
  },
}
```

#### Actions Column:

```jsx
{
  title: "Actions",
  render: (_, record) => {
    const editable = isEditing(record);
    return editable ? (
      <Space>
        <Button type="link" onClick={() => save(record.id)}>
          Save
        </Button>
        <Button type="link" onClick={cancel}>
          Cancel
        </Button>
      </Space>
    ) : (
      <Space>
        <Button
          type="link"
          disabled={editingKey !== ''}
          onClick={() => edit(record)}
          icon={<EditOutlined />}
        />
        {record.isAmbiguous && (
          <Tooltip title="Needs verification">
            <WarningOutlined style={{ color: '#faad14' }} />
          </Tooltip>
        )}
      </Space>
    );
  },
}
```

### 2.2 Review Modal Enhancement

**File**: `client/src/components/TransactionReviewModal.jsx`

Update to handle both:

1. **New ambiguous transactions** (from sync)
2. **Existing ambiguous transactions** (from DB)

```jsx
const handleSubmit = async (values) => {
  const transaction = currentTransaction;

  if (transaction.id) {
    // Update existing transaction
    await updateTransaction(transaction.id, {
      ...values,
      isAmbiguous: false,
      reviewedAt: new Date().toISOString(),
    });
  } else {
    // Add new transaction
    await addManualTransaction({
      ...transaction,
      ...values,
      isAmbiguous: false,
    });
  }

  // Move to next
  if (isLastTransaction) {
    onComplete();
  } else {
    setCurrentIndex(currentIndex + 1);
  }
};
```

### 2.3 New API Endpoints

**File**: `client/src/api/index.js`

```javascript
// Update existing transaction
export const updateTransaction = async (id, updates) => {
  const response = await fetch(`${API_BASE_URL}/api/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return response.json();
};

// Get ambiguous transactions
export const getAmbiguousTransactions = async () => {
  const response = await fetch(`${API_BASE_URL}/api/transactions/ambiguous`);
  return response.json();
};
```

### 2.4 Backend API Endpoints

**File**: `server/server.js`

```javascript
// Update transaction
app.patch("/api/transactions/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  await updateTransaction(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  res.json({ success: true, message: "Transaction updated" });
});

// Get ambiguous transactions
app.get("/api/transactions/ambiguous", async (req, res) => {
  const transactions = await getTransactionsByField("isAmbiguous", true);
  res.json({ success: true, transactions });
});
```

---

## Phase 3: User Experience

### 3.1 Sync Flow

```
User clicks "Sync Transactions"
    ↓
Backend extracts all transactions
    ↓
Clean transactions → Save with isAmbiguous: false
Ambiguous transactions → Save with isAmbiguous: true
    ↓
Return ambiguous list in API response
    ↓
Frontend receives response
    ↓
IF ambiguousCount > 0:
  → Open review modal immediately
  → User can fix amounts one by one
  → Save updates (isAmbiguous: false)
ELSE:
  → Show success toast
  → Refresh transaction list
```

### 3.2 Table View

```
Transaction List displays:
- ⚠️  Warning icon for ambiguous transactions
- Yellow/orange highlight on amount
- Edit button available for all transactions
- Double-click row to edit (optional)
```

### 3.3 Review Modal

```
Modal shows:
1. Transaction details
2. Raw PDF line
3. Suggested amount (best guess)
4. Editable fields:
   - Amount ⭐ (main focus)
   - Description
   - Category
   - Type
5. Actions:
   - Skip (leave as ambiguous)
   - Save & Next (fix and mark clean)
```

---

## Implementation Order

1. ✅ **Backend Schema** - Add isAmbiguous field
2. ✅ **AXIS Ambiguous Detection** - Add logic
3. ✅ **ICICI Ambiguous Detection** - Add logic
4. ✅ **Save Ambiguous Transactions** - Update sync process
5. ✅ **Update API** - Add update endpoint
6. ✅ **Table Indicators** - Add warnings
7. ✅ **Inline Editing** - Implement edit mode
8. ✅ **Review Modal** - Update for editing
9. ✅ **Testing** - End-to-end flow

---

## Testing Checklist

- [ ] AXIS statement with ambiguous amounts
- [ ] ICICI statement with ambiguous amounts
- [ ] SBI statement with concatenated amounts
- [ ] Sync shows review modal
- [ ] Can edit in modal and save
- [ ] Can edit in table inline
- [ ] Warning icons appear
- [ ] isAmbiguous flag updates correctly
- [ ] No duplicates created

---

## Benefits

1. **No Data Loss** - All transactions saved, even ambiguous ones
2. **Immediate Fixing** - Review modal during sync
3. **Later Fixing** - Table inline editing anytime
4. **Visual Feedback** - Clear indicators
5. **Audit Trail** - isAmbiguous field tracks status
6. **All Banks** - Comprehensive coverage
