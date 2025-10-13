import {
  BankOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  DollarOutlined,
  EditOutlined,
  SaveOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Statistic,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import { format } from "date-fns";
import { useState } from "react";
import { updateCard } from "../api";
import { useApp } from "../context/AppContext";
import CardView from "./CardView";

const { Title, Text } = Typography;

export default function OverviewTab({ resource, resourceType }) {
  const {
    token: { colorBgLayout },
  } = theme.useToken();
  const { actions } = useApp();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [isSaving, setIsSaving] = useState(false);

  // Extract card data
  const cardData = {
    id: resource?.id || "N/A",
    creditLimit: parseFloat(resource?.creditLimit || 0),
    outstanding: parseFloat(resource?.outstanding || 0),
    availableCredit: parseFloat(resource?.availableCredit || 0),
    billingDate: resource?.billingDate || "N/A",
    dueDate: resource?.dueDate || "N/A",
    lastBillAmount: parseFloat(resource?.lastBillAmount || 0),
    lastBilledDate: resource?.lastBilledDate || "N/A",
    metaData: resource?.metaData || {},
  };

  // Calculate statistics
  const utilization =
    cardData.creditLimit > 0
      ? ((cardData.outstanding / cardData.creditLimit) * 100).toFixed(1)
      : 0;

  const formatCurrency = (amount) => {
    return `₹${Math.abs(amount).toLocaleString("en-IN")}`;
  };

  const getUtilizationColor = (util) => {
    if (util > 70) return "#ef4444";
    if (util > 50) return "#f59e0b";
    return "#10b981";
  };

  const getUtilizationStatus = (util) => {
    if (util > 70) return { text: "High", color: "red" };
    if (util > 50) return { text: "Medium", color: "orange" };
    return { text: "Low", color: "green" };
  };

  const handleEdit = () => {
    editForm.setFieldsValue({
      creditLimit: cardData.creditLimit,
      outstanding: cardData.outstanding,
      billingDate: cardData.billingDate,
      dueDate: cardData.dueDate,
      cardName: cardData.metaData.cardName,
      cardType: cardData.metaData.cardType,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);
      const values = await editForm.validateFields();

      // Update card in Firebase
      await updateCard(resource.id, values);

      // Refresh resources to show updated data
      await actions.fetchResources();

      message.success("Card details updated successfully!");
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating card:", error);
      message.error(
        error.message || "Failed to update card. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const utilizationStatus = getUtilizationStatus(utilization);

  return (
    <div style={{ padding: "24px", background: colorBgLayout }}>
      {/* Header with Edit Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Card Overview
        </Title>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={handleEdit}
          size="large"
        >
          Edit Card Details
        </Button>
      </div>

      {/* Card Visual */}
      <Row gutter={[24, 24]} justify="start">
        <Col xs={24} lg={12}>
          <div style={{ maxWidth: 450, margin: "0 auto" }}>
            <CardView content={cardData.metaData} />
          </div>
        </Col>

        {/* Credit Summary */}
        <Col xs={24} lg={12}>
          <div style={{ maxWidth: 450, margin: "0 auto" }}>
            <Card
              title={
                <span>
                  <DollarOutlined style={{ marginRight: 8 }} />
                  Credit Summary
                </span>
              }
              bordered={false}
              style={{ height: "100%" }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="Credit Limit"
                    value={formatCurrency(cardData.creditLimit)}
                    valueStyle={{ color: "#3f8600", fontSize: 18 }}
                    prefix={<BankOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Outstanding"
                    value={formatCurrency(cardData.outstanding)}
                    valueStyle={{ color: "#cf1322", fontSize: 18 }}
                    prefix={<WarningOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Available Credit"
                    value={formatCurrency(cardData.availableCredit)}
                    valueStyle={{ color: "#1890ff", fontSize: 18 }}
                  />
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      Utilization
                    </Text>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 600,
                        color: getUtilizationColor(utilization),
                      }}
                    >
                      {utilization}%
                    </div>
                    <Tag color={utilizationStatus.color}>
                      {utilizationStatus.text}
                    </Tag>
                  </div>
                </Col>
              </Row>

              <div style={{ marginTop: 24 }}>
                <Text
                  type="secondary"
                  style={{ marginBottom: 8, display: "block" }}
                >
                  Credit Utilization
                </Text>
                <Progress
                  percent={parseFloat(utilization)}
                  strokeColor={{
                    "0%": getUtilizationColor(0),
                    "50%": getUtilizationColor(50),
                    "100%": getUtilizationColor(100),
                  }}
                  status={utilization > 70 ? "exception" : "active"}
                />
              </div>
            </Card>
          </div>
        </Col>
      </Row>

      {/* Billing Information */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }} justify="start">
        <Col xs={24} lg={12}>
          <div style={{ maxWidth: 450, margin: "0 auto" }}>
            <Card
              title={
                <span>
                  <CalendarOutlined style={{ marginRight: 8 }} />
                  Billing Information
                </span>
              }
              bordered={false}
            >
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Billing Date">
                  <Tag color="blue">Day {cardData.billingDate} of Month</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Payment Due Date">
                  <Tag color="orange">Day {cardData.dueDate} of Month</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Last Bill Amount">
                  <Text strong style={{ color: "#cf1322" }}>
                    {formatCurrency(cardData.lastBillAmount)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Last Billed Date">
                  {cardData.lastBilledDate !== "N/A"
                    ? format(new Date(cardData.lastBilledDate), "MMM dd, yyyy")
                    : "N/A"}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </div>
        </Col>

        {/* Card Details */}
        <Col xs={24} lg={12}>
          <div style={{ maxWidth: 450, margin: "0 auto" }}>
            <Card
              title={
                <span>
                  <CreditCardOutlined style={{ marginRight: 8 }} />
                  Card Details
                </span>
              }
              bordered={false}
            >
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Card ID">
                  <Text code>{cardData.id}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Card Name">
                  {cardData.metaData.cardName || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Card Type">
                  <Tag color="purple">
                    {cardData.metaData.cardType || "N/A"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Bank">
                  {cardData.metaData.bankName || "N/A"}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </div>
        </Col>
      </Row>

      {/* Edit Modal */}
      <Modal
        title={
          <span>
            <EditOutlined style={{ marginRight: 8 }} />
            Edit Card Details
          </span>
        }
        open={isEditModalOpen}
        onCancel={() => !isSaving && setIsEditModalOpen(false)}
        closable={!isSaving}
        footer={[
          <Button
            key="cancel"
            onClick={() => setIsEditModalOpen(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveEdit}
            loading={isSaving}
          >
            Save Changes
          </Button>,
        ]}
        width={600}
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Card Name"
                name="cardName"
                rules={[{ required: true, message: "Please enter card name" }]}
              >
                <Input placeholder="e.g., Flipkart Axis Bank Credit Card" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Card Type"
                name="cardType"
                rules={[{ required: true, message: "Please enter card type" }]}
              >
                <Input placeholder="e.g., Platinum, Gold, etc." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Credit Limit"
                name="creditLimit"
                rules={[
                  { required: true, message: "Please enter credit limit" },
                ]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  prefix="₹"
                  min={0}
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => value.replace(/\₹\s?|(,*)/g, "")}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Outstanding"
                name="outstanding"
                rules={[
                  { required: true, message: "Please enter outstanding" },
                ]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  prefix="₹"
                  min={0}
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => value.replace(/\₹\s?|(,*)/g, "")}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Billing Date"
                name="billingDate"
                rules={[
                  { required: true, message: "Please enter billing date" },
                ]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={1}
                  max={31}
                  placeholder="Day of month"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Due Date"
                name="dueDate"
                rules={[{ required: true, message: "Please enter due date" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={1}
                  max={31}
                  placeholder="Day of month"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
