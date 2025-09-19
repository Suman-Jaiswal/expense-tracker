import {
  BankTwoTone,
  CreditCardTwoTone,
  DashboardTwoTone,
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
  const [collapsed, setCollapsed] = useState(false);
  const [items, setItems] = useState([
    getItem(null, "Dashboard", "1", <DashboardTwoTone />),
  ]);

  const getItems = useCallback(
    () =>
      [
        getItem("item", "Dashboard", "dashboard", <DashboardTwoTone />),
        getItem("group", "Actions", "actions", <WalletTwoTone />, [
          getItem("item", "Add Card", "add-card", <PlusCircleTwoTone />),
        ]),

        resources.cards?.length > 0 &&
          getItem(
            collapsed ? "item" : "group",
            "Cards",
            "cards",
            <WalletTwoTone />,
            resources.cards.map((card, index) =>
              getItem(
                "item",
                card.id,
                `${card.resourceIdentifier}`,
                <CreditCardTwoTone />
              )
            )
          ),

        resources.accounts?.length > 0 &&
          getItem(
            collapsed ? "item" : "group",
            "Accounts",
            "accounts",
            <BankTwoTone />,
            resources.accounts.map((account, index) =>
              getItem("item", account.id, `account-${index}`, <BankTwoTone />)
            )
          ),

        getItem(
          collapsed ? "item" : "group",
          "Files",
          "files",
          <FilePdfTwoTone />,
          [getItem("item", "Statements", "statements", <FilePdfTwoTone />)]
        ),
      ].filter(Boolean),
    [resources, collapsed]
  );

  useEffect(() => {
    if (resources) {
      setItems(getItems());
    }
  }, [resources, getItems]);

  return (
    <Sider
      theme="light"
      collapsible
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
    >
      <Menu
        theme="light"
        defaultSelectedKeys={["1"]}
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
