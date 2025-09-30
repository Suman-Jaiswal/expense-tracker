import { CopyOutlined } from "@ant-design/icons";
import { Card } from "antd";
import React from "react";

export default function CardView({ content = {} }) {
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

  return (
    <Card
      hoverable
      style={{
        borderRadius: 12,
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#fff",
        height: 180,
        width: 320,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 6px 18px rgba(16,24,40,0.12)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.9 }}>{content.cardType}</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{content.cardName}</div>
      </div>

      <div style={{ marginTop: 40 }}>
        <>
          <div
            style={{
              fontSize: 16,
              fontFamily: "monospace",
              letterSpacing: 2,
            }}
          >
            {previewCardNumber(content.cardNumber)}{" "}
            <CopyOutlined
              onClick={() => {
                if (content.cardNumber) {
                  navigator.clipboard.writeText(content.cardNumber);
                  console.log("Card number copied to clipboard!");
                }
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>Cardholder</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                SUMAN KUMAR JAISWAL
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>Expiry</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {content.cardExpiry || "MM/YY"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>CVV</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {content.cardCVV || "***"}
              </div>
            </div>
          </div>
        </>
      </div>
    </Card>
  );
}
