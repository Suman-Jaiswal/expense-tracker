import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CreditCardOutlined,
  SyncOutlined,
  TransactionOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  theme,
  Typography,
} from "antd";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAllTransactions, syncTransactions } from "../api";
import {
  formatCurrency,
  getCardWiseSpending,
  getCategoryBreakdown,
  getCurrentMonthStats,
  getMonthlyTrends,
  getRecentTransactions,
} from "../utils/dataAggregation";
import TransactionReviewModal from "./TransactionReviewModal";

const COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#f38181",
  "#aa96da",
  "#fcbad3",
  "#95e1d3",
  "#ffd93d",
];

const Dashboard = ({ resources }) => {
  const {
    token: { colorBgLayout },
  } = theme.useToken();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [ambiguousTransactions, setAmbiguousTransactions] = useState([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await getAllTransactions();
      setTransactions(data || []);
      const currentStats = getCurrentMonthStats(data || []);
      setStats(currentStats);
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
      if (result.success) {
        toast.success(result.message);

        // If there are ambiguous transactions, show review modal
        if (result.needsReview && result.ambiguousTransactions?.length > 0) {
          setAmbiguousTransactions(result.ambiguousTransactions);
          setReviewModalVisible(true);
        } else {
          // Refresh transactions list
          await fetchTransactions();
        }
      } else {
        toast.error(result.message || "Failed to sync transactions");
      }
    } catch (error) {
      toast.error("Failed to sync transactions");
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const monthlyTrends = getMonthlyTrends(transactions, 6);
  const categoryData = getCategoryBreakdown(transactions);
  const cardData = getCardWiseSpending(resources);
  const recentTransactions = getRecentTransactions(transactions, 5);

  const transactionColumns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
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
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right",
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
      render: (type) => (
        <Tag color={type === "credit" ? "green" : "red"}>
          {type?.toUpperCase()}
        </Tag>
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
      {/* Header Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            📊 Dashboard
          </Typography.Title>
          <Typography.Text type="secondary">
            Overview of your expenses and spending patterns
          </Typography.Text>
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

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="fade-in">
            <Statistic
              title="Total Spending"
              value={stats?.spending || 0}
              precision={0}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<ArrowDownOutlined />}
              suffix="₹"
            />
            <div style={{ marginTop: 8, color: "#8c8c8c", fontSize: 12 }}>
              {stats?.month}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="fade-in">
            <Statistic
              title="Total Income"
              value={stats?.income || 0}
              precision={0}
              valueStyle={{ color: "#52c41a" }}
              prefix={<ArrowUpOutlined />}
              suffix="₹"
            />
            <div style={{ marginTop: 8, color: "#8c8c8c", fontSize: 12 }}>
              {stats?.month}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="fade-in">
            <Statistic
              title="Transactions"
              value={stats?.transactionCount || 0}
              prefix={<TransactionOutlined />}
            />
            <div style={{ marginTop: 8, color: "#8c8c8c", fontSize: 12 }}>
              This month
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="fade-in">
            <Statistic
              title="Active Cards"
              value={resources?.cards?.length || 0}
              prefix={<CreditCardOutlined />}
            />
            <div style={{ marginTop: 8, color: "#8c8c8c", fontSize: 12 }}>
              Credit cards
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Monthly Trends */}
        <Col xs={24} lg={16}>
          <Card
            title="Monthly Spending Trends"
            bordered={false}
            className="fade-in"
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ color: "#000" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="spending"
                  stroke="#ff4d4f"
                  strokeWidth={2}
                  name="Spending"
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#52c41a"
                  strokeWidth={2}
                  name="Income"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Category Breakdown */}
        <Col xs={24} lg={8}>
          <Card title="Category Breakdown" bordered={false} className="fade-in">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Card Wise Spending */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card title="Card-wise Spending" bordered={false} className="fade-in">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={cardData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ color: "#000" }}
                />
                <Legend />
                <Bar dataKey="spending" fill="#1890ff" name="Outstanding" />
                <Bar dataKey="limit" fill="#d9d9d9" name="Credit Limit" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Recent Transactions */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title="Recent Transactions"
            bordered={false}
            className="fade-in"
            extra={
              <a href="#transactions" style={{ fontSize: 14 }}>
                View All
              </a>
            }
          >
            <Table
              columns={transactionColumns}
              dataSource={recentTransactions}
              loading={loading}
              pagination={false}
              rowKey="id"
              size="middle"
            />
          </Card>
        </Col>
      </Row>

      {/* Transaction Review Modal */}
      <TransactionReviewModal
        visible={reviewModalVisible}
        ambiguousTransactions={ambiguousTransactions}
        onClose={() => setReviewModalVisible(false)}
        onComplete={() => {
          // Refresh transactions after all reviews are complete
          fetchTransactions();
        }}
      />
    </div>
  );
};

export default Dashboard;
