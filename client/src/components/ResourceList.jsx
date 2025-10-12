import {
  BankOutlined,
  CreditCardOutlined,
  DollarOutlined,
  PlusOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Progress,
  Row,
  Select,
  Spin,
  Statistic,
  Tabs,
  Tag,
  theme,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { featureFlag } from "../featureFlag";
import CardView from "./CardView";
import OverviewTab from "./OverviewTab";
import TransactionList from "./TransactionList";

const { Title, Text } = Typography;
const { Option } = Select;

export default function ResourceList({
  resource = [],
  resourceType = "cards",
  resourceTitle = "Credit Cards",
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

  useEffect(() => {
    setSelectedResource(null);
    setBreadcrumbItems([{ title: resourceTitle }]);
  }, [resource, resourceTitle]);

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
      avgUtilization: Math.round(avgUtilization),
      availableCredit: totalLimit - totalOutstanding,
    };
  }, [resource, resourceType]);

  const formatCurrency = (amount) => {
    return `₹${Math.abs(amount).toLocaleString("en-IN")}`;
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
          <div style={{ marginBottom: 24 }}>
            <Title level={2} style={{ margin: 0 }}>
              💳 {resourceTitle}
            </Title>
            <Text type="secondary">
              Manage your credit cards and track spending limits
            </Text>
          </div>

          {/* Statistics Cards for Credit Cards */}
          {resourceType === "cards" && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card bordered={false} className="fade-in">
                  <Statistic
                    title="Total Cards"
                    value={stats.total}
                    prefix={<CreditCardOutlined style={{ color: "#6366f1" }} />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card bordered={false} className="fade-in">
                  <Statistic
                    title="Total Credit Limit"
                    value={formatCurrency(stats.totalLimit)}
                    prefix={<BankOutlined style={{ color: "#10b981" }} />}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card bordered={false} className="fade-in">
                  <Statistic
                    title="Total Outstanding"
                    value={formatCurrency(stats.totalOutstanding)}
                    prefix={<DollarOutlined style={{ color: "#ef4444" }} />}
                    valueStyle={{ fontSize: 20, color: "#ef4444" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card bordered={false} className="fade-in">
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
                      color: stats.avgUtilization > 70 ? "#ef4444" : "#f59e0b",
                    }}
                  />
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
                      <CardView content={item.metaData} />
                      {resourceType === "cards" && (
                        <Card
                          bordered={false}
                          style={{
                            marginTop: 8,
                            borderRadius: 8,
                          }}
                          bodyStyle={{ padding: "12px 16px" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Credit Utilization
                            </Text>
                            <Tag
                              color={
                                (parseFloat(item.outstanding || 0) /
                                  parseFloat(item.creditLimit || 1)) *
                                  100 >
                                70
                                  ? "red"
                                  : (parseFloat(item.outstanding || 0) /
                                      parseFloat(item.creditLimit || 1)) *
                                      100 >
                                    50
                                  ? "orange"
                                  : "green"
                              }
                            >
                              {(
                                (parseFloat(item.outstanding || 0) /
                                  parseFloat(item.creditLimit || 1)) *
                                100
                              ).toFixed(1)}
                              %
                            </Tag>
                          </div>
                          <Progress
                            percent={parseFloat(
                              (
                                (parseFloat(item.outstanding || 0) /
                                  parseFloat(item.creditLimit || 1)) *
                                100
                              ).toFixed(1)
                            )}
                            strokeColor={{
                              "0%": "#6366f1",
                              "100%": "#8b5cf6",
                            }}
                            showInfo={false}
                          />
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginTop: 8,
                            }}
                          >
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              Outstanding:{" "}
                              {formatCurrency(item.outstanding || 0)}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              Limit: {formatCurrency(item.creditLimit || 0)}
                            </Text>
                          </div>
                        </Card>
                      )}
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
