import { Empty, Spin, Statistic, Table, Tag, Tooltip } from "antd";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Toaster } from "react-hot-toast";
import { getAllTransactions } from "../api";
import { useApp } from "../context/AppContext";
import {
  formatCategoryTag,
  getCategoryColor,
  getCategoryIcon,
} from "../utils/categoryIcons";
import { formatCurrency } from "../utils/dataAggregation";
import TransactionFilters from "./TransactionFilters";

export default function TransactionList() {
  const { state } = useApp();
  const { resources } = state;
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await getAllTransactions();
      setTransactions(data || []);
      setFilteredTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
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
      width: 120,
      align: "right",
      sorter: (a, b) => parseFloat(a.amount) - parseFloat(b.amount),
      render: (amount, record) => (
        <span
          style={{
            color: record.type === "credit" ? "#52c41a" : "#ff4d4f",
            fontWeight: 600,
            fontFamily: "monospace",
          }}
        >
          {record.type === "credit" ? "+" : "-"}
          {formatCurrency(amount)}
        </span>
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
      render: (type) => (
        <Tag color={type === "credit" ? "green" : "red"}>
          {type?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Card",
      dataIndex: "resourceIdentifier",
      key: "resourceIdentifier",
      width: 150,
      ellipsis: true,
      render: (text) => <span style={{ fontSize: 12 }}>{text || "N/A"}</span>,
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Toaster position="top-right" />

      {/* Filters */}
      <TransactionFilters
        onFilterChange={handleFilterChange}
        cards={resources?.cards || []}
        transactions={filteredTransactions}
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
    </div>
  );
}
