import { Tabs } from "antd";
import React from "react";
import AddCardModal from "./AddCardModal";
import OverviewTab from "./OverviewTab";
import ResourceList from "./ResourceList";
import Statements from "./Statements";
import TransactionList from "./TransactionList";

export default function ContentPage({ resources, resourceIdentifier }) {
  console.log(
    "Rendering ContentPage with resourceIdentifier:",
    resourceIdentifier
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
      ) : resourceIdentifier === "add-card" ? (
        <AddCardModal />
      ) : resourceIdentifier === "credit-cards" ? (
        <ResourceList resource={resources.cards} />
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
