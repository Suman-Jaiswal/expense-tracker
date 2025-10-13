import { EditOutlined, SyncOutlined, WarningOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  getAllTransactions,
  getAmbiguousTransactions,
  syncTransactions,
  updateTransaction,
} from "../api";
import { useApp } from "../context/AppContext";
import {
  formatCategoryTag,
  getCategoryColor,
  getCategoryIcon,
} from "../utils/categoryIcons";
import { formatCurrency } from "../utils/dataAggregation";
import TransactionFilters from "./TransactionFilters";
import TransactionReviewModal from "./TransactionReviewModal";

const { Title, Text } = Typography;

export default function TransactionList({ resourceIdentifier }) {
  const {
    token: { colorBgLayout },
  } = theme.useToken();
  const { state } = useApp();
  const { resources } = state;
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [ambiguousTransactions, setAmbiguousTransactions] = useState([]);
  const [ambiguousCount, setAmbiguousCount] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editForm] = Form.useForm();

  useEffect(() => {
    fetchTransactions();
    checkAmbiguousTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceIdentifier]); // Re-fetch when resourceIdentifier changes

  const checkAmbiguousTransactions = async () => {
    try {
      const result = await getAmbiguousTransactions();
      if (result.success) {
        setAmbiguousCount(result.count);
        setAmbiguousTransactions(result.transactions);
      }
    } catch (error) {
      console.error("Failed to fetch ambiguous transactions:", error);
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

        // Refresh transactions list first
        await fetchTransactions();

        // Check for ambiguous transactions
        await checkAmbiguousTransactions();

        // If there are ambiguous transactions from THIS sync, show review modal
        if (result.needsReview && result.ambiguousTransactions?.length > 0) {
          console.log(
            "⚠️ Found ambiguous transactions:",
            result.ambiguousTransactions
          ); // Debug log
          setAmbiguousTransactions(result.ambiguousTransactions);
          setReviewModalVisible(true);
        } else if (ambiguousCount > 0) {
          // Show notification that there are existing ambiguous transactions
          toast(
            `Sync complete! You have ${ambiguousCount} transaction${
              ambiguousCount > 1 ? "s" : ""
            } that need review.`,
            { icon: "⚠️", duration: 5000 }
          );
        }
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
      checkAmbiguousTransactions(); // Refresh ambiguous count
    } catch (error) {
      toast.error("Failed to update transaction");
    }
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
        <Space>
          {record.isAmbiguous && (
            <Tooltip
              title={`Needs verification: ${
                record.ambiguousReason || "unknown"
              }`}
            >
              <WarningOutlined style={{ color: "#faad14", fontSize: 16 }} />
            </Tooltip>
          )}
          <Text
            style={{
              color: record.type === "credit" ? "#52c41a" : "#ff4d4f",
              fontWeight: record.isAmbiguous ? 700 : 600,
              fontFamily: "monospace",
            }}
          >
            {record.type === "credit" ? "+" : "-"}
            {formatCurrency(amount)}
          </Text>
        </Space>
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
              <WarningOutlined style={{ color: "#faad14" }} />
            </Tooltip>
          )}
        </Space>
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

      {/* Ambiguous Transactions Alert */}
      {ambiguousCount > 0 && (
        <Alert
          message={
            <Space>
              <WarningOutlined />
              <strong>
                {ambiguousCount} Transaction{ambiguousCount > 1 ? "s" : ""} Need
                {ambiguousCount === 1 ? "s" : ""} Review
              </strong>
            </Space>
          }
          description={
            <Space direction="vertical" style={{ width: "100%" }}>
              <span>
                Some transactions have ambiguous amounts or formatting that need
                manual verification.
              </span>
              <Button
                type="primary"
                size="small"
                icon={<WarningOutlined />}
                onClick={() => setReviewModalVisible(true)}
              >
                Review Now ({ambiguousCount})
              </Button>
            </Space>
          }
          type="warning"
          showIcon
          closable
          onClose={() => setAmbiguousCount(0)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Filters */}
      <TransactionFilters
        onFilterChange={handleFilterChange}
        cards={resources?.cards || []}
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

      {/* Transaction Review Modal */}
      <TransactionReviewModal
        visible={reviewModalVisible}
        ambiguousTransactions={ambiguousTransactions}
        onClose={() => setReviewModalVisible(false)}
        onComplete={() => {
          // Refresh transactions and ambiguous count after all reviews are complete
          fetchTransactions();
          checkAmbiguousTransactions();
        }}
      />

      {/* Edit Transaction Modal */}
      <Modal
        title="Edit Transaction"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleSaveEdit}
        okText="Save"
        width={500}
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
