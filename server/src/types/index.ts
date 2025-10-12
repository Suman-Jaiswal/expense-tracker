/**
 * Type definitions for the Expense Tracker application
 */

export interface CardMetadata {
  cardName: string;
  bankName: string;
  cardType: "credit" | "debit";
  cardNumber: string;
  cardExpiry: string;
  cardCVV: string;
}

export interface Card {
  id: string;
  resourceIdentifier: string;
  metaData: CardMetadata;
  billingDate: string;
  dueDate: string;
  billDue: string;
  lastBillAmount: string;
  lastBilledDate: string;
  creditLimit: string;
  availableCredit: string;
  offset: string;
  outstanding: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  resourceIdentifier: string;
  date: string;
  description: string;
  amount: string;
  type: "debit" | "credit";
  category?: string;
  merchant?: string;
  createdAt?: string;
}

export interface Statement {
  id: string;
  resourceIdentifier: string;
  statementDate: string;
  dueDate: string;
  totalAmount: string;
  minimumDue: string;
  fileUrl?: string;
  fileName?: string;
  parsed: boolean;
  createdAt?: string;
}

export interface BankAccount {
  id: string;
  resourceIdentifier: string;
  accountNumber: string;
  bankName: string;
  accountType: "savings" | "current";
  balance: string;
  createdAt?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface BankResource {
  enabled: boolean;
  label: string;
  identifierPrefix: string;
  pdfPassword: string;
  cards: string[];
  statementGenerationDay: number;
  emailQuery: string;
}

export interface Config {
  TEMP_PDF_PATH: string;
  AXIS_PDF_PASSWORD: string;
  SBI_PDF_PASSWORD: string;
  ICICI_PDF_PASSWORD: string;
  SBI_CARD_PREFIX: string;
  XX5965: string;
  AXIS_CARD_PREFIX: string;
  XX2376: string;
  ICICI_CARD_PREFIX: string;
  XX9003: string;
  XX5000: string;
  RESOURCES: {
    SBI: BankResource;
    AXIS: BankResource;
    ICICI: BankResource;
  };
}
