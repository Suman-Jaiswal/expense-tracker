import { Breadcrumb, Tabs } from "antd";
import React, { useEffect } from "react";
import CardView from "./CardView";
import OverviewTab from "./OverviewTab";
import TransactionList from "./TransactionList";

export default function ResourceList({
  resource = [],
  resourceType = "cards",
  resourceTitle = "Credit Cards",
}) {
  const [breadcrumbItems, setBreadcrumbItems] = React.useState([
    { title: resourceTitle },
  ]);
  const [selectedResource, setSelectedResource] = React.useState(null);
  console.log("ResourceList rendered with resources:", resource);

  useEffect(() => {
    setSelectedResource(null);
    setBreadcrumbItems([{ title: resourceTitle }]);
  }, [resource, resourceTitle]);

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} style={{ margin: "16px 0" }} />

      {selectedResource ? (
        <Tabs
          tabPosition={"top"}
          items={[
            {
              label: "Overview",
              key: "1",
              children: (
                <OverviewTab
                  resource={selectedResource}
                  resourceType={resourceType}
                />
              ),
            },
            {
              label: "Transactions",
              key: "2",
              children: (
                <TransactionList
                  resourceIdentifier={selectedResource.resourceIdentifier}
                />
              ),
            },
          ]}
        />
      ) : (
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          {resource.map((item) => (
            <div
              style={{
                cursor: "pointer",
              }}
              onClick={() => {
                setBreadcrumbItems([
                  {
                    title: "Credit Cards",
                    onClick: () => {
                      setSelectedResource(null);
                      setBreadcrumbItems([{ title: resourceTitle }]);
                    },
                    path: "/",
                  },
                  { title: item.id || "Card" },
                ]);
                setSelectedResource(item);
              }}
            >
              <CardView key={item.id} content={item.metaData} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
