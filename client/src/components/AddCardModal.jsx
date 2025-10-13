// CreditCardModal.jsx
import {
  Button,
  Col,
  Form,
  Input,
  message,
  Radio,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { addCard, getBanksDropdownOptions } from "../api";
import CardView from "./CardView";

const { Text, Title } = Typography;

/**
 * Props:
 *  - visible (bool)        : show/hide modal
 *  - onClose (fn)          : called when modal closed
 *  - onSubmit (fn(values)) : called with { cardNumber, expiry, cvv, imageFile (optional) }
 *
 * Usage:
 *  <CreditCardModal visible={visible} onClose={() => setVisible(false)} onSubmit={(vals)=>console.log(vals)} />
 */

export default function AddCardModal({
  onClose = () => {},
  setResourceIdentifier,
}) {
  const [form] = Form.useForm();
  // const [imagePreview, setImagePreview] = useState(null);
  // const [rawImageFile, setRawImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [banksDropdownOptions, setBanksDropdownOptions] = useState([]);
  const [messageApi, contextHolder] = message.useMessage();

  // Utility: format card number (groups of 4)
  function formatCardNumber(raw = "") {
    const digits = raw.replace(/\D/g, "");
    return digits.match(/.{1,4}/g)?.join(" ") ?? digits;
  }

  // Luhn algorithm
  function luhnCheck(value = "") {
    const digits = value.replace(/\D/g, "");
    if (!digits) return false;
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = parseInt(digits[i], 10);
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  // Detect AMEX (starts 34/37)
  function isAmex(number = "") {
    const d = number.replace(/\D/g, "");
    return /^3[47]/.test(d);
  }

  // Expiry validation (MM/YY or MM/YYYY) and must be future
  function validateExpiry(value = "") {
    if (!value) return false;
    const trimmed = value.trim();
    // Accept separators / - or space, accept two or four digit years
    const m = trimmed.match(/^(\d{1,2})[\/\-\s]?(\d{2}|\d{4})$/);
    if (!m) return false;
    let mm = parseInt(m[1], 10);
    let yy = m[2];
    if (mm < 1 || mm > 12) return false;
    if (yy.length === 2) {
      // treat as 20xx (reasonable for credit cards)
      yy = parseInt("20" + yy, 10);
    } else {
      yy = parseInt(yy, 10);
    }
    // set to last day of month at 23:59:59
    const expDate = new Date(yy, mm, 1);
    // move to next month, then subtract 1ms
    const lastMoment = new Date(
      expDate.getFullYear(),
      expDate.getMonth() + 1,
      1,
      0,
      0,
      0,
      -1
    );
    const now = new Date();
    return lastMoment > now;
  }

  // When upload file selected
  // function handleBeforeUpload(file) {
  //   // limit to images and reasonable size (e.g., 5MB)
  //   if (!file.type.startsWith("image/")) {
  //     message.error("Please upload an image file.");
  //     return false;
  //   }
  //   const maxMB = 5;
  //   if (file.size / 1024 / 1024 > maxMB) {
  //     message.error(`Image must be smaller than ${maxMB} MB`);
  //     return false;
  //   }
  //   // read preview
  //   const reader = new FileReader();
  //   reader.onload = () => {
  //     setImagePreview(reader.result);
  //   };
  //   reader.readAsDataURL(file);
  //   setRawImageFile(file);
  //   // prevent antd from auto-uploading
  //   return false;
  // }

  // Normalize card number input (formatting)
  function handleCardInputChange(e) {
    const value = e.target.value;
    const formatted = formatCardNumber(value);
    form.setFieldsValue({ cardNumber: formatted });
  }

  // On submit
  async function onFinish(values) {
    // values.cardNumber may have spaces; normalize
    const rawNumber = (values.cardNumber || "").replace(/\s+/g, "");
    // basic checks (Luhn and length)
    if (!/^\d{13,19}$/.test(rawNumber)) {
      message.error("Card number must contain 13–19 digits.");
      return;
    }
    if (!luhnCheck(rawNumber)) {
      // show confirmation (still allow submission if user insists)
      const ok = window.confirm(
        "Card number failed checksum (Luhn). Submit anyway?"
      );
      if (!ok) return;
    }
    if (!validateExpiry(values.expiry || "")) {
      message.error("Expiry must be a valid future date (MM/YY or MM/YYYY).");
      return;
    }
    const cvvRaw = (values.cvv || "").replace(/\D/g, "");
    if (isAmex(rawNumber)) {
      if (!/^\d{4}$/.test(cvvRaw)) {
        message.error("American Express cards require a 4-digit CVV.");
        return;
      }
    } else {
      if (!/^\d{3}$/.test(cvvRaw)) {
        message.error("CVV must be 3 digits.");
        return;
      }
    }
    const formattedExpiry = values.expiry.includes("/")
      ? values.expiry
      : values.expiry.slice(0, 2) + "/" + values.expiry.slice(2);
    try {
      // Prepare payload
      const payload = {
        cardNumber: rawNumber,
        cardExpiry: formattedExpiry,
        cardCVV: cvvRaw,
        cardName: values.cardName,
        cardType: values.cardType,
        bankName: values.bankName,
      };
      // If caller provided onSubmit prop, pass File object too
      addCard(payload).then(() => {
        messageApi.success("Card added successfully.");
        window.location.reload();
      });
    } catch (err) {
      messageApi.error("Submit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    getBanksDropdownOptions().then((opts) =>
      setBanksDropdownOptions(JSON.parse(opts) || [])
    );
  }, []);

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      {contextHolder}

      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ margin: 0 }}>
          Add New Card
        </Title>
        <Text type="secondary">
          Enter your card details below to add it to your wallet
        </Text>
      </div>

      <Row gutter={24}>
        <Col xs={24} sm={10}>
          {/* Card visual preview */}

          <div
            style={{
              marginTop: 12,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CardView
              cardMetaData={{
                cardNumber:
                  form.getFieldValue("cardNumber") || "**** **** **** ****",
                cardType: isAmex(form.getFieldValue("cardNumber") || "")
                  ? "American Express"
                  : "Credit Card",
                cardCVV: form.getFieldValue("cvv") || "***",
                cardExpiry: form.getFieldValue("expiry") || "MM/YY",
              }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Upload an optional image of the card (for records).
            </Text>
          </div>
          <br />
        </Col>

        <Col xs={24} sm={14}>
          <div
            style={{
              background: "#f8f9fa",
              padding: "24px",
              borderRadius: "12px",
              border: "1px solid #e9ecef",
            }}
          >
            <Form
              layout="vertical"
              form={form}
              onFinish={onFinish}
              initialValues={{
                cardNumber: "",
                expiry: "",
                cvv: "",
              }}
            >
              <Form.Item
                label="Card number"
                name="cardNumber"
                rules={[
                  { required: true, message: "Card number is required" },
                  {
                    validator: (_, value) => {
                      const raw = (value || "").replace(/\s+/g, "");
                      if (!raw) return Promise.reject();
                      if (!/^\d{13,19}$/.test(raw)) {
                        return Promise.reject(
                          "Card number must contain 13–19 digits"
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  placeholder="1234 5678 9012 3456"
                  onChange={handleCardInputChange}
                  maxLength={19 + 3} // spaces
                  inputMode="numeric"
                />
              </Form.Item>

              <Form.Item
                label="Card Name"
                name="cardName"
                rules={[{ required: true, message: "Card Name is required" }]}
              >
                <Input
                  placeholder="Amazon Pay"
                  maxLength={19 + 3} // spaces
                  inputMode="text"
                />
              </Form.Item>

              {/* cardType and bankName */}

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    label="Card Type"
                    name="cardType"
                    rules={[
                      { required: true, message: "Card Type is required" },
                    ]}
                  >
                    <Radio.Group>
                      <Radio value="credit">Credit</Radio>
                      <Radio value="debit">Debit</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Bank Name"
                    name="bankName"
                    rules={[
                      { required: true, message: "Bank Name is required" },
                    ]}
                  >
                    <Select
                      placeholder="Select bank..."
                      options={[...banksDropdownOptions]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    label="Expiry (MM/YY)"
                    name="expiry"
                    rules={[
                      { required: true, message: "Expiry is required" },
                      {
                        validator: (_, value) => {
                          if (!value) return Promise.reject();
                          if (!validateExpiry(value))
                            return Promise.reject("Invalid or expired date");
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input placeholder="MM/YY or MM/YYYY" inputMode="numeric" />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label="CVV"
                    name="cvv"
                    rules={[
                      { required: true, message: "CVV is required" },
                      {
                        validator: (_, value) => {
                          const num = (value || "").replace(/\D/g, "");
                          const cardNumRaw = (
                            form.getFieldValue("cardNumber") || ""
                          ).replace(/\D/g, "");
                          if (!num) return Promise.reject();
                          if (isAmex(cardNumRaw)) {
                            if (!/^\d{4}$/.test(num))
                              return Promise.reject(
                                "AMEX CVV must be 4 digits"
                              );
                          } else {
                            if (!/^\d{3}$/.test(num))
                              return Promise.reject("CVV must be 3 digits");
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input
                      placeholder="123"
                      maxLength={4}
                      inputMode="numeric"
                    />
                  </Form.Item>
                </Col>
              </Row>
              {/* 
            <Form.Item label="Card image (optional)">
              <Upload
                beforeUpload={handleBeforeUpload}
                accept="image/*"
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />}>Select image</Button>
              </Upload>

              {imagePreview && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={imagePreview}
                    alt="preview"
                    style={{ maxWidth: "100%", borderRadius: 8 }}
                  />
                  <div style={{ marginTop: 6 }}>
                    <Button
                      danger
                      size="small"
                      onClick={() => {
                        setImagePreview(null);
                        setRawImageFile(null);
                      }}
                    >
                      Remove image
                    </Button>
                  </div>
                </div>
              )}
            </Form.Item> */}

              <Form.Item>
                <Space>
                  <Button onClick={onClose}>Cancel</Button>
                  <Button type="primary" htmlType="submit" loading={submitting}>
                    Save card
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        </Col>
      </Row>
    </div>
  );
}
