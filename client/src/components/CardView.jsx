import { CopyOutlined } from "@ant-design/icons";
import React from "react";

export default function CardView({ cardMetaData = {} }) {
  console.log("Rendering CardView with cardMetaData:", cardMetaData);

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
    <div
      style={{
        borderRadius: 12,
        padding: 16,
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#fff",
        minHeight: 160,
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
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          {cardMetaData.cardType}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          {cardMetaData.cardName}
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <>
          <div
            style={{
              fontSize: 18,
              fontFamily: "monospace",
              letterSpacing: 2,
            }}
          >
            {previewCardNumber(cardMetaData.cardNumber)}{" "}
            <CopyOutlined
              onClick={() => {
                if (cardMetaData.cardNumber) {
                  navigator.clipboard.writeText(cardMetaData.cardNumber);
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
                {cardMetaData.cardExpiry || "MM/YY"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>CVV</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {cardMetaData.cardCVV || "***"}
              </div>
            </div>
          </div>
        </>
      </div>
    </div>
  );
}
