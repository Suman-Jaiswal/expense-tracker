import {
  BankTwoTone,
  DashboardTwoTone,
  DownCircleTwoTone,
  FilePdfTwoTone,
  PlusCircleTwoTone,
  WalletTwoTone,
} from "@ant-design/icons";
import { Layout, Menu } from "antd";
import React, { useCallback, useEffect, useState } from "react";
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
  // const {
  //   token: {},
  // } = theme.useToken();
  const [collapsed, setCollapsed] = useState(
    window.innerWidth < 768 ? true : false
  );
  const [items, setItems] = useState([]);

  const getItems = useCallback(
    () =>
      [
        getItem("item", "Dashboard", "dashboard", <DashboardTwoTone />),
        resources.cards?.length > 0 &&
          getItem("item", "Credit Cards", "credit_cards", <WalletTwoTone />),
        resources.accounts?.length > 0 &&
          getItem("item", "Accounts", "accounts", <BankTwoTone />),
        getItem("item", "Statements", "statements", <FilePdfTwoTone />),
        getItem("item", "Actions", "actions", <DownCircleTwoTone />, [
          getItem("item", "Add Card", "add_card", <PlusCircleTwoTone />),
          getItem("item", "Add Account", "add_account", <PlusCircleTwoTone />),
        ]),
      ].filter(Boolean),

    [resources]
  );

  useEffect(() => {
    if (resources) {
      setItems(getItems());
      setResourceIdentifier("credit_cards");
    }
  }, [resources, getItems, items.length, setResourceIdentifier]);

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
      theme="light"
      collapsible
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
    >
      <Menu
        theme="light"
        defaultSelectedKeys={["credit_cards"]}
        mode="inline"
        items={items}
        onClick={(e) => {
          setResourceIdentifier(e.key);
        }}
        style={{
          padding: 8,
        }}
      />
    </Sider>
  );
}
