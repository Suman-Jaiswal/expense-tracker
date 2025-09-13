import { FilePdfFilled } from "@ant-design/icons";
import { Tabs } from "antd";
import React, { useEffect } from "react";
import { getAllStatements } from "../api";
import { PdfViewer } from "./PdfViewer";
export default function Statements() {
  const [statements, setStatements] = React.useState([]);

  useEffect(() => {
    // Fetch statements from an API or other source
    // For demonstration, we'll use a static list
    getAllStatements()
      .then((data) => setStatements(data))
      .catch(console.error);
  }, []);
  return (
    <div style={{ padding: 10 }}>
      <Tabs
        defaultActiveKey="1"
        tabPosition={"left"}
        style={{ height: "85vh" }}
        items={statements.map((statement, i) => {
          const id = String(i);
          return {
            label: `${statement.period.end} - ${statement.resourceIdentifier}`,
            key: id,
            children: <PdfViewer statement={statement} />,
            icon: <FilePdfFilled />,
          };
        })}
      />
    </div>
  );
}
