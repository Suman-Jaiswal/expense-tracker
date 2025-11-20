import {
  BankOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Spin,
  Statistic,
  Tabs,
  theme,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { featureFlag } from "../featureFlag";
import { fetchLatestBills } from "../services/googleSheets";
import CardView from "./CardView";
import OverviewTab from "./OverviewTab";
import TransactionList from "./TransactionList";

const { Title, Text } = Typography;
const { Option } = Select;

export default function ResourceList({
  resource = [],
  resourceType = "cards",
  resourceTitle = "Credit Cards",
  setResourceIdentifier,
}) {
  const {
    token: { colorBgLayout },
  } = theme.useToken();
  const [breadcrumbItems, setBreadcrumbItems] = useState([
    { title: resourceTitle },
  ]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [loading] = useState(false);
  const [latestBills, setLatestBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billsError, setBillsError] = useState(null);

  useEffect(() => {
    setSelectedResource(null);
    setBreadcrumbItems([{ title: resourceTitle }]);
  }, [resource, resourceTitle]);

  // Fetch latest bills from Google Sheets
  const fetchBills = async () => {
    try {
      setBillsLoading(true);
      setBillsError(null);
      const data = await fetchLatestBills();

      console.log("📊 Raw data from Google Sheets:", data);
      console.log("📊 First bill sample:", data[0]);
      console.log(
        "💳 Available cards:",
        resource.map((card) => ({
          id: card.id,
          resourceIdentifier: card.resourceIdentifier,
        }))
      );

      // Transform data to match card resourceIdentifiers
      const billsMap = {};
      data.forEach((bill, index) => {
        console.log(`\n📋 Processing bill ${index}:`);
        console.log(`  Available keys:`, Object.keys(bill));
        console.log(`  Full bill object:`, bill);

        // Try all possible column name variations (including spaces)
        const cardId =
          bill["Card Number "] || // trailing space
          bill[" Card Number "] || // leading and trailing spaces
          bill["Card Number"] || // no spaces
          bill.CardID ||
          bill.Card ||
          bill.card_id ||
          bill.cardId ||
          bill["Card ID"];

        const dateRaw = bill["Due Date"] || bill.Date || bill.date || bill.DATE;
        const date = dateRaw ? String(dateRaw) : "";

        // Helper function to parse numeric values (handles strings with commas)
        const parseAmount = (value) => {
          if (!value) return 0;
          // Remove commas and convert to float
          const cleanValue = String(value).replace(/,/g, "");
          const parsed = parseFloat(cleanValue);
          return isNaN(parsed) ? 0 : parsed;
        };

        // Get raw values from sheet
        const rawBillAmount =
          bill["Total Amount Due "] || // trailing space only
          bill[" Total Amount Due "] || // leading and trailing spaces
          bill["Total Amount Due"] || // no spaces
          bill.BillAmount ||
          bill.bill_amount ||
          bill["Bill Amount"] ||
          bill.billAmount ||
          "";

        const rawMinimumDue =
          bill["Minimum Amount Due"] || bill["Minimum Due"] || "";

        // Parse the amounts
        const billAmount = parseAmount(rawBillAmount);
        const outstanding = billAmount; // Use same value
        const minimumDue = parseAmount(rawMinimumDue);

        console.log(
          `  → CardID: "${cardId}", Date: "${date}" (type: ${typeof date}, value: ${JSON.stringify(
            date
          )})`
        );
        console.log(
          `  → Raw Total Amount Due: "${rawBillAmount}" (type: ${typeof rawBillAmount})`
        );
        console.log(
          `  → Raw Minimum Amount Due: "${rawMinimumDue}" (type: ${typeof rawMinimumDue})`
        );
        console.log(
          `  → Parsed values - BillAmount: ${billAmount}, Outstanding: ${outstanding}, MinimumDue: ${minimumDue}`
        );

        if (cardId) {
          // Map using resourceIdentifier format: card_BANKNAME_XXDIGITS
          const resourceIdentifier = `card_${cardId}`;
          billsMap[resourceIdentifier] = {
            date,
            billAmount,
            outstanding,
            minimumDue,
            lastUpdated: new Date().toISOString(),
          };
          console.log(
            `  ✓ Mapped to resourceIdentifier: ${resourceIdentifier}`
          );
        } else {
          console.warn(
            `  ⚠️ No CardID found for bill ${index}. Available keys:`,
            Object.keys(bill)
          );
        }
      });

      console.log("📦 Final billsMap before setting state:", billsMap);
      console.log(`📦 BillsMap keys:`, Object.keys(billsMap));
      setLatestBills(billsMap);
      console.log("✅ Latest bills loaded:", billsMap);
      console.log(`✅ Mapped ${Object.keys(billsMap).length} bills to cards`);
    } catch (error) {
      console.error("Error fetching latest bills:", error);
      setBillsError(error.message);
      if (!error.message.includes("API key")) {
        toast.error("Failed to fetch latest bills from Google Sheets");
      }
    } finally {
      setBillsLoading(false);
    }
  };

  useEffect(() => {
    if (resourceType === "cards") {
      fetchBills();
    }
  }, [resourceType]);

  // Filter and sort resources
  const filteredResources = useMemo(() => {
    let filtered = [...resource];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.metaData?.cardName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          item.metaData?.cardType
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Sort resources
    filtered.sort((a, b) => {
      if (sortBy === "name-asc") {
        return (a.id || "").localeCompare(b.id || "");
      } else if (sortBy === "name-desc") {
        return (b.id || "").localeCompare(a.id || "");
      } else if (sortBy === "limit-desc") {
        return parseFloat(b.creditLimit || 0) - parseFloat(a.creditLimit || 0);
      } else if (sortBy === "outstanding-desc") {
        return parseFloat(b.outstanding || 0) - parseFloat(a.outstanding || 0);
      } else if (sortBy === "utilization-desc") {
        const utilA =
          (parseFloat(a.outstanding || 0) / parseFloat(a.creditLimit || 1)) *
          100;
        const utilB =
          (parseFloat(b.outstanding || 0) / parseFloat(b.creditLimit || 1)) *
          100;
        return utilB - utilA;
      }
      return 0;
    });

    return filtered;
  }, [resource, searchTerm, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (resourceType !== "cards") {
      return {
        total: resource.length,
      };
    }

    const totalLimit = resource.reduce(
      (sum, card) => sum + parseFloat(card.creditLimit || 0),
      0
    );
    const totalOutstanding = resource.reduce(
      (sum, card) => sum + parseFloat(card.outstanding || 0),
      0
    );

    console.log(
      "💳 Card outstanding values:",
      resource.map((card) => ({
        id: card.id,
        outstanding: card.outstanding,
        creditLimit: card.creditLimit,
      }))
    );

    // Calculate total amount due from Google Sheets data
    const totalAmountDue = Object.values(latestBills).reduce(
      (sum, bill) => sum + parseFloat(bill.billAmount || 0),
      0
    );
    console.log("💰 Total Amount Due calculation:", {
      latestBillsCount: Object.keys(latestBills).length,
      billAmounts: Object.values(latestBills).map((b) => b.billAmount),
      totalAmountDue,
    });

    const avgUtilization =
      resource.length > 0
        ? resource.reduce((sum, card) => {
            const util =
              (parseFloat(card.outstanding || 0) /
                parseFloat(card.creditLimit || 1)) *
              100;
            return sum + util;
          }, 0) / resource.length
        : 0;

    return {
      total: resource.length,
      totalLimit,
      totalOutstanding,
      totalAmountDue,
      avgUtilization: Math.round(avgUtilization),
      availableCredit: totalLimit - totalOutstanding,
    };
  }, [resource, resourceType, latestBills]);

  const formatCurrency = (amount) => {
    return `₹${Math.abs(amount).toLocaleString("en-IN")}`;
  };

  const formatLakhs = (amount) => {
    const lakhs = Math.abs(amount) / 100000;
    return `${lakhs.toFixed(2)}L`;
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <Spin size="large" tip="Loading cards..." />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        background: colorBgLayout,
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {selectedResource ? (
        <div>
          <Button
            onClick={() => {
              setSelectedResource(null);
              setBreadcrumbItems([{ title: resourceTitle }]);
            }}
            style={{ marginBottom: 16 }}
          >
            ← Back to {resourceTitle}
          </Button>
          <Tabs
            tabPosition={"top"}
            style={{ padding: "0 24px" }}
            items={[
              {
                label: "Overview",
                key: "1",
                children: (
                  <OverviewTab
                    resource={selectedResource}
                    resourceType={resourceType}
                  />
                ),
              },
              {
                label: "Transactions",
                key: "2",
                children: (
                  <TransactionList
                    resourceIdentifier={selectedResource.resourceIdentifier}
                  />
                ),
              },
            ]}
          />
        </div>
      ) : (
        <>
          {/* Header Section */}
          <div
            style={{
              marginBottom: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <Title level={2} style={{ margin: 0 }}>
                💳 {resourceTitle}
              </Title>
              <Text type="secondary">
                Manage your credit cards and track spending limits
              </Text>
            </div>
            {resourceType === "cards" && setResourceIdentifier && (
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  icon={<ReloadOutlined spin={billsLoading} />}
                  onClick={() => fetchBills()}
                  loading={billsLoading}
                >
                  Sync Bills
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => setResourceIdentifier("add_card")}
                >
                  Add Card
                </Button>
              </div>
            )}
          </div>

          {/* Statistics Cards for Credit Cards */}
          {resourceType === "cards" && (
            <Row gutter={[8, 8]} style={{ marginBottom: 24 }}>
              <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
                <Card
                  bordered={false}
                  className="fade-in"
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  bodyStyle={{
                    flex: 1,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    padding: "16px",
                  }}
                >
                  <div style={{ width: "100%" }}>
                    <Statistic
                      title="Total Cards"
                      value={stats.total}
                      prefix={
                        <CreditCardOutlined style={{ color: "#6366f1" }} />
                      }
                    />
                  </div>
                </Card>
              </Col>
              <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
                <Card
                  bordered={false}
                  className="fade-in"
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  bodyStyle={{
                    flex: 1,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    padding: "16px",
                  }}
                >
                  <div style={{ width: "100%" }}>
                    <Statistic
                      title="Total Credit Limit"
                      value={formatLakhs(stats.totalLimit)}
                      prefix={<BankOutlined style={{ color: "#10b981" }} />}
                    />
                  </div>
                </Card>
              </Col>
              <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
                <Card
                  bordered={false}
                  className="fade-in"
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  bodyStyle={{
                    flex: 1,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    padding: "16px",
                  }}
                >
                  <div style={{ width: "100%" }}>
                    <Statistic
                      title="Total Latest Bills"
                      value={formatCurrency(stats.totalAmountDue || 0)}
                      prefix={<FileTextOutlined style={{ color: "#ef4444" }} />}
                      valueStyle={{ color: "#ef4444" }}
                    />
                    {billsLoading && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 10,
                          color: "#8c8c8c",
                          opacity: 0.8,
                          textAlign: "left",
                        }}
                      >
                        Syncing...
                      </div>
                    )}
                    {!billsLoading && stats.totalAmountDue === 0 && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 10,
                          color: "#8c8c8c",
                          opacity: 0.8,
                          textAlign: "left",
                        }}
                      >
                        Click Sync Bills
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
              <Col xs={12} sm={12} lg={6} style={{ display: "flex" }}>
                <Card
                  bordered={false}
                  className="fade-in"
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  bodyStyle={{
                    flex: 1,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    padding: "16px",
                  }}
                >
                  <div style={{ width: "100%" }}>
                    <Statistic
                      title="Avg Utilization"
                      value={stats.avgUtilization}
                      suffix="%"
                      prefix={
                        <WarningOutlined
                          style={{
                            color:
                              stats.avgUtilization > 70 ? "#ef4444" : "#f59e0b",
                          }}
                        />
                      }
                      valueStyle={{
                        color:
                          stats.avgUtilization > 70 ? "#ef4444" : "#f59e0b",
                      }}
                    />
                  </div>
                </Card>
              </Col>
            </Row>
          )}

          {/* Search and Filters */}
          <Card
            bordered={false}
            style={{ marginBottom: 24 }}
            bodyStyle={{ padding: "16px" }}
          >
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={12}>
                <Input
                  size="large"
                  placeholder="Search by card name or type..."
                  prefix={<SearchOutlined />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                  style={{ borderRadius: 8 }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Select
                  size="large"
                  style={{ width: "100%", borderRadius: 8 }}
                  value={sortBy}
                  onChange={setSortBy}
                  placeholder="Sort by"
                >
                  <Option value="name-asc">🔤 Name (A-Z)</Option>
                  <Option value="name-desc">🔤 Name (Z-A)</Option>
                  <Option value="limit-desc">💰 Highest Limit</Option>
                  <Option value="outstanding-desc">
                    📊 Highest Outstanding
                  </Option>
                  <Option value="utilization-desc">
                    ⚠️ Highest Utilization
                  </Option>
                </Select>
              </Col>
            </Row>
          </Card>

          {/* Cards Grid */}
          {filteredResources.length === 0 ? (
            <Card bordered={false}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    <Text type="secondary">
                      {searchTerm
                        ? "No cards found matching your search"
                        : "No cards available"}
                    </Text>
                  </span>
                }
              >
                {!searchTerm && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {}}
                  >
                    Add Credit Card
                  </Button>
                )}
              </Empty>
            </Card>
          ) : (
            <>
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {filteredResources.map((item) => (
                  <Col xs={24} sm={12} lg={8} key={item.id}>
                    <div
                      style={{
                        cursor: "pointer",
                        position: "relative",
                      }}
                      onClick={() => {
                        setBreadcrumbItems([
                          {
                            title: resourceTitle,
                            onClick: () => {
                              setSelectedResource(null);
                              setBreadcrumbItems([{ title: resourceTitle }]);
                            },
                            path: "/",
                          },
                          { title: item.id || "Card" },
                        ]);
                        featureFlag.isSideMenuEnabled &&
                          setSelectedResource(item);
                      }}
                    >
                      <CardView
                        content={item.metaData}
                        billAmount={
                          latestBills[item.resourceIdentifier]?.billAmount ||
                          null
                        }
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            </>
          )}
        </>
      )}
    </div>
  );
}
