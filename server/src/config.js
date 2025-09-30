export const config = {
  TEMP_PDF_PATH: "/tmp/statement.pdf",
  AXIS_PDF_PASSWORD: "SUMA0709", // Replace with actual password if needed
  SBI_PDF_PASSWORD: "070920025965", // Replace with actual password if needed
  ICICI_PDF_PASSWORD: "suma0709", // Replace with actual password if needed
  SBI_CARD_PREFIX: "card_SBI_",
  XX5965: "XX5965",
  AXIS_CARD_PREFIX: "card_AXIS_",
  XX2376: "XX2376",
  ICICI_CARD_PREFIX: "card_ICICI_",
  XX9003: "XX9003",
  XX5000: "XX5000",
  RESOURCES: {
    SBI: {
      enabled: false,
      label: "SBI Card",
      identifierPrefix: "card_SBI_",
      pdfPassword: "070920025965",
      cards: ["XX5965"],
      statementGenerationDay: 25,
      emailQuery: `from:(Statements@sbicard.com) subject:("SBI Card Monthly Statement") newer_than:${365}d`,
    },
    AXIS: {
      enabled: true,
      label: "Axis Card",
      identifierPrefix: "card_AXIS_",
      pdfPassword: "SUMA0709",
      cards: ["XX2376"],
      statementGenerationDay: 13,
      emailQuery: `from:(cc.statements@axisbank.com) subject:("Flipkart Axis Bank Credit Card Statement") newer_than:${365}d`,
    },
    ICICI: {
      enabled: false,
      label: "ICICI Card",
      identifierPrefix: "card_ICICI_",
      pdfPassword: "suma0709",
      cards: ["XX9003", "XX5000"],
      statementGenerationDay: 14,
      emailQuery: `from:(credit_cards@icicibank.com OR cards@icicibank.com) subject:("Statement") newer_than:${365}d`,
    },
  },
};
