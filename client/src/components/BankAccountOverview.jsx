import {
  BankOutlined,
  EditOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  WalletOutlined,
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
  Row,
  Statistic,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import { useState } from "react";
import { updateBankAccount } from "../api";
import { useApp } from "../context/AppContext";
import BankAccountCard from "./BankAccountCard";

const { Title, Text } = Typography;

export default function BankAccountOverview({ account }) {
  const {
    token: { colorBgLayout },
  } = theme.useToken();
  const { actions } = useApp();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [isSaving, setIsSaving] = useState(false);

  // Extract account data
  const accountData = {
    id: account?.id || "N/A",
    balance: parseFloat(account?.balance || 0),
    metaData: account?.metaData || {},
  };

  const formatCurrency = (amount) => {
    return `₹${Math.abs(amount).toLocaleString("en-IN")}`;
  };

  const handleEdit = () => {
    editForm.setFieldsValue({
      accountName: accountData.metaData.accountName,
      accountNumber: accountData.metaData.accountNumber,
      ifscCode: accountData.metaData.ifscCode,
      branch: accountData.metaData.branch,
      balance: accountData.balance,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);
      const values = await editForm.validateFields();

      // Update account in Firebase
      await updateBankAccount(account.id, values);

      // Refresh resources to show updated data
      await actions.fetchResources();

      message.success("Bank account updated successfully!");
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating account:", error);
      message.error(
        error.message || "Failed to update account. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

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
          Account Overview
        </Title>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={handleEdit}
          size="large"
        >
          Edit Account Details
        </Button>
      </div>

      {/* Account Visual */}
      <Row gutter={[24, 24]} justify="start">
        <Col xs={24} lg={12}>
          <div style={{ maxWidth: 450, margin: "0 auto" }}>
            <BankAccountCard account={accountData} />
          </div>
        </Col>

        {/* Account Summary */}
        <Col xs={24} lg={12}>
          <div style={{ maxWidth: 450, margin: "0 auto" }}>
            <Card
              title={
                <span>
                  <WalletOutlined style={{ marginRight: 8 }} />
                  Account Summary
                </span>
              }
              bordered={false}
              style={{ height: "100%" }}
            >
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Statistic
                    title="Current Balance"
                    value={formatCurrency(accountData.balance)}
                    valueStyle={{
                      color: accountData.balance >= 0 ? "#3f8600" : "#cf1322",
                      fontSize: 24,
                    }}
                    prefix={<BankOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      Account Type
                    </Text>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        marginTop: 8,
                      }}
                    >
                      <Tag color="blue" style={{ fontSize: 14 }}>
                        {accountData.metaData.accountType || "N/A"}
                      </Tag>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      Bank
                    </Text>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        marginTop: 8,
                      }}
                    >
                      {accountData.metaData.bankName || "N/A"}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          </div>
        </Col>
      </Row>

      {/* Account Details */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }} justify="start">
        <Col xs={24} lg={12}>
          <div style={{ maxWidth: 450, margin: "0 auto" }}>
            <Card
              title={
                <span>
                  <BankOutlined style={{ marginRight: 8 }} />
                  Account Information
                </span>
              }
              bordered={false}
            >
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Account ID">
                  <Text code>{accountData.id}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Account Name">
                  {accountData.metaData.accountName || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Account Number">
                  <Text code>
                    {accountData.metaData.accountNumber || "N/A"}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="IFSC Code">
                  <Text code>{accountData.metaData.ifscCode || "N/A"}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </div>
        </Col>

        {/* Branch Details */}
        <Col xs={24} lg={12}>
          <div style={{ maxWidth: 450, margin: "0 auto" }}>
            <Card
              title={
                <span>
                  <InfoCircleOutlined style={{ marginRight: 8 }} />
                  Branch Information
                </span>
              }
              bordered={false}
            >
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Branch">
                  {accountData.metaData.branch || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Bank Name">
                  {accountData.metaData.bankName || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Account Type">
                  <Tag color="blue">
                    {accountData.metaData.accountType || "N/A"}
                  </Tag>
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
            Edit Account Details
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
                label="Account Name"
                name="accountName"
                rules={[
                  { required: true, message: "Please enter account name" },
                ]}
              >
                <Input placeholder="e.g., HDFC Savings Account" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Account Number"
                name="accountNumber"
                rules={[
                  { required: true, message: "Please enter account number" },
                ]}
              >
                <Input placeholder="e.g., 1234567890" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="IFSC Code"
                name="ifscCode"
                rules={[{ required: true, message: "Please enter IFSC code" }]}
              >
                <Input placeholder="e.g., HDFC0001234" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Branch"
                name="branch"
                rules={[{ required: true, message: "Please enter branch" }]}
              >
                <Input placeholder="e.g., Mumbai Main" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Balance"
                name="balance"
                rules={[{ required: true, message: "Please enter balance" }]}
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
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
