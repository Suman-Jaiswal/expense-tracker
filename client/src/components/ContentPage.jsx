import { Tabs } from "antd";
import React from "react";
import OverviewTab from "./OverviewTab";
import TransactionList from "./TransactionList";

export default function ContentPage({ resourceIdentifier }) {
  return (
    <div>
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
    </div>
  );
}
