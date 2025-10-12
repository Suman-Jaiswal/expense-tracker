import {
  DashboardOutlined,
  FileTextOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Badge } from "antd";
import { useEffect, useState } from "react";
import "./MobileBottomNav.css";

const MobileBottomNav = ({ activeKey, onChange }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsVisible(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!isVisible) return null;

  const navItems = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
    },
    {
      key: "credit_cards",
      icon: <WalletOutlined />,
      label: "Cards",
      badge: null,
    },
    {
      key: "statements",
      icon: <FileTextOutlined />,
      label: "Statements",
    },
  ];

  return (
    <div className="mobile-bottom-nav">
      {navItems.map((item) => (
        <button
          key={item.key}
          className={`nav-item ${activeKey === item.key ? "active" : ""}`}
          onClick={() => onChange(item.key)}
        >
          {item.badge ? (
            <Badge count={item.badge} size="small">
              <span className="nav-icon">{item.icon}</span>
            </Badge>
          ) : (
            <span className="nav-icon">{item.icon}</span>
          )}
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default MobileBottomNav;
