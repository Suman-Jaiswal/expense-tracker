import { CheckOutlined, CopyOutlined } from "@ant-design/icons";
import { Card, message } from "antd";
import { useState } from "react";

export default function CardView({ content = {} }) {
  const [copied, setCopied] = useState(false);

  // Helper to get bank logo/initial
  const getBankLogo = (bankName) => {
    const bank = (bankName || "").toLowerCase();
    if (bank.includes("axis")) return "AXIS";
    if (bank.includes("icici")) return "ICICI";
    if (bank.includes("hdfc")) return "HDFC";
    if (bank.includes("sbi")) return "SBI";
    return bankName?.substring(0, 4).toUpperCase() || "BANK";
  };

  // Helper to get partner logo/name
  const getPartnerLogo = (cardName) => {
    const name = (cardName || "").toLowerCase();
    if (name.includes("flipkart")) return "flipkart";
    if (name.includes("amazon")) return "amazon";
    if (name.includes("myntra")) return "myntra";
    return null;
  };

  const previewCardNumber = (number) => {
    if (!number) return "**** **** **** ****";
    const digits = number.replace(/\D/g, "");
    if (digits.length <= 4) return "**** **** **** " + digits;
    if (digits.length <= 8)
      return (
        "**** **** " +
        digits.slice(-4).padStart(4, "*") +
        " " +
        digits.slice(-4)
      );
    if (digits.length <= 12)
      return (
        "**** " +
        digits.slice(-8, -4).padStart(4, "*") +
        " " +
        digits.slice(-4).padStart(4, "*") +
        " " +
        digits.slice(-4)
      );
    return (
      digits.slice(0, 4) +
      " " +
      digits.slice(4, 8) +
      " " +
      digits.slice(8, 12) +
      " " +
      digits.slice(12, 16)
    );
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    if (content.cardNumber) {
      navigator.clipboard.writeText(content.cardNumber);
      setCopied(true);
      message.success("Card number copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card
      hoverable
      className="fade-in"
      style={{
        borderRadius: 16,
        background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
        color: "#fff",
        height: 240,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(148, 163, 184, 0.1)",
        transition: "all 0.3s ease",
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
            {content.cardType || "Credit Card"}
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
            {content.cardName || "Card"}
          </div>
          {/* Bank and Partner Logos */}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {getPartnerLogo(content.cardName) && (
              <div
                style={{
                  padding: "3px 8px",
                  background: "rgba(255, 255, 255, 0.95)",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#6366f1",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                {getPartnerLogo(content.cardName)}
              </div>
            )}
            <div
              style={{
                padding: "3px 8px",
                background: "rgba(255, 255, 255, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: 4,
                fontSize: 9,
                fontWeight: 700,
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                backdropFilter: "blur(10px)",
              }}
            >
              {getBankLogo(content.bankName)}
            </div>
          </div>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "rgba(99, 102, 241, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(10px)",
          }}
        >
          <span style={{ fontSize: 20 }}>💳</span>
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
          {previewCardNumber(content.cardNumber)}
          <div
            onClick={handleCopy}
            style={{
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 6,
              background: "rgba(99, 102, 241, 0.2)",
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
              Cardholder
            </div>
            <div style={{ fontSize: 12, marginTop: 4, fontWeight: 500 }}>
              SUMAN KUMAR JAISWAL
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
              Expiry
            </div>
            <div style={{ fontSize: 12, marginTop: 4, fontWeight: 500 }}>
              {content.cardExpiry || "MM/YY"}
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
              CVV
            </div>
            <div style={{ fontSize: 12, marginTop: 4, fontWeight: 500 }}>
              {content.cardCVV || "***"}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
