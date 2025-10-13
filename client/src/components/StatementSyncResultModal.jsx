import {
  CalendarOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { Divider, Empty, List, Modal, Space, theme, Typography } from "antd";
import { format } from "date-fns";

const { Text, Title } = Typography;

const StatementSyncResultModal = ({ visible, results, onClose }) => {
  const { token } = theme.useToken();

  if (!results) return null;

  const { stats, newStatements } = results;
  const hasNewStatements = newStatements && newStatements.length > 0;

  // Theme-dependent colors
  // Check if background is dark by examining the hex value
  const bgHex = token.colorBgContainer || "#ffffff";
  const isDark = bgHex.startsWith("#1") || bgHex.startsWith("#0");

  const statsBg = isDark
    ? `linear-gradient(135deg, ${token.colorBgElevated || "#1f1f1f"} 0%, ${
        token.colorBgContainer || "#141414"
      } 100%)`
    : "linear-gradient(135deg, #f0f2f5 0%, #e6e8eb 100%)";
  const labelColor = isDark
    ? "rgba(255, 255, 255, 0.65)"
    : "rgba(0, 0, 0, 0.65)";
  const numberColor = isDark
    ? "rgba(255, 255, 255, 0.85)"
    : "rgba(0, 0, 0, 0.85)";
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.1)";
  const dividerColor = isDark
    ? "rgba(255, 255, 255, 0.15)"
    : "rgba(0, 0, 0, 0.15)";

  return (
    <Modal
      title={
        <Space>
          <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 24 }} />
          <Title level={4} style={{ margin: 0 }}>
            Statement Sync Complete
          </Title>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      onOk={onClose}
      width={700}
      cancelButtonProps={{ style: { display: "none" } }}
      okText="Close"
    >
      <Divider style={{ margin: "16px 0" }} />

      {/* Summary Stats */}
      <div
        style={{
          background: statsBg,
          padding: "24px",
          borderRadius: "12px",
          marginBottom: "24px",
          border: `1px solid ${borderColor}`,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
      >
        <Space
          size="large"
          style={{ width: "100%", justifyContent: "space-around" }}
        >
          <div style={{ textAlign: "center" }}>
            <Text
              strong
              style={{
                fontSize: 12,
                color: labelColor,
                display: "block",
                marginBottom: 8,
                letterSpacing: "1px",
              }}
            >
              NEW
            </Text>
            <div style={{ fontSize: 32, fontWeight: 600, color: "#52c41a" }}>
              {stats?.total || 0}
            </div>
          </div>
          <Divider
            type="vertical"
            style={{ height: 60, borderColor: dividerColor }}
          />
          <div style={{ textAlign: "center" }}>
            <Text
              strong
              style={{
                fontSize: 12,
                color: labelColor,
                display: "block",
                marginBottom: 8,
                letterSpacing: "1px",
              }}
            >
              SKIPPED
            </Text>
            <div
              style={{
                fontSize: 32,
                fontWeight: 600,
                color: numberColor,
              }}
            >
              {stats?.skipped || 0}
            </div>
          </div>
          <Divider
            type="vertical"
            style={{ height: 60, borderColor: dividerColor }}
          />
          <div style={{ textAlign: "center" }}>
            <Text
              strong
              style={{
                fontSize: 12,
                color: labelColor,
                display: "block",
                marginBottom: 8,
                letterSpacing: "1px",
              }}
            >
              FAILED
            </Text>
            <div
              style={{
                fontSize: 32,
                fontWeight: 600,
                color: stats?.failed > 0 ? "#ff4d4f" : numberColor,
              }}
            >
              {stats?.failed || 0}
            </div>
          </div>
        </Space>
      </div>

      {/* New Statements List */}
      {hasNewStatements ? (
        <>
          <Title level={5} style={{ marginBottom: 16 }}>
            📄 Newly Added Statements
          </Title>
          <List
            dataSource={newStatements}
            renderItem={(statement) => {
              const startDate = statement.period?.start
                ? format(new Date(statement.period.start), "MMM dd, yyyy")
                : "N/A";
              const endDate = statement.period?.end
                ? format(new Date(statement.period.end), "MMM dd, yyyy")
                : "N/A";

              return (
                <List.Item
                  style={{
                    background: isDark
                      ? "rgba(255, 255, 255, 0.04)"
                      : "#fafafa",
                    padding: "12px 16px",
                    marginBottom: "8px",
                    borderRadius: "8px",
                    border: `1px solid ${
                      isDark ? "rgba(255, 255, 255, 0.08)" : "#f0f0f0"
                    }`,
                  }}
                >
                  <Space
                    direction="vertical"
                    size={4}
                    style={{ width: "100%" }}
                  >
                    <Space>
                      <CreditCardOutlined style={{ color: "#1890ff" }} />
                      <Text strong>{statement.displayName}</Text>
                    </Space>
                    <Space size="small">
                      <CalendarOutlined
                        style={{ color: "#8c8c8c", fontSize: 12 }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {startDate} to {endDate}
                      </Text>
                    </Space>
                    {statement.statementData?.totalAmountDue && (
                      <Space size="small">
                        <FileTextOutlined
                          style={{ color: "#8c8c8c", fontSize: 12 }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Amount Due: ₹
                          {parseFloat(
                            statement.statementData.totalAmountDue
                          ).toLocaleString("en-IN")}
                        </Text>
                      </Space>
                    )}
                  </Space>
                </List.Item>
              );
            }}
          />
        </>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              <Text type="secondary">No new statements were added</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                All existing statements are already in the database
              </Text>
            </span>
          }
          style={{ margin: "40px 0" }}
        />
      )}

      {/* Next Steps */}
      {hasNewStatements && (
        <div
          style={{
            background: isDark ? "rgba(24, 144, 255, 0.1)" : "#e6f7ff",
            border: `1px solid ${
              isDark ? "rgba(24, 144, 255, 0.3)" : "#91d5ff"
            }`,
            borderRadius: "8px",
            padding: "12px 16px",
            marginTop: "24px",
          }}
        >
          <Space direction="vertical" size={4}>
            <Text strong style={{ color: isDark ? "#69c0ff" : "#0050b3" }}>
              💡 Next Step
            </Text>
            <Text style={{ fontSize: 13 }}>
              Click <strong>"Sync Transactions"</strong> on the Dashboard to
              extract transactions from these statements.
            </Text>
          </Space>
        </div>
      )}
    </Modal>
  );
};

export default StatementSyncResultModal;
