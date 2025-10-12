import {
  CalendarOutlined,
  EyeOutlined,
  FilePdfFilled,
  FilePdfTwoTone,
  FolderOpenOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Spin,
  Statistic,
  Tabs,
  Tag,
  theme,
  Typography,
} from "antd";
import Meta from "antd/es/card/Meta";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { getAllStatements } from "../api";
import { PdfViewer } from "./PdfViewer";

const { Title, Text } = Typography;
const { Option } = Select;

export default function Statements({ view = "tab", cardSelected }) {
  const {
    token: { colorBgLayout },
  } = theme.useToken();
  const [statements, setStatements] = useState([]);
  const [filteredStatements, setFilterStatements] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");

  useEffect(() => {
    setLoading(true);
    getAllStatements()
      .then((data) => {
        setStatements(data || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }, []);

  // Filter and sort statements
  useEffect(() => {
    let filtered = statements;

    // Filter by selected card
    if (cardSelected) {
      filtered = filtered.filter((statement) =>
        statement.resourceIdentifier.includes(cardSelected)
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (statement) =>
          statement.resourceIdentifier
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          statement.period?.end
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Sort statements
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "date-desc") {
        return new Date(b.period?.end) - new Date(a.period?.end);
      } else if (sortBy === "date-asc") {
        return new Date(a.period?.end) - new Date(b.period?.end);
      } else if (sortBy === "name-asc") {
        return a.resourceIdentifier.localeCompare(b.resourceIdentifier);
      } else if (sortBy === "name-desc") {
        return b.resourceIdentifier.localeCompare(a.resourceIdentifier);
      }
      return 0;
    });

    setFilterStatements(sorted);
  }, [cardSelected, statements, searchTerm, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const uniqueCards = new Set(statements.map((s) => s.resourceIdentifier))
      .size;
    const currentYear = new Date().getFullYear();
    const thisYearStatements = statements.filter(
      (s) => new Date(s.period?.end).getFullYear() === currentYear
    );

    return {
      total: statements.length,
      uniqueCards,
      thisYear: thisYearStatements.length,
    };
  }, [statements]);

  const showModal = (statement) => {
    setSelectedStatement(statement);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedStatement(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "MMM yyyy");
    } catch {
      return dateStr;
    }
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
        <Spin size="large" tip="Loading statements..." />
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
      {/* Header Section */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          📄 Statements
        </Title>
        <Text type="secondary">
          View and manage all your credit card statements
        </Text>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="fade-in">
            <Statistic
              title="Total Statements"
              value={stats.total}
              prefix={<FilePdfTwoTone twoToneColor="#6366f1" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="fade-in">
            <Statistic
              title="This Year"
              value={stats.thisYear}
              prefix={<CalendarOutlined style={{ color: "#10b981" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="fade-in">
            <Statistic
              title="Credit Cards"
              value={stats.uniqueCards}
              prefix={<FolderOpenOutlined style={{ color: "#f59e0b" }} />}
            />
          </Card>
        </Col>
      </Row>

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
              placeholder="Search by card name or period..."
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
              <Option value="date-desc">📅 Newest First</Option>
              <Option value="date-asc">📅 Oldest First</Option>
              <Option value="name-asc">🔤 Name (A-Z)</Option>
              <Option value="name-desc">🔤 Name (Z-A)</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Statements Content */}
      {filteredStatements.length === 0 ? (
        <Card bordered={false}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                <Text type="secondary">
                  {searchTerm
                    ? "No statements found matching your search"
                    : "No statements available"}
                </Text>
              </span>
            }
          />
        </Card>
      ) : view === "tab" ? (
        <Card bordered={false} style={{ minHeight: "60vh" }}>
          <Tabs
            defaultActiveKey="0"
            tabPosition={"left"}
            style={{ minHeight: "50vh" }}
            items={filteredStatements.map((statement, i) => {
              const id = String(i);
              return {
                label: (
                  <div style={{ textAlign: "left", padding: "4px 0" }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {statement.resourceIdentifier}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(statement.period?.end)}
                    </Text>
                  </div>
                ),
                key: id,
                children: <PdfViewer statement={statement} />,
                icon: <FilePdfFilled />,
              };
            })}
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredStatements.map((statement, i) => {
            const id = String(i);
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={id}>
                <Badge.Ribbon
                  text={formatDate(statement.period?.end)}
                  color="#6366f1"
                >
                  <Card
                    hoverable
                    className="fade-in"
                    style={{
                      height: "100%",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                    bodyStyle={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      padding: "24px 16px",
                    }}
                    onClick={() => showModal(statement)}
                  >
                    <FilePdfTwoTone
                      twoToneColor="#6366f1"
                      style={{
                        fontSize: 48,
                        marginBottom: 16,
                      }}
                    />
                    <Meta
                      title={
                        <div style={{ textAlign: "center", marginBottom: 8 }}>
                          <Text strong style={{ fontSize: 14 }}>
                            {statement.resourceIdentifier}
                          </Text>
                        </div>
                      }
                      description={
                        <div style={{ textAlign: "center" }}>
                          <Tag color="blue" icon={<CalendarOutlined />}>
                            {formatDate(statement.period?.end)}
                          </Tag>
                        </div>
                      }
                    />
                    <div
                      style={{
                        marginTop: 16,
                        display: "flex",
                        gap: 8,
                        width: "100%",
                      }}
                    >
                      <Button
                        type="primary"
                        size="small"
                        icon={<EyeOutlined />}
                        block
                        onClick={(e) => {
                          e.stopPropagation();
                          showModal(statement);
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </Card>
                </Badge.Ribbon>
              </Col>
            );
          })}
        </Row>
      )}
      {/* Statement Modal */}
      <Modal
        width={900}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <FilePdfTwoTone twoToneColor="#6366f1" style={{ fontSize: 24 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {selectedStatement?.resourceIdentifier}
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {formatDate(selectedStatement?.period?.end)}
              </Text>
            </div>
          </div>
        }
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        centered
        styles={{
          body: { maxHeight: "70vh", overflow: "auto" },
        }}
      >
        <PdfViewer statement={selectedStatement} />
      </Modal>
    </div>
  );
}
