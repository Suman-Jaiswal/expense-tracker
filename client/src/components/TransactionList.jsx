import { DeleteOutlined, EditOutlined, SyncOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd";
import { format } from "date-fns";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { getAllStatements, getAllTransactions, syncTransactions } from "../api";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import {
  formatCategoryTag,
  getCategoryColor,
  getCategoryIcon,
} from "../utils/categoryIcons";
import { formatCurrency } from "../utils/dataAggregation";
import TransactionFilters from "./TransactionFilters";

const { Title, Text } = Typography;

export default function TransactionList({ resourceIdentifier }) {
  const {
    token: { colorBgLayout },
  } = theme.useToken();
  const { state } = useApp();
  const { resources } = state;
  const { modal } = App.useApp();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editForm] = Form.useForm();

  useEffect(() => {
    fetchTransactions();
    fetchStatements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceIdentifier]); // Re-fetch when resourceIdentifier changes

  const fetchStatements = async () => {
    try {
      const data = await getAllStatements();
      setStatements(data || []);
    } catch (error) {
      console.error("Error fetching statements:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await getAllTransactions();

      // Filter by resourceIdentifier if provided (from card selection)
      let filteredData = data || [];
      if (resourceIdentifier) {
        filteredData = filteredData.filter(
          (tx) => tx.resourceIdentifier === resourceIdentifier
        );
      }

      setTransactions(filteredData);
      setFilteredTransactions(filteredData);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTransactions = async () => {
    setSyncing(true);
    try {
      const result = await syncTransactions();
      console.log("📊 Sync result:", result); // Debug log

      if (result.success) {
        toast.success(result.message);

        // Refresh transactions list
        await fetchTransactions();
      } else {
        toast.error(result.message || "Failed to sync transactions");
      }
    } catch (error) {
      toast.error("Failed to sync transactions");
      console.error("Sync error:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Handle edit transaction
  const handleEditTransaction = (transaction) => {
    console.log("Opening edit modal for transaction:", transaction);
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

      // Update transaction directly in Firebase
      const txnRef = doc(db, "transactions", editingTransaction.id);
      await updateDoc(txnRef, {
        ...values,
        amount: parseFloat(values.amount),
        updatedAt: new Date().toISOString(),
      });

      toast.success("Transaction updated successfully");
      setEditModalVisible(false);
      fetchTransactions();
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error("Failed to update transaction");
    }
  };

  const handleDeleteTransaction = () => {
    if (!editingTransaction) {
      console.error("No transaction selected for deletion");
      return;
    }

    console.log("Attempting to delete transaction:", editingTransaction.id);

    // Store transaction details before closing modal
    const transactionToDelete = { ...editingTransaction };

    // Close edit modal first to avoid z-index conflicts
    setEditModalVisible(false);

    // Small delay to ensure edit modal is closed
    setTimeout(() => {
      console.log("Showing confirmation dialog");

      modal.confirm({
        title: "Delete Transaction",
        icon: <DeleteOutlined style={{ color: "#ff4d4f" }} />,
        content: (
          <div style={{ color: "rgba(0, 0, 0, 0.88)" }}>
            <p style={{ marginBottom: 16 }}>
              Are you sure you want to delete this transaction? This action
              cannot be undone.
            </p>
            <div
              style={{
                padding: 12,
                background: "rgba(0, 0, 0, 0.04)",
                borderRadius: 6,
                border: "1px solid rgba(0, 0, 0, 0.06)",
              }}
            >
              <div style={{ marginBottom: 8, color: "rgba(0, 0, 0, 0.88)" }}>
                <strong style={{ color: "rgba(0, 0, 0, 0.88)" }}>Date:</strong>{" "}
                {transactionToDelete.date}
              </div>
              <div style={{ marginBottom: 8, color: "rgba(0, 0, 0, 0.88)" }}>
                <strong style={{ color: "rgba(0, 0, 0, 0.88)" }}>
                  Description:
                </strong>{" "}
                {transactionToDelete.description}
              </div>
              <div style={{ marginBottom: 8, color: "rgba(0, 0, 0, 0.88)" }}>
                <strong style={{ color: "rgba(0, 0, 0, 0.88)" }}>
                  Amount:
                </strong>{" "}
                ₹{transactionToDelete.amount}
              </div>
              <div style={{ color: "rgba(0, 0, 0, 0.88)" }}>
                <strong style={{ color: "rgba(0, 0, 0, 0.88)" }}>Type:</strong>{" "}
                <Tag
                  color={
                    transactionToDelete.type === "credit" ? "green" : "red"
                  }
                >
                  {transactionToDelete.type?.toUpperCase()}
                </Tag>
              </div>
            </div>
          </div>
        ),
        okText: "Delete",
        okType: "danger",
        cancelText: "Cancel",
        centered: true,
        onOk: async () => {
          try {
            console.log(
              "Delete confirmed for transaction:",
              transactionToDelete.id
            );
            const txnRef = doc(db, "transactions", transactionToDelete.id);
            console.log("Transaction reference created");

            await deleteDoc(txnRef);
            console.log("Transaction deleted successfully from Firebase");

            toast.success("Transaction deleted successfully");

            // Refresh data
            await fetchTransactions();
          } catch (error) {
            console.error("Error deleting transaction:", error);
            console.error("Error details:", {
              message: error.message,
              code: error.code,
              stack: error.stack,
            });
            toast.error(`Failed to delete transaction: ${error.message}`);
          }
        },
        onCancel: () => {
          console.log("Delete cancelled");
        },
      });

      console.log("Confirmation dialog triggered");
    }, 100);
  };

  // Apply filters
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);

    let filtered = [...transactions];

    // Search text filter
    if (newFilters.searchText) {
      const searchLower = newFilters.searchText.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.description?.toLowerCase().includes(searchLower) ||
          tx.merchant?.toLowerCase().includes(searchLower)
      );
    }

    // Card filter
    if (newFilters.selectedCard) {
      filtered = filtered.filter(
        (tx) => tx.resourceIdentifier === newFilters.selectedCard
      );
    }

    // Statement filter
    if (newFilters.selectedStatement) {
      filtered = filtered.filter(
        (tx) => tx.statementId === newFilters.selectedStatement
      );
    }

    // Date range filter
    if (newFilters.dateRange && newFilters.dateRange.length === 2) {
      const [start, end] = newFilters.dateRange;
      filtered = filtered.filter((tx) => {
        const txDate = new Date(tx.date);
        return txDate >= start && txDate <= end;
      });
    }

    // Amount range filter
    if (newFilters.minAmount !== null && newFilters.minAmount !== undefined) {
      filtered = filtered.filter(
        (tx) => parseFloat(tx.amount) >= newFilters.minAmount
      );
    }
    if (newFilters.maxAmount !== null && newFilters.maxAmount !== undefined) {
      filtered = filtered.filter(
        (tx) => parseFloat(tx.amount) <= newFilters.maxAmount
      );
    }

    // Transaction type filter
    if (newFilters.transactionType) {
      filtered = filtered.filter(
        (tx) => tx.type === newFilters.transactionType
      );
    }

    setFilteredTransactions(filtered);
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalDebit = filteredTransactions
      .filter((tx) => tx.type === "debit")
      .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

    const totalCredit = filteredTransactions
      .filter((tx) => tx.type === "credit")
      .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

    return { totalDebit, totalCredit, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 120,
      sorter: (a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateA - dateB;
      },
      render: (date) => {
        if (!date) return "N/A";
        try {
          const dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) return "Invalid Date";
          return format(dateObj, "MMM dd, yyyy");
        } catch (error) {
          console.error("Error formatting date:", date, error);
          return "Invalid Date";
        }
      },
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (text) => text || "N/A",
    },
    {
      title: "Merchant",
      dataIndex: "merchant",
      key: "merchant",
      width: 150,
      render: (text) => text || "-",
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 140,
      sorter: (a, b) => (a.category || "").localeCompare(b.category || ""),
      render: (text) => {
        const icon = getCategoryIcon(text);
        const color = getCategoryColor(text);
        const label = formatCategoryTag(text);
        return (
          <Tooltip title={label}>
            <Tag color={color} style={{ borderRadius: 12 }}>
              <span style={{ marginRight: 4 }}>{icon}</span>
              {label}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      align: "right",
      sorter: (a, b) => parseFloat(a.amount) - parseFloat(b.amount),
      render: (amount, record) => (
        <Text
          style={{
            color: record.type === "credit" ? "#52c41a" : "#ff4d4f",
            fontWeight: 600,
            fontFamily: "monospace",
          }}
        >
          {record.type === "credit" ? "+" : "-"}
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 90,
      filters: [
        { text: "Debit", value: "debit" },
        { text: "Credit", value: "credit" },
      ],
      onFilter: (value, record) => record.type === value,
      sorter: (a, b) => (a.type || "").localeCompare(b.type || ""),
      render: (type) => (
        <Tag color={type === "credit" ? "green" : "red"}>
          {type?.toUpperCase()}
        </Tag>
      ),
    },
    // Only show Card column when viewing all transactions (not filtered by specific card)
    ...(!resourceIdentifier
      ? [
          {
            title: "Card",
            dataIndex: "resourceIdentifier",
            key: "resourceIdentifier",
            width: 150,
            ellipsis: true,
            render: (text) => (
              <span style={{ fontSize: 12 }}>{text || "N/A"}</span>
            ),
          },
        ]
      : []),
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 130,
      sorter: (a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateA - dateB;
      },
      render: (date) => {
        if (!date) return "N/A";
        try {
          const dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) return "N/A";
          return format(dateObj, "MMM dd, HH:mm");
        } catch (error) {
          return "N/A";
        }
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Tooltip title="Edit transaction">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditTransaction(record)}
            size="small"
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div
      style={{
        padding: "24px",
        background: colorBgLayout,
        minHeight: "100vh",
      }}
    >
      <Toaster position="top-right" />

      {/* Header Section - Only show when NOT viewing specific card */}
      {!resourceIdentifier && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <Title level={2} style={{ margin: 0 }}>
              💰 Transactions
            </Title>
            <Text type="secondary">
              View and manage all your transactions across all cards
            </Text>
          </div>
          <Button
            type="primary"
            icon={<SyncOutlined spin={syncing} />}
            onClick={handleSyncTransactions}
            loading={syncing}
            size="large"
          >
            Sync Transactions
          </Button>
        </div>
      )}

      {/* Card Indicator when viewing specific card */}
      {resourceIdentifier && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            borderRadius: 8,
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>💳</span>
          <span style={{ fontWeight: 600 }}>
            Showing transactions for: {resourceIdentifier}
          </span>
        </div>
      )}

      {/* Filters */}
      <TransactionFilters
        onFilterChange={handleFilterChange}
        cards={resources?.cards || []}
        statements={statements}
        transactions={filteredTransactions}
        hideCardFilter={!!resourceIdentifier} // Hide card filter when viewing specific card
      />

      {/* Summary Stats */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <Statistic
          title="Total Transactions"
          value={stats.count}
          style={{ flex: 1, minWidth: 150 }}
        />
        <Statistic
          title="Total Debit"
          value={stats.totalDebit}
          precision={0}
          prefix="₹"
          valueStyle={{ color: "#ff4d4f" }}
          style={{ flex: 1, minWidth: 150 }}
        />
        <Statistic
          title="Total Credit"
          value={stats.totalCredit}
          precision={0}
          prefix="₹"
          valueStyle={{ color: "#52c41a" }}
          style={{ flex: 1, minWidth: 150 }}
        />
        <Statistic
          title="Net"
          value={stats.totalCredit - stats.totalDebit}
          precision={0}
          prefix="₹"
          valueStyle={{
            color:
              stats.totalCredit - stats.totalDebit >= 0 ? "#52c41a" : "#ff4d4f",
          }}
          style={{ flex: 1, minWidth: 150 }}
        />
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "50px 0" }}>
          <Spin size="large" tip="Loading transactions..." />
        </div>
      ) : filteredTransactions.length === 0 ? (
        <Empty
          description="No transactions found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Table
          columns={columns}
          dataSource={filteredTransactions}
          rowKey={(record) => record.id || `${record.date}-${record.amount}`}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} transactions`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          scroll={{ x: 1000 }}
          size="middle"
        />
      )}

      {/* Edit Transaction Modal */}
      <Modal
        title="Edit Transaction"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        width={500}
        footer={[
          <Button
            key="delete"
            danger
            icon={<DeleteOutlined />}
            onClick={handleDeleteTransaction}
            style={{ float: "left" }}
          >
            Delete
          </Button>,
          <Button key="cancel" onClick={() => setEditModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={handleSaveEdit}>
            Save
          </Button>,
        ]}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: "Please enter description" }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount"
            rules={[{ required: true, message: "Please enter amount" }]}
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
            name="type"
            label="Type"
            rules={[{ required: true, message: "Please select type" }]}
          >
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
              <Select.Option value="Entertainment">
                🎬 Entertainment
              </Select.Option>
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
    </div>
  );
}
