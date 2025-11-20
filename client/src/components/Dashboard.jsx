import {
  ArrowDownOutlined,
  CreditCardOutlined,
  TransactionOutlined,
} from "@ant-design/icons";
import {
  Card,
  Checkbox,
  Col,
  Empty,
  Row,
  Statistic,
  theme,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAllStatements } from "../api";
import { formatCurrency } from "../utils/dataAggregation";
import {
  getMonthlySpendByCard,
  getMonthlySpendByCardNonCumulative,
  getTotalSpendCurve,
} from "../utils/statementAggregation";

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
  const [statements, setStatements] = useState([]);
  const [visibleCards, setVisibleCards] = useState([]);

  useEffect(() => {
    fetchStatements();
  }, []);

  const fetchStatements = async () => {
    try {
      const data = await getAllStatements();
      setStatements(data || []);
    } catch (error) {
      console.error("Error fetching statements:", error);
    }
  };

  const monthlySpendByCard = getMonthlySpendByCard(statements);
  const monthlySpendNonCumulative =
    getMonthlySpendByCardNonCumulative(statements);
  const totalSpendCurve = getTotalSpendCurve(statements);

  // Extract card names and initialize visible cards
  useEffect(() => {
    if (monthlySpendNonCumulative.length > 0) {
      const cardNames = Object.keys(monthlySpendNonCumulative[0] || {}).filter(
        (key) => key !== "month"
      );
      if (visibleCards.length === 0) {
        setVisibleCards(cardNames);
      }
    }
  }, [monthlySpendNonCumulative]);

  // Toggle card visibility
  const handleCardToggle = (cardName) => {
    setVisibleCards((prev) =>
      prev.includes(cardName)
        ? prev.filter((name) => name !== cardName)
        : [...prev, cardName]
    );
  };

  // Get all card names for checkboxes
  const allCardNames =
    monthlySpendNonCumulative.length > 0
      ? Object.keys(monthlySpendNonCumulative[0] || {}).filter(
          (key) => key !== "month"
        )
      : [];

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
            Overview of your card statements and spending patterns
          </Typography.Text>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false} className="fade-in">
            <Statistic
              title="Total Statements"
              value={statements?.length || 0}
              prefix={<TransactionOutlined />}
            />
            <div style={{ marginTop: 8, color: "#8c8c8c", fontSize: 12 }}>
              Across all cards
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
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
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false} className="fade-in">
            <Statistic
              title="Total Spend"
              value={
                statements?.reduce(
                  (sum, stmt) => sum + (stmt.totalSpend || 0),
                  0
                ) || 0
              }
              precision={0}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<ArrowDownOutlined />}
              suffix="₹"
            />
            <div style={{ marginTop: 8, color: "#8c8c8c", fontSize: 12 }}>
              From statements
            </div>
          </Card>
        </Col>
      </Row>

      {/* Monthly Spend by Card (Non-Cumulative) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card
            title="Monthly Spending by Card"
            bordered={false}
            className="fade-in"
            extra={
              allCardNames.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  {allCardNames.map((cardName, index) => (
                    <Checkbox
                      key={cardName}
                      checked={visibleCards.includes(cardName)}
                      onChange={() => handleCardToggle(cardName)}
                      style={{
                        fontWeight: 500,
                      }}
                    >
                      <span style={{ color: COLORS[index % COLORS.length] }}>
                        ●
                      </span>{" "}
                      {cardName}
                    </Checkbox>
                  ))}
                </div>
              )
            }
          >
            {monthlySpendNonCumulative.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlySpendNonCumulative}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(value), name]}
                    labelStyle={{ color: "#000" }}
                  />
                  <Legend />
                  {Object.keys(monthlySpendNonCumulative[0] || {})
                    .filter(
                      (key) => key !== "month" && visibleCards.includes(key)
                    )
                    .map((cardName, index) => (
                      <Line
                        key={cardName}
                        type="monotone"
                        dataKey={cardName}
                        stroke={
                          COLORS[allCardNames.indexOf(cardName) % COLORS.length]
                        }
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty
                description="No statement data available"
                style={{ padding: "40px 0" }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Cumulative Spend Curves - Side by Side */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title="Total Spend Curve by Card (Cumulative)"
            bordered={false}
            className="fade-in"
          >
            {monthlySpendByCard.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlySpendByCard}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      `Total: ${formatCurrency(value)}`,
                      name,
                    ]}
                    labelStyle={{ color: "#000" }}
                  />
                  <Legend />
                  {Object.keys(monthlySpendByCard[0] || {})
                    .filter((key) => key !== "month")
                    .map((cardName, index) => (
                      <Line
                        key={cardName}
                        type="monotone"
                        dataKey={cardName}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty
                description="No statement data available"
                style={{ padding: "40px 0" }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Total Combined Spend Curve (All Cards)"
            bordered={false}
            className="fade-in"
          >
            {totalSpendCurve.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={totalSpendCurve}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [
                      `Total: ${formatCurrency(value)}`,
                      "Combined Spend",
                    ]}
                    labelStyle={{ color: "#000" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalSpend"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    name="Total Spend (All Cards)"
                    dot={{ r: 5, fill: "#8b5cf6" }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty
                description="No statement data available"
                style={{ padding: "40px 0" }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
