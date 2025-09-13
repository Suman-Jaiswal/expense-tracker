import { Tabs } from "antd";
import React from "react";
import OverviewTab from "./OverviewTab";
import Statements from "./Statements";
import TransactionList from "./TransactionList";

export default function ContentPage({ resourceIdentifier }) {
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
      ) : (
        <Tabs
          tabPosition={"top"}
          items={[
            {
              label: "Overview",
              key: "1",
              children: <OverviewTab resourceIdentifier={resourceIdentifier} />,
            },
            {
              label: "Transactions",
              key: "2",
              children: (
                <TransactionList resourceIdentifier={resourceIdentifier} />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
