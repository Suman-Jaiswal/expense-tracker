import crypto from "crypto";
import pdf from "pdf-parse";
import { decryptPdfTmp } from "../../utils/pdfDecrypter.js";

/**
 * Transaction Extractor Service
 * Extracts transactions from credit card statement PDFs
 */

/**
 * Generate a deterministic transaction ID based on transaction content
 * This ensures same transaction always gets same ID (prevents duplicates)
 */
function generateTransactionId(
  resourceIdentifier,
  date,
  description,
  amount,
  type
) {
  const data = `${resourceIdentifier}|${date}|${description}|${amount}|${type}`;
  return `txn_${crypto.createHash("md5").update(data).digest("hex").substring(0, 16)}`;
}

// Common transaction keywords for different banks
const TRANSACTION_MARKERS = {
  AXIS: ["Transaction Date", "Description", "Amount", "Domestic Transactions"],
  ICICI: ["Transaction Details", "Date", "Description", "Amount (Rs)"],
  HDFC: ["Date", "Description", "Amount"],
  SBI: ["Transaction Date", "Particulars", "Amount"],
  COMMON: ["Date", "Description", "Amount", "Debit", "Credit"],
};

// Category keywords for automatic categorization
const CATEGORY_KEYWORDS = {
  Food: [
    "swiggy",
    "zomato",
    "restaurant",
    "cafe",
    "dominos",
    "pizza",
    "food",
    "mcdonald",
    "kfc",
    "burger",
    "starbucks",
  ],
  Shopping: [
    "amazon",
    "flipkart",
    "myntra",
    "ajio",
    "mall",
    "store",
    "shop",
    "retail",
    "mart",
    "bazaar",
    "lifestyle",
  ],
  Transport: [
    "uber",
    "ola",
    "rapido",
    "petrol",
    "fuel",
    "parking",
    "toll",
    "cab",
    "taxi",
    "railway",
    "metro",
  ],
  Entertainment: [
    "netflix",
    "prime",
    "hotstar",
    "spotify",
    "youtube",
    "movie",
    "cinema",
    "theatre",
    "game",
    "bookmyshow",
  ],
  Bills: [
    "electricity",
    "water",
    "gas",
    "internet",
    "broadband",
    "mobile",
    "recharge",
    "postpaid",
    "prepaid",
  ],
  Health: [
    "pharmacy",
    "medicine",
    "hospital",
    "clinic",
    "doctor",
    "medical",
    "health",
    "pharma",
  ],
  Education: [
    "course",
    "udemy",
    "coursera",
    "book",
    "education",
    "school",
    "college",
  ],
  Travel: [
    "hotel",
    "flight",
    "makemytrip",
    "goibibo",
    "yatra",
    "booking",
    "airbnb",
    "travel",
  ],
  Groceries: [
    "bigbasket",
    "grofers",
    "blinkit",
    "instamart",
    "zepto",
    "dmart",
    "reliance fresh",
  ],
  Other: [],
};

/**
 * Categorize transaction based on description
 */
function categorizeTransaction(description) {
  const lowerDesc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "Other") continue;
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        return category;
      }
    }
  }

  return "Other";
}

/**
 * Extract merchant name from description
 */
function extractMerchant(description) {
  // Remove common prefixes
  let merchant = description
    .replace(/^(POS|UPI|NEFT|IMPS|ATM|PUR|PURCHASE|TXN)\s*-?\s*/i, "")
    .replace(/\s+\d{2}\/\d{2}\/\d{4}$/, "") // Remove trailing dates
    .replace(/\s+\d{4}$/, "") // Remove trailing year
    .trim();

  // Extract first meaningful part (usually merchant name)
  const parts = merchant.split(/[/-]/);
  merchant = parts[0].trim();

  // Clean up
  merchant = merchant.replace(/\*/g, "").replace(/\s+/g, " ").trim();

  return merchant || "Unknown Merchant";
}

/**
 * Parse date from various formats
 */
function parseTransactionDate(dateStr) {
  if (!dateStr) return null;

  // Try different date formats
  const formats = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    // DD MMM YYYY or DD-MMM-YYYY
    /(\d{1,2})\s*([A-Z]{3})\s*(\d{4})/i,
    // MMM DD, YYYY
    /([A-Z]{3})\s*(\d{1,2}),?\s*(\d{4})/i,
  ];

  for (const regex of formats) {
    const match = dateStr.match(regex);
    if (match) {
      try {
        let date;
        if (regex === formats[0]) {
          // DD/MM/YYYY
          const [, day, month, year] = match;
          date = new Date(`${year}-${month}-${day}`);
        } else if (regex === formats[1]) {
          // DD MMM YYYY
          date = new Date(dateStr);
        } else {
          // MMM DD, YYYY
          date = new Date(dateStr);
        }

        if (!isNaN(date.getTime())) {
          return date.toISOString().split("T")[0];
        }
      } catch (e) {
        continue;
      }
    }
  }

  return null;
}

/**
 * Parse amount and determine type (debit/credit)
 */
function parseAmount(amountStr) {
  if (!amountStr) return { amount: 0, type: "debit" };

  // Remove currency symbols and commas
  const cleanAmount = amountStr.replace(/[₹,\s]/g, "");

  // Check for Cr/Dr indicators
  const isCredit = /cr/i.test(amountStr) || cleanAmount.startsWith("+");
  const isDebit = /dr/i.test(amountStr) || cleanAmount.startsWith("-");

  // Parse the number
  const numMatch = cleanAmount.match(/[\d.]+/);
  const amount = numMatch ? parseFloat(numMatch[0]) : 0;

  return {
    amount: Math.abs(amount),
    type: isCredit ? "credit" : "debit",
  };
}

/**
 * Extract transactions from AXIS Bank statement
 */
function extractAxisTransactions(text) {
  const transactions = [];
  const lines = text.split("\n").map((l) => l.trim());

  // AXIS format: DD/MM/YYYY{Description}{Category}{Amount Dr/Cr}{Cashback Cr}
  // Example: 04/08/2025FLIPKART,BANGLORE                              DEPT STORES192.00 Dr9.00 Cr
  // Note: No space between category and amount
  const transactionPattern =
    /^(\d{2}\/\d{2}\/\d{4})(.+?)([\d,]+\.\d{2})\s+(Dr|Cr)/i;

  let inTransactionSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start of transaction section - look for "DATETRANSACTION DETAILS" or similar
    if (
      line.includes("DATETRANSACTION DETAILS") ||
      line.includes("Transaction Details") ||
      line.includes("TRANSACTION DETAILS")
    ) {
      inTransactionSection = true;
      continue;
    }

    // End of transaction section
    if (
      inTransactionSection &&
      (line.includes("End of Statement") ||
        line.includes("Total Amount Due") ||
        line.includes("IMPORTANT MESSAGE"))
    ) {
      break;
    }

    if (inTransactionSection && line.match(/^\d{2}\/\d{2}\/\d{4}/)) {
      const match = line.match(transactionPattern);
      if (match) {
        const [, date, descriptionRaw, amount, type] = match;

        // Clean description - remove merchant category that appears after spaces
        const description = descriptionRaw.split(/\s{2,}/)[0].trim();

        const { amount: parsedAmount, type: txnType } = parseAmount(
          amount + " " + type
        );

        const transaction = {
          date: parseTransactionDate(date),
          description: description,
          merchant: extractMerchant(description),
          amount: parsedAmount,
          type: txnType,
          category: categorizeTransaction(description),
          rawText: line,
        };

        transactions.push(transaction);
      }
    }
  }

  return transactions;
}

/**
 * Extract transactions from ICICI Bank statement
 */
function extractIciciTransactions(text) {
  const transactions = [];
  const lines = text.split("\n").map((l) => l.trim());

  // Pattern 1: DD/MM/YYYY followed by long ref number, description, and amount
  // Format: DD/MM/YYYY{11-digit-ref}{Description}{1-2-digit-reward}{amount} [CR]
  // Description can include letters, numbers, spaces, @, -, <, >, etc.
  const pattern1 =
    /^(\d{2}\/\d{2}\/\d{4})\d{11}(.+?)\d{1,2}([\d,]+\.\d{2})\s*(CR)?$/i;

  // Pattern 2: DD-MMM-YY Description Amount (older format)
  const pattern2 = /(\d{2}-[A-Z]{3}-\d{2})\s+(.*?)\s+([\d,]+\.\d{2})/i;

  let inTransactionSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start of transaction section
    if (
      line.includes("Transaction Details") ||
      line.includes("DateSerNo") ||
      line.includes("Domestic Transactions")
    ) {
      inTransactionSection = true;
      continue;
    }

    // End of transaction section
    if (
      inTransactionSection &&
      (line.includes("Credit Limit") ||
        line.includes("ICICI Bank Credit Card GST") ||
        line.includes("Available Credit"))
    ) {
      break;
    }

    if (inTransactionSection) {
      // Try pattern 1 first (newer ICICI format with ref number)
      let match = line.match(pattern1);
      if (match) {
        const [, date, description, amount, creditMarker] = match;
        const { amount: parsedAmount, type: txnType } = parseAmount(
          amount + (creditMarker || "")
        );

        transactions.push({
          date: parseTransactionDate(date),
          description: description.trim(),
          merchant: extractMerchant(description),
          amount: parsedAmount,
          type: txnType,
          category: categorizeTransaction(description),
          rawText: line,
        });
        continue;
      }

      // Try pattern 2 (older ICICI format)
      match = line.match(pattern2);
      if (match) {
        const [, date, description, amount] = match;
        const { amount: parsedAmount, type: txnType } = parseAmount(amount);

        transactions.push({
          date: parseTransactionDate(date),
          description: description.trim(),
          merchant: extractMerchant(description),
          amount: parsedAmount,
          type: txnType,
          category: categorizeTransaction(description),
          rawText: line,
        });
      }
    }
  }

  return transactions;
}

/**
 * Generic transaction extractor (fallback)
 */
function extractGenericTransactions(text) {
  const transactions = [];
  const lines = text.split("\n");

  // Common patterns for transactions
  const patterns = [
    // Pattern 1: DD/MM/YYYY Description Amount
    /(\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+([\d,]+\.\d{2})\s*(Cr|Dr)?$/i,
    // Pattern 2: DD-MMM-YY Description Amount
    /(\d{2}-[A-Z]{3}-\d{2})\s+(.*?)\s+([\d,]+\.\d{2})/i,
    // Pattern 3: DD MMM YYYY Description Amount
    /(\d{2}\s+[A-Z]{3}\s+\d{4})\s+(.*?)\s+([\d,]+\.\d{2})/i,
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const [, date, description, amount, type] = match;
        const { amount: parsedAmount, type: txnType } = parseAmount(
          amount + (type || "")
        );

        transactions.push({
          date: parseTransactionDate(date),
          description: description.trim(),
          merchant: extractMerchant(description),
          amount: parsedAmount,
          type: txnType,
          category: categorizeTransaction(description),
          rawText: line,
        });
        break;
      }
    }
  }

  return transactions;
}

/**
 * Detect bank from statement text
 */
function detectBank(text) {
  const upperText = text.toUpperCase();

  if (upperText.includes("AXIS BANK") || upperText.includes("FLIPKART AXIS")) {
    return "AXIS";
  }
  if (upperText.includes("ICICI BANK")) {
    return "ICICI";
  }
  if (upperText.includes("HDFC BANK")) {
    return "HDFC";
  }
  if (upperText.includes("SBI") || upperText.includes("STATE BANK")) {
    return "SBI";
  }

  return "GENERIC";
}

/**
 * Main function: Extract transactions from PDF
 */
export async function extractTransactionsFromPDF(pdfPath, password = null) {
  try {
    console.log("📄 Reading PDF:", pdfPath);

    let pdfData;
    if (password) {
      // Decrypt if password provided
      pdfData = await decryptPdfTmp(pdfPath, password);
    } else {
      // Read directly
      const fs = await import("fs");
      pdfData = fs.readFileSync(pdfPath);
    }

    // Parse PDF
    const data = await pdf(pdfData);
    const text = data.text;

    console.log("📝 Extracted text length:", text.length);

    // Detect bank
    const bank = detectBank(text);
    console.log("🏦 Detected bank:", bank);

    // Extract transactions based on bank
    let transactions;
    switch (bank) {
      case "AXIS":
        transactions = extractAxisTransactions(text);
        break;
      case "ICICI":
        transactions = extractIciciTransactions(text);
        break;
      default:
        transactions = extractGenericTransactions(text);
    }

    console.log(`✅ Extracted ${transactions.length} transactions`);

    // Add metadata with deterministic IDs
    const result = {
      bank,
      totalTransactions: transactions.length,
      transactions: transactions.map((txn) => ({
        id: generateTransactionId(
          "temp", // Will be replaced with actual resourceIdentifier later
          txn.date,
          txn.description,
          txn.amount,
          txn.type
        ),
        ...txn,
      })),
      extractedAt: new Date().toISOString(),
    };

    return result;
  } catch (error) {
    console.error("❌ Error extracting transactions:", error);
    throw error;
  }
}

/**
 * Extract transactions from plain text
 */
export function extractTransactionsFromText(text) {
  const bank = detectBank(text);

  let transactions;
  switch (bank) {
    case "AXIS":
      transactions = extractAxisTransactions(text);
      break;
    case "ICICI":
      transactions = extractIciciTransactions(text);
      break;
    default:
      transactions = extractGenericTransactions(text);
  }

  return {
    bank,
    totalTransactions: transactions.length,
    transactions: transactions.map((txn) => ({
      id: generateTransactionId(
        "temp", // Will be replaced with actual resourceIdentifier later
        txn.date,
        txn.description,
        txn.amount,
        txn.type
      ),
      ...txn,
    })),
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Export transactions to JSON format ready for database
 */
export function formatTransactionsForDB(transactions, cardId, statementId) {
  return transactions.map((txn) => ({
    id: txn.id,
    resourceIdentifier: cardId,
    statementId: statementId,
    date: txn.date,
    description: txn.description,
    merchant: txn.merchant,
    amount: txn.amount,
    type: txn.type,
    category: txn.category,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}
