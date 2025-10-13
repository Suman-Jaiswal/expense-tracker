# Ambiguous Transactions - Frontend Implementation Guide

## ✅ Backend Status: COMPLETE

All backend work is done:

- ✅ AXIS ambiguous detection added
- ✅ ICICI ambiguous detection added
- ✅ SBI ambiguous detection (already done)
- ✅ `isAmbiguous`, `ambiguousReason`, `rawLine`, `needsReview` fields added
- ✅ Ambiguous transactions saved to Firebase with flags
- ✅ PATCH `/api/transactions/:id` endpoint added for updates

## 🚧 Frontend Remaining Work

### 1. Add API Function (client/src/api/index.js)

```javascript
// Add after addManualTransaction function

// Update existing transaction
export const updateTransaction = async (id, updates) => {
  const response = await fetch(`${API_BASE_URL}/api/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return response.json();
};
```

### 2. Update TransactionReviewModal (client/src/components/TransactionReviewModal.jsx)

Add handling for existing transactions vs new ones:

```javascript
const handleSubmit = async (values) => {
  setLoading(true);
  try {
    const currentTxn = ambiguousTransactions[currentIndex];

    // Check if this is an existing transaction (has id) or new one
    if (currentTxn.id) {
      // Update existing ambiguous transaction
      await updateTransaction(currentTxn.id, {
        amount: parseFloat(values.amount),
        description: values.description,
        category: values.category,
        type: values.type,
        isAmbiguous: false,
        needsReview: false,
        reviewedAt: new Date().toISOString(),
      });
      toast.success(`Transaction ${currentIndex + 1} updated successfully`);
    } else {
      // Add new transaction (original flow)
      await addManualTransaction({
        ...currentTxn,
        ...values,
        amount: parseFloat(values.amount),
        isAmbiguous: false,
      });
      toast.success(`Transaction ${currentIndex + 1} added successfully`);
    }

    if (isLastTransaction) {
      toast.success("✅ All transactions reviewed!");
      onComplete();
      onClose();
    } else {
      setCurrentIndex(currentIndex + 1);
      form.resetFields();
    }
  } catch (error) {
    toast.error(`Failed to save transaction: ${error.message}`);
  } finally {
    setLoading(false);
  }
};
```

### 3. Add Ambiguous Indicator in Table (client/src/components/TransactionList.jsx)

#### Add imports:

```javascript
import { EditOutlined, Warning OutlinedOutlined } from "@ant-design/icons";
import { Form, InputNumber, Select, Tooltip } from "antd"; // Add these
```

#### Update Amount Column:

```javascript
{
  title: "Amount",
  dataIndex: "amount",
  key: "amount",
  sorter: (a, b) => a.amount - b.amount,
  render: (amount, record) => (
    <Space>
      {record.isAmbiguous && (
        <Tooltip title={`Needs verification: ${record.ambiguousReason || 'unknown'}`}>
          <WarningOutlined style={{ color: '#faad14', fontSize: 16 }} />
        </Tooltip>
      )}
      <Text
        type={record.isAmbiguous ? "warning" : undefined}
        strong={record.isAmbiguous}
      >
        {formatCurrency(amount)}
      </Text>
    </Space>
  ),
},
```

#### Add Edit Action Column:

```javascript
{
  title: "Actions",
  key: "actions",
  width: 100,
  render: (_, record) => (
    <Space>
      <Tooltip title="Edit transaction">
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEditTransaction(record)}
          size="small"
        />
      </Tooltip>
      {record.isAmbiguous && (
        <Tooltip title="Needs review">
          <WarningOutlined style={{ color: '#faad14' }} />
        </Tooltip>
      )}
    </Space>
  ),
},
```

#### Add Edit Handler:

```javascript
const [editModalVisible, setEditModalVisible] = useState(false);
const [editingTransaction, setEditingTransaction] = useState(null);
const [editForm] = Form.useForm();

const handleEditTransaction = (transaction) => {
  setEditingTransaction(transaction);
  editForm.setFieldsValue({
    amount: transaction.amount,
    description: transaction.description,
    category: transaction.category,
    type: transaction.type,
  });
  setEditModalVisible(true);
};

const handleSaveEdit = async () => {
  try {
    const values = await editForm.validateFields();
    await updateTransaction(editingTransaction.id, {
      ...values,
      amount: parseFloat(values.amount),
      isAmbiguous: false,
      needsReview: false,
    });
    toast.success("Transaction updated successfully");
    setEditModalVisible(false);
    fetchTransactions();
  } catch (error) {
    toast.error("Failed to update transaction");
  }
};
```

#### Add Edit Modal:

```javascript
<Modal
  title="Edit Transaction"
  open={editModalVisible}
  onCancel={() => setEditModalVisible(false)}
  onOk={handleSaveEdit}
  okText="Save"
>
  <Form form={editForm} layout="vertical">
    <Form.Item
      name="description"
      label="Description"
      rules={[{ required: true }]}
    >
      <Input.TextArea rows={2} />
    </Form.Item>

    <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
      <InputNumber
        style={{ width: "100%" }}
        precision={2}
        formatter={(value) =>
          `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        }
        parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
      />
    </Form.Item>

    <Form.Item name="type" label="Type" rules={[{ required: true }]}>
      <Select>
        <Select.Option value="debit">💸 Debit</Select.Option>
        <Select.Option value="credit">💰 Credit</Select.Option>
      </Select>
    </Form.Item>

    <Form.Item name="category" label="Category">
      <Select>
        <Select.Option value="Food">🍔 Food</Select.Option>
        <Select.Option value="Shopping">🛍️ Shopping</Select.Option>
        <Select.Option value="Transport">🚗 Transport</Select.Option>
        <Select.Option value="Entertainment">🎬 Entertainment</Select.Option>
        <Select.Option value="Bills">📄 Bills</Select.Option>
        <Select.Option value="Health">🏥 Health</Select.Option>
        <Select.Option value="Education">📚 Education</Select.Option>
        <Select.Option value="Travel">✈️ Travel</Select.Option>
        <Select.Option value="Groceries">🛒 Groceries</Select.Option>
        <Select.Option value="Other">📦 Other</Select.Option>
      </Select>
    </Form.Item>
  </Form>
</Modal>
```

## Testing the Complete Flow

### 1. Clean DB and Resync

```bash
# Server terminal
cd server
node clean-transactions.js

# Then sync
curl http://localhost:4000/sync-transactions
```

### 2. What Should Happen

**During Sync:**

1. Backend extracts all transactions
2. Identifies ambiguous ones (AXIS cashback, ICICI missing decimal, SBI concatenated)
3. Saves both clean and ambiguous to Firebase
4. Returns ambiguous list in API response

**In Review Modal:** 5. Modal opens automatically showing ambiguous transactions 6. User can fix amounts, descriptions, categories 7. Clicking "Save & Next" updates the transaction (removes isAmbiguous flag) 8. Clicking "Skip" leaves it ambiguous

**In Transaction Table:** 9. ⚠️ Warning icon appears for ambiguous transactions 10. Orange/yellow text for the amount 11. Click edit icon to fix inline 12. Save updates transaction

### 3. Expected UI

**Table View:**

```
Date       | Description              | Amount        | Actions
-----------|--------------------------|---------------|----------
2025-08-04 | FLIPKART                 | ⚠️  ₹192.00  | ✏️ ⚠️
2025-08-05 | AMAZON                   | ₹1,234.56     | ✏️
```

**Review Modal:**

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  Review Transaction                        1 of 3         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ⚠️ Manual Review Required                                    │
│ This transaction has suspicious_amount and needs             │
│ manual verification.                                          │
│                                                               │
│ 📄 Raw PDF Line:                                             │
│ 04/08/2025FLIPKART,BANGLORE DEPT STORES192.00 Dr9.00 Cr     │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Date                                                   │   │
│ │ 2025-08-04                                            │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Description                                            │   │
│ │ FLIPKART,BANGLORE                                     │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Amount (₹)                                            │   │
│ │ ₹ 192.00                                              │   │
│ │ 💡 Suggested: ₹192.00                                  │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Type: 💸 Debit                                        │   │
│ │ Category: 🛍️ Shopping                                  │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│            [ Skip for Now ]       [ Save & Next → ]          │
└─────────────────────────────────────────────────────────────┘
```

## Files Modified Summary

### Backend (✅ COMPLETE)

1. `server/src/services/transactions/transactionExtractor.js` - Added ambiguous detection for all banks
2. `server/src/services/transactions/syncTransactions.js` - Save ambiguous with flags
3. `server/server.js` - Added PATCH endpoint

### Frontend (📝 TO COMPLETE)

1. `client/src/api/index.js` - Add updateTransaction function
2. `client/src/components/TransactionReviewModal.jsx` - Handle update vs add
3. `client/src/components/TransactionList.jsx` - Add indicators and inline editing

## Quick Implementation

Copy the code snippets above into the respective files and the feature will be complete!
