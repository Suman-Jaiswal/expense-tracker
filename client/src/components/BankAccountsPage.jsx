import {
  BankOutlined,
  LeftOutlined,
  PlusOutlined,
  SearchOutlined,
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
  Typography,
  theme,
} from "antd";
import { useMemo, useState } from "react";
import BankAccountCard from "./BankAccountCard";
import BankAccountOverview from "./BankAccountOverview";
import TransactionList from "./TransactionList";

const { Title, Text } = Typography;

export default function BankAccountsPage({ accounts, setResourceIdentifier }) {
  const {
    token: { colorBgLayout, colorText },
  } = theme.useToken();
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [loading] = useState(false);

  // Filter and sort accounts
  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];

    let filtered = accounts.filter((account) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        account.id?.toLowerCase().includes(searchLower) ||
        account.metaData?.accountName?.toLowerCase().includes(searchLower) ||
        account.metaData?.bankName?.toLowerCase().includes(searchLower) ||
        account.metaData?.accountNumber?.includes(searchTerm)
      );
    });

    // Sort accounts
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.metaData?.accountName || a.id).localeCompare(
            b.metaData?.accountName || b.id
          );
        case "bank":
          return (a.metaData?.bankName || "").localeCompare(
            b.metaData?.bankName || ""
          );
        case "balance-high":
          return parseFloat(b.balance || 0) - parseFloat(a.balance || 0);
        case "balance-low":
          return parseFloat(a.balance || 0) - parseFloat(b.balance || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [accounts, searchTerm, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return {
        totalAccounts: 0,
        totalBalance: 0,
        uniqueBanks: 0,
      };
    }

    const totalBalance = accounts.reduce(
      (sum, acc) => sum + parseFloat(acc.balance || 0),
      0
    );
    const uniqueBanks = new Set(
      accounts.map((acc) => acc.metaData?.bankName).filter(Boolean)
    ).size;

    return {
      totalAccounts: accounts.length,
      totalBalance,
      uniqueBanks,
    };
  }, [accounts]);

  const formatCurrency = (amount) => {
    return `₹${Math.abs(amount).toLocaleString("en-IN")}`;
  };

  const handleBack = () => {
    setSelectedAccount(null);
  };

  // If an account is selected, show its details
  if (selectedAccount) {
    return (
      <div style={{ background: colorBgLayout, minHeight: "100vh" }}>
        {/* Back Button */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            background: colorBgLayout,
          }}
        >
          <Button
            icon={<LeftOutlined />}
            onClick={handleBack}
            type="text"
            size="large"
          >
            Back to Accounts
          </Button>
        </div>

        {/* Account Details Tabs */}
        <Tabs
          defaultActiveKey="1"
          style={{ padding: "0 24px" }}
          items={[
            {
              label: (
                <span>
                  <BankOutlined style={{ marginRight: 4 }} />
                  Overview
                </span>
              ),
              key: "1",
              children: <BankAccountOverview account={selectedAccount} />,
            },
            {
              label: "💳 Transactions",
              key: "2",
              children: (
                <TransactionList
                  resourceIdentifier={selectedAccount.resourceIdentifier}
                />
              ),
            },
          ]}
        />
      </div>
    );
  }

  // Show accounts list
  return (
    <div style={{ padding: "24px", background: colorBgLayout }}>
      {loading ? (
        <div style={{ textAlign: "center", padding: "100px 0" }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* Page Header */}
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
              <Title level={2} style={{ margin: 0, color: colorText }}>
                Bank Accounts
              </Title>
              <Text type="secondary">
                Manage your bank accounts and view balances
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => setResourceIdentifier("add_account")}
            >
              Add Account
            </Button>
          </div>

          {/* Statistics Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Total Accounts"
                  value={stats.totalAccounts}
                  prefix={<BankOutlined />}
                  valueStyle={{ color: "#3f8600" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Total Balance"
                  value={formatCurrency(stats.totalBalance)}
                  valueStyle={{ color: "#1890ff" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Unique Banks"
                  value={stats.uniqueBanks}
                  valueStyle={{ color: "#722ed1" }}
                />
              </Card>
            </Col>
          </Row>

          {/* Search and Sort */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} md={16}>
              <Input
                placeholder="Search by account name, bank, or account number..."
                prefix={<SearchOutlined />}
                size="large"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} md={8}>
              <Select
                placeholder="Sort by"
                size="large"
                style={{ width: "100%" }}
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { label: "Name (A-Z)", value: "name" },
                  { label: "Bank Name", value: "bank" },
                  { label: "Balance (High to Low)", value: "balance-high" },
                  { label: "Balance (Low to High)", value: "balance-low" },
                ]}
              />
            </Col>
          </Row>

          {/* Accounts Grid */}
          {filteredAccounts.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                searchTerm
                  ? "No accounts match your search"
                  : "No bank accounts found"
              }
            >
              {!searchTerm && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setResourceIdentifier("add_account")}
                >
                  Add Your First Account
                </Button>
              )}
            </Empty>
          ) : (
            <Row gutter={[16, 24]}>
              {filteredAccounts.map((account) => (
                <Col xs={24} sm={12} lg={8} xl={6} key={account.id}>
                  <BankAccountCard
                    account={account}
                    onClick={() => setSelectedAccount(account)}
                  />
                </Col>
              ))}
            </Row>
          )}
        </>
      )}
    </div>
  );
}
