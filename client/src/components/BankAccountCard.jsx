import { BankOutlined, CheckOutlined, CopyOutlined } from "@ant-design/icons";
import { Card, message } from "antd";
import { useState } from "react";

export default function BankAccountCard({ account = {}, onClick }) {
  const [copied, setCopied] = useState(false);

  // Helper to get bank logo/color
  const getBankStyle = (bankName) => {
    const bank = (bankName || "").toLowerCase();
    if (bank.includes("hdfc")) {
      return {
        gradient: "linear-gradient(135deg, #004c8c 0%, #0066b2 100%)",
        logo: "HDFC",
      };
    }
    if (bank.includes("icici")) {
      return {
        gradient: "linear-gradient(135deg, #b85c12 0%, #d97016 100%)",
        logo: "ICICI",
      };
    }
    if (bank.includes("axis")) {
      return {
        gradient: "linear-gradient(135deg, #800020 0%, #a0002f 100%)",
        logo: "AXIS",
      };
    }
    if (bank.includes("sbi")) {
      return {
        gradient: "linear-gradient(135deg, #16467c 0%, #1d5a9e 100%)",
        logo: "SBI",
      };
    }
    return {
      gradient: "linear-gradient(135deg, #475569 0%, #64748b 100%)",
      logo: bankName?.substring(0, 4).toUpperCase() || "BANK",
    };
  };

  const maskAccountNumber = (number) => {
    if (!number) return "XXXX XXXX XXXX";
    const digits = number.replace(/\D/g, "");
    if (digits.length <= 4) return `XXXX XXXX ${digits}`;
    return `XXXX XXXX ${digits.slice(-4)}`;
  };

  const formatBalance = (balance) => {
    const amount = parseFloat(balance || 0);
    return `₹${Math.abs(amount).toLocaleString("en-IN")}`;
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    if (account.metaData?.accountNumber) {
      navigator.clipboard.writeText(account.metaData.accountNumber);
      setCopied(true);
      message.success("Account number copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const bankStyle = getBankStyle(account.metaData?.bankName);

  return (
    <Card
      hoverable
      onClick={onClick}
      className="fade-in"
      style={{
        borderRadius: 16,
        background: bankStyle.gradient,
        color: "#fff",
        height: 220,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        transition: "all 0.3s ease",
        cursor: "pointer",
      }}
      bodyStyle={{
        padding: "20px 24px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              opacity: 0.7,
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: 4,
            }}
          >
            {account.metaData?.accountType || "Account"}
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: 8,
            }}
          >
            {account.metaData?.accountName || account.id || "Bank Account"}
          </div>
          {/* Bank Logo */}
          <div
            style={{
              display: "inline-block",
              padding: "4px 10px",
              background: "rgba(255, 255, 255, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700,
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              backdropFilter: "blur(10px)",
            }}
          >
            {bankStyle.logo}
          </div>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(10px)",
          }}
        >
          <BankOutlined style={{ fontSize: 20 }} />
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 18,
            fontFamily: "monospace",
            letterSpacing: 3,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {maskAccountNumber(account.metaData?.accountNumber)}
          <div
            onClick={handleCopy}
            style={{
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.2)",
              transition: "all 0.2s ease",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {copied ? (
              <CheckOutlined style={{ fontSize: 12 }} />
            ) : (
              <CopyOutlined style={{ fontSize: 12 }} />
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 9,
                opacity: 0.6,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Balance
            </div>
            <div style={{ fontSize: 20, marginTop: 4, fontWeight: 700 }}>
              {formatBalance(account.balance)}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 9,
                opacity: 0.6,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              IFSC Code
            </div>
            <div style={{ fontSize: 12, marginTop: 4, fontWeight: 500 }}>
              {account.metaData?.ifscCode || "N/A"}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
