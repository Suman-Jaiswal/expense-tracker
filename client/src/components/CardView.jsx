import { CheckOutlined, CopyOutlined } from "@ant-design/icons";
import { Card, message } from "antd";
import { useEffect, useState } from "react";
import { decryptCardSensitiveData, isEncrypted } from "../utils/encryption";

export default function CardView({ content = {}, billAmount = null }) {
  const [copied, setCopied] = useState(false);
  const [decryptedData, setDecryptedData] = useState({
    cardNumber: null,
    cardExpiry: null,
    cardCVV: null,
  });

  // Decrypt sensitive data on mount
  useEffect(() => {
    const decryptData = async () => {
      try {
        // Check if any data is encrypted and decrypt
        const hasEncryptedData =
          (content.cardNumber && isEncrypted(content.cardNumber)) ||
          (content.cardExpiry && isEncrypted(content.cardExpiry)) ||
          (content.cardCVV && isEncrypted(content.cardCVV));

        if (hasEncryptedData) {
          const decrypted = await decryptCardSensitiveData(content);
          setDecryptedData({
            cardNumber: decrypted.cardNumber || content.cardNumber,
            cardExpiry: decrypted.cardExpiry || content.cardExpiry,
            cardCVV: decrypted.cardCVV || content.cardCVV,
          });
        } else {
          // Data is not encrypted, use as is
          setDecryptedData({
            cardNumber: content.cardNumber,
            cardExpiry: content.cardExpiry,
            cardCVV: content.cardCVV,
          });
        }
      } catch (error) {
        console.error("Failed to decrypt card data:", error);
        // Fall back to showing available data
        setDecryptedData({
          cardNumber: content.lastFourDigits
            ? `**** **** **** ${content.lastFourDigits}`
            : content.cardNumber,
          cardExpiry: content.cardExpiry,
          cardCVV: content.cardCVV,
        });
      }
    };

    decryptData();
  }, [content]);

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
    const cardNumber = decryptedData.cardNumber || content.cardNumber;
    if (cardNumber) {
      navigator.clipboard.writeText(cardNumber);
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

      {billAmount !== null && billAmount > 0 && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 8,
            padding: "6px 12px",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
          }}
        >
          <span style={{ fontSize: 10, opacity: 0.8 }}>Bill Due:</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(billAmount)}
          </span>
        </div>
      )}

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
          {previewCardNumber(
            decryptedData.cardNumber || content.lastFourDigits
          )}
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
              {(() => {
                const expiry = decryptedData.cardExpiry || content.cardExpiry;
                // If expiry looks like encrypted data (long string with colons), show fallback
                if (
                  !expiry ||
                  (typeof expiry === "string" &&
                    expiry.includes(":") &&
                    expiry.length > 10)
                ) {
                  return "MM/YY";
                }
                return expiry;
              })()}
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
              {(() => {
                const cvv = decryptedData.cardCVV || content.cardCVV;
                // If CVV looks like encrypted data (long string with colons), show fallback
                if (
                  !cvv ||
                  (typeof cvv === "string" &&
                    cvv.includes(":") &&
                    cvv.length > 10)
                ) {
                  return "***";
                }
                return cvv;
              })()}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
