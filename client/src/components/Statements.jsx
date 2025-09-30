import { FilePdfFilled, FilePdfTwoTone } from "@ant-design/icons";
import { Card, Modal, Tabs } from "antd";
import Meta from "antd/es/card/Meta";
import React, { useEffect } from "react";
import { getAllStatements } from "../api";
import { PdfViewer } from "./PdfViewer";
export default function Statements({ view = "tab", cardSelected }) {
  const [statements, setStatements] = React.useState([]);
  const [filteredStatements, setFilterStatements] = React.useState([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedStatement, setSelectedStatement] = React.useState(null);

  useEffect(() => {
    // Fetch statements from an API or other source
    // For demonstration, we'll use a static list
    getAllStatements()
      .then((data) => setStatements(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (cardSelected) {
      setFilterStatements(
        statements.filter((statement) =>
          statement.resourceIdentifier.includes(cardSelected)
        )
      );
    } else {
      setFilterStatements(statements);
    }
  }, [cardSelected, statements]);

  const showModal = (statement) => {
    setSelectedStatement(statement);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedStatement(null);
  };

  return (
    <div style={{ padding: 10 }}>
      {view === "tab" ? (
        <Tabs
          defaultActiveKey="1"
          tabPosition={"left"}
          style={{ height: "85vh" }}
          items={filteredStatements.map((statement, i) => {
            const id = String(i);
            return {
              label: `${statement.period.end} - ${statement.resourceIdentifier}`,
              key: id,
              children: <PdfViewer statement={statement} />,
              icon: <FilePdfFilled />,
            };
          })}
        />
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {filteredStatements.map((statement, i) => {
            const id = String(i);
            return (
              <Card
                key={id}
                hoverable
                style={{ width: 300 }}
                onClick={() => showModal(statement)}
              >
                <FilePdfTwoTone
                  style={{
                    fontSize: 25,
                  }}
                />
                <br />
                <Meta
                  style={{ marginTop: 10, fontSize: 14 }}
                  title={statement.resourceIdentifier}
                  description={statement.period.end}
                />
              </Card>
            );
          })}
        </div>
      )}
      <Modal
        width={800}
        title={selectedStatement?.resourceIdentifier}
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
      >
        <PdfViewer statement={selectedStatement} />
      </Modal>
    </div>
  );
}
