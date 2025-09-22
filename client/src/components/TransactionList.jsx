import { Spin, Table, Tag } from "antd";
import Column from "antd/es/table/Column";
import React from "react";
import { getTransactionsByResourceidentifier } from "../api";
const columns = [
  {
    title: "Merchant",
    dataIndex: "merchantInfo",
    key: "merchantInfo",
    sorter: (a, b) => a.merchantInfo.localeCompare(b.merchantInfo),
  },
  {
    title: "Date",
    dataIndex: "transactionDate",
    key: "transactionDate",
    sorter: (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate),
  },
  {
    title: "Type",
    dataIndex: "transactionType",
    key: "transactionType",
    sorter: (a, b) => a.transactionType.localeCompare(b.transactionType),
  },
  {
    title: "Amount",
    dataIndex: "transactionAmount",
    key: "transactionAmount",
    sorter: (a, b) =>
      parseFloat(a.transactionAmount.replace(/,/g, "")) -
      parseFloat(b.transactionAmount.replace(/,/g, "")),
  },
];
export default function TransactionList({ resourceIdentifier }) {
  const [transactionList, setTransactionList] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    if (!resourceIdentifier) return;
    getTransactionsByResourceidentifier(resourceIdentifier)
      .then((data) => {
        setTransactionList(data);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [resourceIdentifier]);

  return (
    <div>
      {loading ? (
        <Spin style={{ position: "absolute", left: "50%", marginTop: 20 }} />
      ) : (
        <Table
          size="middle"
          dataSource={transactionList}
          pagination={{ pageSize: 15 }}
        >
          {columns.map((col) => {
            if (col.key === "transactionType") {
              return (
                <Column
                  title={col.title || "Payment Done"}
                  dataIndex={col.dataIndex}
                  key={col.key}
                  sorter={col.sorter}
                  render={(text) => {
                    const color = text === "debited" ? "red" : "green";
                    return (
                      <Tag color={color} key={text}>
                        {text.toUpperCase()}
                      </Tag>
                    );
                  }}
                />
              );
            }
            return (
              <Column
                title={col.title}
                dataIndex={col.dataIndex}
                key={col.key}
                sorter={col.sorter}
                render={(text) => (
                  <span>
                    {text
                      ? text
                      : !text && col.key === "merchantInfo"
                      ? "Payment Done"
                      : "NA"}
                  </span>
                )}
              />
            );
          })}
        </Table>
      )}
    </div>
  );
}
