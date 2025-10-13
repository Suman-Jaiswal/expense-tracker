import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Typography,
} from "antd";
import { useState } from "react";
import toast from "react-hot-toast";
import { addManualTransaction, updateTransaction } from "../api";

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
  const progress = ((currentIndex + 1) / ambiguousTransactions.length) * 100;

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

  const handleSkip = () => {
    toast(`Transaction ${currentIndex + 1} skipped`, { icon: "⏭️" });
    if (isLastTransaction) {
      onComplete();
      onClose();
    } else {
      setCurrentIndex(currentIndex + 1);
      form.resetFields();
    }
  };

  return (
    <Modal
      title={
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Title level={4} style={{ margin: 0 }}>
              <WarningOutlined style={{ color: "#faad14", marginRight: 8 }} />
              Review Transaction
            </Title>
            <Text type="secondary">
              {currentIndex + 1} of {ambiguousTransactions.length}
            </Text>
          </div>
          <Progress
            percent={progress}
            showInfo={false}
            strokeColor="#1890ff"
            style={{ marginTop: 8 }}
          />
        </Space>
      }
      open={visible}
      onCancel={() => {
        if (
          window.confirm(
            "Are you sure you want to close? Unreviewed transactions will need manual entry later."
          )
        ) {
          onClose();
        }
      }}
      footer={null}
      width={720}
      destroyOnClose
    >
      <div
        style={{
          background: "#1890ff",
          color: "white",
          padding: "12px 16px",
          borderRadius: 6,
          marginBottom: 16,
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        💳{" "}
        {currentTransaction.resourceIdentifier?.replace("card_", "") ||
          "Unknown"}{" "}
        • 📊 Statement:{" "}
        {currentTransaction.statementId?.slice(0, 12) || "Unknown"}
      </div>

      <Alert
        message="Manual Review Required"
        description={`This transaction has ${
          currentTransaction.reason === "concatenated_amount"
            ? "concatenated amounts without proper spacing"
            : currentTransaction.reason === "suspicious_amount"
            ? "a suspicious amount that may be incorrectly parsed"
            : currentTransaction.reason === "multiple_amounts"
            ? "multiple amounts in the same line"
            : "ambiguous formatting"
        } and needs manual verification. Please verify the amount is correct.`}
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {currentTransaction.rawLine && (
        <div
          style={{
            background: "#f5f5f5",
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
            border: "1px solid #d9d9d9",
          }}
        >
          <Text strong style={{ color: "#595959" }}>
            📄 Raw PDF Line:
          </Text>
          <div
            style={{
              fontFamily: "monospace",
              marginTop: 8,
              wordBreak: "break-all",
              fontSize: 13,
              lineHeight: 1.6,
              color: "#262626",
            }}
          >
            {currentTransaction.rawLine}
          </div>
        </div>
      )}

      {currentTransaction.ambiguousReason && (
        <div
          style={{
            background: "#fff7e6",
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
            border: "1px solid #ffd591",
          }}
        >
          <Text strong style={{ color: "#d46b08" }}>
            ⚠️ Issue Detected:
          </Text>
          <div style={{ marginTop: 8, color: "#595959" }}>
            <strong>Reason:</strong>{" "}
            {currentTransaction.ambiguousReason.replace(/_/g, " ")}
            <br />
            <strong>Extracted Amount:</strong> ₹
            {currentTransaction.amount?.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            <br />
            <Text
              type="secondary"
              style={{ fontSize: 12, fontStyle: "italic" }}
            >
              Please verify and enter the correct amount below
            </Text>
          </div>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          description: currentTransaction.description,
          amount: undefined, // Don't pre-fill amount - let user enter it
          type: currentTransaction.type,
          category: currentTransaction.category,
          date: currentTransaction.date,
        }}
        onFinish={handleSubmit}
      >
        <Form.Item label="Date" name="date">
          <Input disabled style={{ fontWeight: 500 }} />
        </Form.Item>

        <Form.Item
          label="Description"
          name="description"
          rules={[{ required: true, message: "Please enter the description" }]}
        >
          <TextArea rows={2} placeholder="Transaction description" />
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
          extra={
            currentTransaction.suggestedAmount ? (
              <span style={{ fontSize: 13, color: "#1890ff", fontWeight: 500 }}>
                💡 AI Suggestion: ₹
                {currentTransaction.suggestedAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                <Text
                  type="secondary"
                  style={{ fontSize: 11, fontStyle: "italic" }}
                >
                  (verify before using)
                </Text>
              </span>
            ) : currentTransaction.amount ? (
              <span style={{ fontSize: 13, color: "#fa8c16", fontWeight: 500 }}>
                ⚠️ Extracted Amount: ₹
                {currentTransaction.amount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                <Text
                  type="secondary"
                  style={{ fontSize: 11, fontStyle: "italic" }}
                >
                  (likely incorrect - please verify)
                </Text>
              </span>
            ) : null
          }
        >
          <InputNumber
            style={{ width: "100%" }}
            size="large"
            precision={2}
            formatter={(value) =>
              `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => value.replace(/₹\s?|(,*)/g, "")}
            placeholder="Enter correct amount"
          />
        </Form.Item>

        <Form.Item
          label="Type"
          name="type"
          rules={[{ required: true, message: "Please select the type" }]}
        >
          <Select size="large">
            <Option value="debit">💸 Debit</Option>
            <Option value="credit">💰 Credit</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Category" name="category">
          <Select size="large" placeholder="Select category">
            <Option value="Food">🍔 Food</Option>
            <Option value="Shopping">🛍️ Shopping</Option>
            <Option value="Transport">🚗 Transport</Option>
            <Option value="Entertainment">🎬 Entertainment</Option>
            <Option value="Bills">📄 Bills</Option>
            <Option value="Health">🏥 Health</Option>
            <Option value="Education">📚 Education</Option>
            <Option value="Travel">✈️ Travel</Option>
            <Option value="Groceries">🛒 Groceries</Option>
            <Option value="Other">📦 Other</Option>
          </Select>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Button onClick={handleSkip} size="large">
              Skip for Now
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              icon={
                isLastTransaction ? (
                  <CheckCircleOutlined />
                ) : (
                  <ArrowRightOutlined />
                )
              }
            >
              {isLastTransaction ? "Save & Finish" : "Save & Next"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TransactionReviewModal;
