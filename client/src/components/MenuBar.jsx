import {
  BulbOutlined,
  BulbTwoTone,
  DashboardTwoTone,
  DollarCircleTwoTone,
  FilePdfTwoTone,
  WalletTwoTone,
} from "@ant-design/icons";
import { Button, Layout, Menu, Switch, Tooltip } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
const { Sider } = Layout;
function getItem(type = "item", label, key, icon, children) {
  return {
    type,
    key,
    icon,
    children,
    label,
  };
}

export default function MenuBar({ resources, setResourceIdentifier }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(true);
  const [items, setItems] = useState([]);
  const [selectedKey, setSelectedKey] = useState(["dashboard"]);
  const hasSetInitialResource = useRef(false);

  const getItems = useCallback(
    () =>
      [
        getItem("item", "Dashboard", "dashboard", <DashboardTwoTone />),
        resources.cards?.length > 0 &&
          getItem("item", "Credit Cards", "credit_cards", <WalletTwoTone />),
        getItem(
          "item",
          "Transactions",
          "transactions",
          <DollarCircleTwoTone />
        ),
        getItem("item", "Statements", "statements", <FilePdfTwoTone />),
        // Disabled for now
        // resources.accounts?.length > 0 &&
        //   getItem("item", "Accounts", "accounts", <BankTwoTone />),
        // Actions removed - Add Card button now in Cards page
      ].filter(Boolean),

    [resources]
  );

  useEffect(() => {
    if (resources) {
      setItems(getItems());
      // Only set initial resourceIdentifier once on first load
      if (!hasSetInitialResource.current) {
        setResourceIdentifier("dashboard");
        hasSetInitialResource.current = true;
      }
    }
  }, [resources, getItems, setResourceIdentifier]);

  useEffect(() => {
    const unsubscribe = () =>
      window.addEventListener("resize", () => {
        if (window.innerWidth < 768) {
          setCollapsed(true);
        } else {
          setCollapsed(false);
        }
      });
    unsubscribe();
    return () => window.removeEventListener("resize", unsubscribe);
  }, []);

  return (
    <Sider
      theme={isDarkMode ? "dark" : "light"}
      collapsible
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
      style={{
        overflow: "auto",
        height: "100vh",
        position: "sticky",
        top: 0,
        left: 0,
      }}
    >
      {/* Theme Toggle */}
      <div
        style={{
          padding: collapsed ? "16px 8px" : "16px 24px",
          textAlign: "center",
          borderBottom: isDarkMode ? "1px solid #475569" : "1px solid #e2e8f0",
          background: isDarkMode
            ? "linear-gradient(135deg, #1e293b 0%, #334155 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        }}
      >
        {collapsed ? (
          <Tooltip
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            placement="right"
          >
            <Button
              type="text"
              icon={
                isDarkMode ? (
                  <BulbTwoTone twoToneColor="#faad14" />
                ) : (
                  <BulbOutlined />
                )
              }
              onClick={toggleTheme}
              style={{
                width: "100%",
                color: isDarkMode ? "#f1f5f9" : "#1e293b",
              }}
            />
          </Tooltip>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 14,
                color: isDarkMode ? "#f1f5f9" : "#1e293b",
                fontWeight: 600,
              }}
            >
              {isDarkMode ? "🌙 Dark Mode" : "☀️ Light Mode"}
            </span>
            <Switch
              checked={isDarkMode}
              onChange={toggleTheme}
              checkedChildren="🌙"
              unCheckedChildren="☀️"
            />
          </div>
        )}
      </div>

      <Menu
        theme={isDarkMode ? "dark" : "light"}
        selectedKeys={selectedKey}
        mode="inline"
        items={items}
        onClick={(e) => {
          console.log("Menu clicked:", e.key);
          setSelectedKey([e.key]);
          setResourceIdentifier(e.key);
        }}
        style={{
          padding: 8,
          border: "none",
        }}
      />
    </Sider>
  );
}
