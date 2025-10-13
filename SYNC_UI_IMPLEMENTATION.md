# Sync & Review UI Implementation

## ✅ Completed: Backend Enhancement

### 1. Modified Transaction Extractor

**File**: `server/src/services/transactions/transactionExtractor.js`

**Changes**:

- SBI extraction now tracks ambiguous transactions separately
- Returns `{ transactions, ambiguousTransactions }` instead of just array
- Ambiguous transactions include:
  - `date`, `rawLine`, `description`, `suggestedAmount`, `type`, `reason`, `category`

### 2. Updated Sync Transactions Service

**File**: `server/src/services/transactions/syncTransactions.js`

**Changes**:

- Collects all ambiguous transactions during sync
- Returns enhanced response:

```javascript
{
  success: true,
  message: "Transaction sync completed. X transaction(s) need manual review.",
  stats: {
    totalStatements: 20,
    processed: 20,
    failed: 0,
    totalTransactions: 127,
    ambiguousCount: 3  // NEW
  },
  ambiguousTransactions: [...],  // NEW
  needsReview: true  // NEW
}
```

---

## 🚀 Next Steps: Implementation Plan

### Step 1: Backend API Endpoints

#### A. Add Manual Transaction Endpoint

**File**: `server/server.js`

```javascript
// Add manual transaction from review
app.post("/api/transactions/manual", async (req, res) => {
  try {
    const {
      resourceIdentifier,
      statementId,
      date,
      description,
      amount,
      type,
      category,
      merchant,
    } = req.body;

    // Validate required fields
    if (
      !resourceIdentifier ||
      !statementId ||
      !date ||
      !description ||
      !amount ||
      !type
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Generate deterministic ID
    const idData = `${resourceIdentifier}|${date}|${description}|${amount}|${type}`;
    const id = `txn_${crypto
      .createHash("md5")
      .update(idData)
      .digest("hex")
      .substring(0, 16)}`;

    const transaction = {
      id,
      resourceIdentifier,
      statementId,
      date,
      description,
      merchant: merchant || description,
      amount: parseFloat(amount),
      type,
      category: category || "Other",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addMultipleTransactions([transaction]);

    res.json({
      success: true,
      message: "Transaction added successfully",
      transaction,
    });
  } catch (error) {
    console.error("Error adding manual transaction:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

#### B. Check for New Statements Endpoint

```javascript
// Check if there might be new statements
app.get("/api/statements/check-new", async (req, res) => {
  try {
    // Get the most recent statement date
    const statementsRef = collection(db, "statements");
    const q = query(statementsRef, orderBy("period.end", "desc"), limit(1));
    const snapshot = await getDocs(q);

    let lastStatementDate = null;
    if (!snapshot.empty) {
      const lastStatement = snapshot.docs[0].data();
      lastStatementDate = lastStatement.period.end;
    }

    // Calculate if we're likely to have new statements
    const daysSinceLastStatement = lastStatementDate
      ? Math.floor(
          (new Date() - new Date(lastStatementDate)) / (1000 * 60 * 60 * 24)
        )
      : 999;

    // Statements typically come monthly (25-30 days)
    const hasNewStatements = daysSinceLastStatement >= 25;

    res.json({
      success: true,
      hasNewStatements,
      lastStatementDate,
      daysSinceLastStatement,
      message: hasNewStatements
        ? "New statements may be available"
        : `Last statement was ${daysSinceLastStatement} days ago`,
    });
  } catch (error) {
    console.error("Error checking for new statements:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

---

### Step 2: Frontend - API Functions

**File**: `client/src/api/index.js`

```javascript
// Sync statements
export const syncStatements = async () => {
  const response = await fetch(`${API_BASE_URL}/sync-statements`);
  return response.json();
};

// Sync transactions
export const syncTransactions = async () => {
  const response = await fetch(`${API_BASE_URL}/sync-transactions`);
  return response.json();
};

// Check for new statements
export const checkNewStatements = async () => {
  const response = await fetch(`${API_BASE_URL}/statements/check-new`);
  return response.json();
};

// Add manual transaction
export const addManualTransaction = async (transaction) => {
  const response = await fetch(`${API_BASE_URL}/transactions/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction),
  });
  return response.json();
};
```

---

### Step 3: Frontend - Transaction Review Modal

**File**: `client/src/components/TransactionReviewModal.jsx`

```jsx
import React, { useState } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Typography,
  Alert,
} from "antd";
import { addManualTransaction } from "../api";
import toast from "react-hot-toast";

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const TransactionReviewModal = ({
  visible,
  ambiguousTransactions,
  onClose,
  onComplete,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!ambiguousTransactions || ambiguousTransactions.length === 0) return null;

  const currentTransaction = ambiguousTransactions[currentIndex];
  const isLastTransaction = currentIndex === ambiguousTransactions.length - 1;

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await addManualTransaction({
        ...currentTransaction,
        ...values,
      });

      toast.success("Transaction added successfully");

      if (isLastTransaction) {
        onComplete();
        onClose();
      } else {
        setCurrentIndex(currentIndex + 1);
        form.resetFields();
      }
    } catch (error) {
      toast.error(`Failed to add transaction: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (isLastTransaction) {
      onClose();
    } else {
      setCurrentIndex(currentIndex + 1);
      form.resetFields();
    }
  };

  return (
    <Modal
      title={
        <Space direction="vertical" size={0}>
          <Title level={4} style={{ margin: 0 }}>
            Review Ambiguous Transaction
          </Title>
          <Text type="secondary">
            Transaction {currentIndex + 1} of {ambiguousTransactions.length}
          </Text>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Alert
        message="Manual Review Required"
        description={`This transaction has ${
          currentTransaction.reason === "concatenated_amount"
            ? "concatenated amounts"
            : "ambiguous formatting"
        } and needs manual verification.`}
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <div
        style={{
          background: "#f5f5f5",
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <Text strong>Raw PDF Line:</Text>
        <div
          style={{
            fontFamily: "monospace",
            marginTop: 8,
            wordBreak: "break-all",
          }}
        >
          {currentTransaction.rawLine}
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          description: currentTransaction.description,
          amount: currentTransaction.suggestedAmount,
          type: currentTransaction.type,
          category: currentTransaction.category,
          date: currentTransaction.date,
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Date"
          name="date"
          rules={[{ required: true, message: "Please enter the date" }]}
        >
          <Input disabled />
        </Form.Item>

        <Form.Item
          label="Description"
          name="description"
          rules={[{ required: true, message: "Please enter the description" }]}
        >
          <TextArea rows={2} />
        </Form.Item>

        <Form.Item
          label="Amount (₹)"
          name="amount"
          rules={[
            { required: true, message: "Please enter the amount" },
            {
              type: "number",
              min: 0.01,
              message: "Amount must be greater than 0",
            },
          ]}
          extra={`Suggested: ₹${currentTransaction.suggestedAmount.toLocaleString(
            "en-IN"
          )}`}
        >
          <InputNumber
            style={{ width: "100%" }}
            precision={2}
            formatter={(value) =>
              `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
          />
        </Form.Item>

        <Form.Item
          label="Type"
          name="type"
          rules={[{ required: true, message: "Please select the type" }]}
        >
          <Select>
            <Option value="debit">Debit</Option>
            <Option value="credit">Credit</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Category" name="category">
          <Select>
            <Option value="Food">Food</Option>
            <Option value="Shopping">Shopping</Option>
            <Option value="Transport">Transport</Option>
            <Option value="Entertainment">Entertainment</Option>
            <Option value="Bills">Bills</Option>
            <Option value="Health">Health</Option>
            <Option value="Education">Education</Option>
            <Option value="Travel">Travel</Option>
            <Option value="Groceries">Groceries</Option>
            <Option value="Other">Other</Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleSkip}>Skip</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isLastTransaction ? "Save & Finish" : "Save & Next"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TransactionReviewModal;
```

---

### Step 4: Frontend - Add Sync Buttons

#### A. Update Statements Page

**File**: `client/src/components/Statements.jsx`

Add at the top of the page:

```jsx
import { useState } from "react";
import { Badge, Button, Space } from "antd";
import { SyncOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { syncStatements, checkNewStatements } from "../api";

// Inside component:
const [syncing, setSyncing] = useState(false);
const [hasNewStatements, setHasNewStatements] = useState(false);

useEffect(() => {
  // Check for new statements
  checkNewStatements().then((res) => {
    if (res.success) {
      setHasNewStatements(res.hasNewStatements);
    }
  });
}, []);

const handleSyncStatements = async () => {
  setSyncing(true);
  try {
    const result = await syncStatements();
    if (result.success) {
      toast.success("Statements synced successfully!");
      setHasNewStatements(false);
      // Refresh statements list
      fetchStatements();
    }
  } catch (error) {
    toast.error("Failed to sync statements");
  } finally {
    setSyncing(false);
  }
};

// In JSX, add button in the header:
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  }}
>
  <div>
    <Typography.Title level={3} style={{ margin: 0 }}>
      📄 Credit Card Statements
    </Typography.Title>
    <Typography.Text type="secondary">
      View and sync your monthly statements
    </Typography.Text>
  </div>
  <Badge dot={hasNewStatements} offset={[-5, 5]}>
    <Button
      type="primary"
      icon={<SyncOutlined spin={syncing} />}
      onClick={handleSyncStatements}
      loading={syncing}
      size="large"
    >
      Sync Statements
    </Button>
  </Badge>
</div>;
```

#### B. Update Cards Page with Transaction Sync

**File**: `client/src/components/CardView.jsx` (or wherever you want the button)

```jsx
import { useState } from 'react';
import { Button } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { syncTransactions } from '../api';
import TransactionReviewModal from './TransactionReviewModal';

const [syncing, setSyncing] = useState(false);
const [reviewModalVisible, setReviewModalVisible] = useState(false);
const [ambiguousTransactions, setAmbiguousTransactions] = useState([]);

const handleSyncTransactions = async () => {
  setSyncing(true);
  try {
    const result = await syncTransactions();
    if (result.success) {
      toast.success(result.message);

      // If there are ambiguous transactions, show review modal
      if (result.needsReview && result.ambiguousTransactions.length > 0) {
        setAmbiguousTransactions(result.ambiguousTransactions);
        setReviewModalVisible(true);
      } else {
        // Refresh transactions list
        fetchTransactions();
      }
    }
  } catch (error) {
    toast.error('Failed to sync transactions');
  } finally {
    setSyncing(false);
  }
};

// In JSX:
<Button
  type="primary"
  icon={<SyncOutlined spin={syncing} />}
  onClick={handleSyncTransactions}
  loading={syncing}
>
  Sync Transactions
</Button>

<TransactionReviewModal
  visible={reviewModalVisible}
  ambiguousTransactions={ambiguousTransactions}
  onClose={() => setReviewModalVisible(false)}
  onComplete={() => {
    // Refresh transactions after all reviews are complete
    fetchTransactions();
  }}
/>
```

---

## 🎯 Summary

**What's Been Implemented:**

1. ✅ Backend tracks ambiguous SBI transactions
2. ✅ Sync API returns ambiguous transactions for review
3. ✅ Enhanced logging and error messages

**What Needs Implementation:**

1. ⏳ Add backend API endpoints (manual transaction, check new statements)
2. ⏳ Create TransactionReviewModal component
3. ⏳ Add sync buttons to Statements and Cards pages
4. ⏳ Add badge notifications

**User Flow:**

1. User clicks "Sync Statements" → Downloads new statements from Gmail
2. User clicks "Sync Transactions" → Extracts transactions from PDFs
3. If ambiguous transactions found → Modal opens automatically
4. User reviews each transaction, corrects amount, saves
5. After all reviews → Transactions list refreshes with all data

This provides a complete, user-friendly flow for handling edge cases like the SBI concatenated amounts!
