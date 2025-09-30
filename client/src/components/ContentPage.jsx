import { DownOutlined, PlusCircleTwoTone } from "@ant-design/icons";
import { Button, Dropdown, Space, Tabs, theme } from "antd";
import React, { useState } from "react";
import { featureFlag } from "../featureFlag";
import AddCardModal from "./AddCardModal";
import OverviewTab from "./OverviewTab";
import ResourceList from "./ResourceList";
import Statements from "./Statements";
import TransactionList from "./TransactionList";

export default function ContentPage({
  resources,
  resourceIdentifier,
  setResourceIdentifier,
}) {
  const {
    token: { colorTextLightSolid },
  } = theme.useToken();
  console.log(
    "Rendering ContentPage with resourceIdentifier:",
    resourceIdentifier
  );

  const [cardSelected, setCardSelected] = useState("");

  const renderTabBar = (props, DefaultTabBar) => (
    <div
      style={{
        position: "sticky",
        top: 0, // same as offsetTop={64}
        zIndex: 1,
        margin: 0,
        padding: "4px 16px 0 16px",
        background: colorTextLightSolid, // prevent overlap transparency
      }}
    >
      <DefaultTabBar {...props} style={{ margin: 0 }} />
    </div>
  );

  return (
    <div>
      {!resourceIdentifier ? (
        <div
          style={{
            textAlign: "center",
            marginTop: "20%",
            color: "gray",
            fontSize: "18px",
          }}
        >
          Please select a resource from the menu to view details.
        </div>
      ) : resourceIdentifier === "statements" ? (
        <Statements />
      ) : resourceIdentifier === "add_card" ? (
        <AddCardModal setResourceIdentifier={setResourceIdentifier} />
      ) : resourceIdentifier === "credit_cards" ? (
        <>
          {!featureFlag.isSideMenuEnabled ? (
            <Tabs
              renderTabBar={renderTabBar}
              tabBarExtraContent={{
                right: (
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: "add-card",
                          label: (
                            <Button
                              onClick={() => {
                                setResourceIdentifier("add_card");
                              }}
                              icon={<PlusCircleTwoTone />}
                            >
                              Add Card
                            </Button>
                          ),
                        },
                        {
                          key: "",
                          label: (
                            <a
                              onClick={() => {
                                setCardSelected("");
                              }}
                            >
                              {"Show all"}
                            </a>
                          ),
                        },
                        ...resources.cards.map((card) => ({
                          key: card.id,
                          label: (
                            <a
                              onClick={() => {
                                setCardSelected(card.id);
                              }}
                            >
                              {card.id}
                            </a>
                          ),
                        })),
                      ],
                    }}
                  >
                    <a onClick={(e) => e.preventDefault()}>
                      <Space>
                        {cardSelected === "" ? "Select card" : cardSelected}
                        <DownOutlined />
                      </Space>
                    </a>
                  </Dropdown>
                ),
              }}
              tabPosition={"top"}
              items={[
                {
                  label: "Credit Cards",
                  key: "1",
                  children: (
                    <ResourceList
                      resource={
                        cardSelected === ""
                          ? resources.cards
                          : resources.cards.filter((c) => c.id === cardSelected)
                      }
                    />
                  ),
                },
                {
                  label: "Statements",
                  key: "2",
                  children: (
                    <Statements view={"grid"} cardSelected={cardSelected} />
                  ),
                },
              ]}
            />
          ) : (
            <ResourceList resource={resources.cards} />
          )}
        </>
      ) : resourceIdentifier === "accounts" ? (
        <ResourceList
          resource={resources.accounts}
          resourceType="accounts"
          resourceTitle="Bank Accounts"
        />
      ) : (
        <Tabs
          tabPosition={"top"}
          items={[
            {
              label: "Overview",
              key: "1",
              children: <OverviewTab resources={resources} />,
            },
            {
              label: "Transactions",
              key: "2",
              children: <TransactionList />,
            },
          ]}
        />
      )}
    </div>
  );
}
