import { Table, Tag } from "antd";
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
    dataIndex: "type",
    key: "type",
    sorter: (a, b) => a.type.localeCompare(b.type),
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

  React.useEffect(() => {
    getTransactionsByResourceidentifier(resourceIdentifier)
      .then((data) => {
        setTransactionList(data);
      })
      .catch(console.error);
  }, [resourceIdentifier]);

  return (
    <div>
      <Table size="middle" dataSource={transactionList}>
        {columns.map((col) => {
          if (col.key === "type") {
            return (
              <Column
                title={col.title}
                dataIndex={col.dataIndex}
                key={col.key}
                sorter={col.sorter}
                render={(text) => {
                  const color = text === "debit" ? "red" : "green";
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
            />
          );
        })}
      </Table>
    </div>
  );
}
