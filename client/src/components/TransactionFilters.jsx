import {
  ClearOutlined,
  DownloadOutlined,
  FilterOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Tag,
} from "antd";
import { endOfMonth, startOfMonth, subDays, subMonths } from "date-fns";
import { useState } from "react";
import toast from "react-hot-toast";
import { exportToCSV, exportToJSON } from "../utils/exportData";

const { RangePicker } = DatePicker;

const TransactionFilters = ({ onFilterChange, cards, transactions }) => {
  const [searchText, setSearchText] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [minAmount, setMinAmount] = useState(null);
  const [maxAmount, setMaxAmount] = useState(null);
  const [transactionType, setTransactionType] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Apply filters
  const applyFilters = () => {
    const filters = {
      searchText: searchText.trim(),
      selectedCard,
      dateRange,
      minAmount,
      maxAmount,
      transactionType,
    };
    onFilterChange(filters);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchText("");
    setSelectedCard(null);
    setDateRange(null);
    setMinAmount(null);
    setMaxAmount(null);
    setTransactionType(null);
    onFilterChange({});
  };

  // Quick filter presets
  const applyQuickFilter = (type) => {
    const today = new Date();
    let start, end;

    switch (type) {
      case "today":
        start = today;
        end = today;
        break;
      case "last7":
        start = subDays(today, 7);
        end = today;
        break;
      case "last30":
        start = subDays(today, 30);
        end = today;
        break;
      case "thisMonth":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "lastMonth": {
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      }
      default:
        return;
    }

    setDateRange([start, end]);
    onFilterChange({
      searchText: searchText.trim(),
      selectedCard,
      dateRange: [start, end],
      minAmount,
      maxAmount,
      transactionType,
    });

    toast.success(`Filter applied: ${type}`);
  };

  // Export handlers
  const handleExport = (format) => {
    if (!transactions || transactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const success =
      format === "csv"
        ? exportToCSV(transactions, "transactions")
        : exportToJSON(transactions, "transactions");

    if (success) {
      toast.success(
        `Exported ${
          transactions.length
        } transactions as ${format.toUpperCase()}`
      );
    } else {
      toast.error("Export failed");
    }
  };

  const exportMenuItems = [
    {
      key: "csv",
      label: "Export as CSV",
      icon: <DownloadOutlined />,
      onClick: () => handleExport("csv"),
    },
    {
      key: "json",
      label: "Export as JSON",
      icon: <DownloadOutlined />,
      onClick: () => handleExport("json"),
    },
  ];

  const quickFilters = [
    { key: "today", label: "Today" },
    { key: "last7", label: "Last 7 Days" },
    { key: "last30", label: "Last 30 Days" },
    { key: "thisMonth", label: "This Month" },
    { key: "lastMonth", label: "Last Month" },
  ];

  const activeFiltersCount = [
    searchText,
    selectedCard,
    dateRange,
    minAmount,
    maxAmount,
    transactionType,
  ].filter(Boolean).length;

  return (
    <Card
      size="small"
      style={{ marginBottom: 16 }}
      title={
        <Space>
          <FilterOutlined />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <Tag color="blue">{activeFiltersCount} active</Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          <Button
            size="small"
            onClick={() => setIsExpanded(!isExpanded)}
            type="link"
          >
            {isExpanded ? "Hide" : "Show"} Filters
          </Button>
          <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
            <Button size="small" icon={<DownloadOutlined />}>
              Export
            </Button>
          </Dropdown>
        </Space>
      }
    >
      {/* Quick Filters */}
      <Space wrap style={{ marginBottom: isExpanded ? 16 : 0 }}>
        {quickFilters.map((filter) => (
          <Button
            key={filter.key}
            size="small"
            onClick={() => applyQuickFilter(filter.key)}
          >
            {filter.label}
          </Button>
        ))}
      </Space>

      {/* Advanced Filters */}
      {isExpanded && (
        <>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            {/* Search */}
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Search merchant or description..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={applyFilters}
                allowClear
              />
            </Col>

            {/* Card Filter */}
            <Col xs={24} sm={12} md={8}>
              <Select
                placeholder="Select Card"
                style={{ width: "100%" }}
                value={selectedCard}
                onChange={setSelectedCard}
                allowClear
                options={[
                  { label: "All Cards", value: null },
                  ...(cards?.map((card) => ({
                    label: card.id,
                    value: card.resourceIdentifier,
                  })) || []),
                ]}
              />
            </Col>

            {/* Transaction Type */}
            <Col xs={24} sm={12} md={8}>
              <Select
                placeholder="Transaction Type"
                style={{ width: "100%" }}
                value={transactionType}
                onChange={setTransactionType}
                allowClear
                options={[
                  { label: "All Types", value: null },
                  { label: "Debit", value: "debit" },
                  { label: "Credit", value: "credit" },
                ]}
              />
            </Col>

            {/* Date Range */}
            <Col xs={24} sm={12} md={8}>
              <RangePicker
                style={{ width: "100%" }}
                value={dateRange}
                onChange={setDateRange}
                format="MMM DD, YYYY"
              />
            </Col>

            {/* Amount Range */}
            <Col xs={24} sm={12} md={8}>
              <Space.Compact style={{ width: "100%" }}>
                <InputNumber
                  placeholder="Min Amount"
                  style={{ width: "50%" }}
                  value={minAmount}
                  onChange={setMinAmount}
                  prefix="₹"
                  min={0}
                />
                <InputNumber
                  placeholder="Max Amount"
                  style={{ width: "50%" }}
                  value={maxAmount}
                  onChange={setMaxAmount}
                  prefix="₹"
                  min={0}
                />
              </Space.Compact>
            </Col>

            {/* Action Buttons */}
            <Col xs={24} sm={12} md={8}>
              <Space>
                <Button
                  type="primary"
                  onClick={applyFilters}
                  icon={<FilterOutlined />}
                >
                  Apply Filters
                </Button>
                <Button onClick={clearFilters} icon={<ClearOutlined />}>
                  Clear
                </Button>
              </Space>
            </Col>
          </Row>
        </>
      )}
    </Card>
  );
};

export default TransactionFilters;
