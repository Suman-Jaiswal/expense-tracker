import crypto from "crypto";
import pdf from "pdf-parse";

/**
 * Table-based Transaction Extractor
 * More reliable than regex - detects table structure and extracts data
 */

/**
 * Generate deterministic transaction ID
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

/**
 * Detect if a line is a table header
 */
function isHeaderLine(line) {
  const headerKeywords = [
    "date",
    "description",
    "amount",
    "transaction",
    "particulars",
    "debit",
    "credit",
    "ser no",
    "serial",
  ];

  const lowerLine = line.toLowerCase();
  const matchCount = headerKeywords.filter((kw) =>
    lowerLine.includes(kw)
  ).length;

  return matchCount >= 2; // At least 2 header keywords
}

/**
 * Detect if a line marks the end of transactions
 */
function isEndMarker(line) {
  const endMarkers = [
    "total amount",
    "credit limit",
    "available credit",
    "summary",
    "statement summary",
    "payment due",
    "minimum amount",
    "total transactions",
    "shop & smile",
    "points expiry",
    "previous balance",
    "earned",
    "redeemed",
  ];

  const lowerLine = line.toLowerCase();
  return endMarkers.some((marker) => lowerLine.includes(marker));
}

/**
 * Detect if a line marks the start of transactions
 */
function isStartMarker(line) {
  const startMarkers = [
    "transaction details",
    "dateser",
    "domestic transactions",
    "international transactions",
    "transaction date",
    "transactions for",
    "date amount",
  ];

  const lowerLine = line.toLowerCase();
  return startMarkers.some((marker) => lowerLine.includes(marker));
}

/**
 * Check if string looks like a date
 */
function looksLikeDate(str) {
  if (!str || str.length < 6) return false;

  // DD/MM/YYYY or DD-MM-YYYY
  if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(str)) return true;

  // DD MMM YYYY or DD-MMM-YY
  if (/\d{1,2}\s*[A-Z]{3}\s*\d{2,4}/i.test(str)) return true;

  return false;
}

/**
 * Check if string looks like an amount
 */
function looksLikeAmount(str) {
  if (!str) return false;

  // Remove currency symbols and spaces
  const cleaned = str.replace(/[₹$\s]/g, "");

  // Check for number with optional comma and decimal
  return /^\d{1,3}(,?\d{3})*(\.\d{0,2})?$/.test(cleaned);
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  try {
    // DD/MM/YYYY
    const match1 = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (match1) {
      const [, day, month, year] = match1;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    // DD MMM YYYY
    const match2 = dateStr.match(/(\d{1,2})\s*([A-Z]{3})\s*(\d{4})/i);
    if (match2) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }

    // DD MMM YY (2-digit year)
    const match3 = dateStr.match(/^(\d{1,2})\s*([A-Z]{3})\s*(\d{2})$/i);
    if (match3) {
      const [, day, month, year] = match3;
      const fullYear = `20${year}`; // Assume 20XX
      const date = new Date(`${day} ${month} ${fullYear}`);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }

    // DD-MMM-YY
    const match4 = dateStr.match(/(\d{1,2})-([A-Z]{3})-(\d{2})/i);
    if (match4) {
      const [, day, month, year] = match4;
      const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      const date = new Date(`${day} ${month} ${fullYear}`);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }
  } catch (error) {
    console.warn("Date parse error:", error.message);
  }

  return null;
}

/**
 * Parse amount and type
 */
function parseAmount(amountStr) {
  if (!amountStr) return { amount: 0, type: "debit" };

  // Check for Cr/Dr markers
  const isCredit = /cr/i.test(amountStr) || amountStr.includes("+");

  // Extract number
  const cleaned = amountStr.replace(/[₹$,\s]/g, "").replace(/[^\d.]/g, "");

  let amount = parseFloat(cleaned);

  // If no decimal point and has many digits, assume last 2 are paise
  if (!cleaned.includes(".") && cleaned.length > 4) {
    amount = parseFloat(cleaned.slice(0, -2) + "." + cleaned.slice(-2));
  }

  return {
    amount: Math.abs(amount) || 0,
    type: isCredit ? "credit" : "debit",
  };
}

/**
 * Auto-categorize transaction
 */
function categorizeTransaction(description) {
  const desc = description.toLowerCase();

  const categories = {
    "Food & Dining": [
      "swiggy",
      "zomato",
      "restaurant",
      "cafe",
      "dominos",
      "mcdonald",
      "kfc",
    ],
    Shopping: ["amazon", "flipkart", "myntra", "ajio", "mall", "store"],
    Transport: ["uber", "ola", "rapido", "petrol", "fuel", "parking"],
    Entertainment: [
      "netflix",
      "prime",
      "hotstar",
      "spotify",
      "movie",
      "cinema",
    ],
    "Bills & Utilities": [
      "electricity",
      "water",
      "gas",
      "internet",
      "mobile",
      "recharge",
    ],
    Health: ["pharmacy", "hospital", "clinic", "medical", "doctor"],
    Travel: ["hotel", "flight", "railway", "ticket", "booking"],
    Groceries: ["supermarket", "grocery", "mart", "fresh", "vegetables"],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((kw) => desc.includes(kw))) {
      return category;
    }
  }

  return "Other";
}

/**
 * Extract merchant name
 */
function extractMerchant(description) {
  // Remove common prefixes
  let merchant = description
    .replace(/^(POS|UPI|NEFT|IMPS|ATM|PUR|PURCHASE|TXN|IND\*)\s*-?\s*/i, "")
    .trim();

  // Take first part before special chars
  const parts = merchant.split(/[\/-]/);
  merchant = parts[0].trim();

  // Clean up
  merchant = merchant.replace(/\*/g, "").replace(/\s+/g, " ").trim();

  return merchant || "Unknown";
}

/**
 * Split line into columns based on spacing
 */
function splitIntoColumns(line) {
  // Try different splitting strategies

  // Strategy 1: Split on 2+ consecutive spaces (common in tabular data)
  let columns = line.split(/\s{2,}/).filter((col) => col.trim());
  if (columns.length >= 3) {
    return columns;
  }

  // Strategy 2: For compact formats (like SBI), try to extract date, description, amount pattern
  // Pattern: DD MMM YY<Description><Amount>C/D
  const compactMatch = line.match(
    /^(\d{2}\s+[A-Z]{3}\s+\d{2})(.+?)([\d,]+\.\d{2})([CD])$/i
  );
  if (compactMatch) {
    const [, date, description, amount, typeIndicator] = compactMatch;
    return [date.trim(), description.trim(), amount + typeIndicator];
  }

  // Strategy 3: Try to split on single space if we have clear date pattern
  if (line.match(/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/)) {
    columns = line.split(/\s+/).filter((col) => col.trim());
    if (columns.length >= 3) {
      return columns;
    }
  }

  // Fallback: Return as single column (will be filtered out later)
  return [line.trim()];
}

/**
 * Extract table structure from lines
 */
function extractTableRows(lines) {
  const rows = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue;

    // Check if we're entering transaction section
    if (isStartMarker(line)) {
      inTable = true;
      continue;
    }

    // Check if we're leaving transaction section
    if (inTable && isEndMarker(line)) {
      break;
    }

    // Skip header lines
    if (inTable && isHeaderLine(line)) {
      continue;
    }

    // Extract data rows
    if (inTable) {
      const columns = splitIntoColumns(line);

      // Valid transaction row should have date and amount
      const hasDate = columns.some((col) => looksLikeDate(col));
      const hasAmount = columns.some((col) => looksLikeAmount(col));

      if (hasDate && hasAmount && columns.length >= 2) {
        rows.push(columns);
      }
    }
  }

  return rows;
}

/**
 * Map table row to transaction
 */
function mapRowToTransaction(columns, resourceIdentifier) {
  let date = null;
  let description = "";
  let amountStr = null;
  let type = "debit";

  // Find date column
  for (const col of columns) {
    if (looksLikeDate(col)) {
      date = parseDate(col);
      break;
    }
  }

  // Find amount column (usually last or second-last)
  for (let i = columns.length - 1; i >= 0; i--) {
    if (looksLikeAmount(columns[i])) {
      amountStr = columns[i];
      break;
    }
  }

  // Everything else is description (except date and amount)
  description = columns
    .filter((col) => !looksLikeDate(col) && !looksLikeAmount(col))
    .join(" ")
    .trim();

  // Parse amount
  const { amount, type: txnType } = parseAmount(amountStr);

  if (!date || !amount || !description) {
    return null; // Invalid row
  }

  return {
    id: generateTransactionId(
      resourceIdentifier,
      date,
      description,
      amount,
      txnType
    ),
    date,
    description,
    merchant: extractMerchant(description),
    amount,
    type: txnType,
    category: categorizeTransaction(description),
  };
}

/**
 * Main function: Extract transactions using table detection
 */
export async function extractTransactionsFromPDFTable(
  pdfPath,
  password,
  resourceIdentifier
) {
  try {
    console.log("📊 Extracting transactions using table detection...");

    // Read PDF
    let pdfData;
    if (password) {
      const { decryptPdfTmp } = await import("../../utils/pdfDecrypter.js");
      pdfData = await decryptPdfTmp(pdfPath, password);
    } else {
      const fs = await import("fs");
      pdfData = fs.readFileSync(pdfPath);
    }

    // Parse PDF
    const data = await pdf(pdfData);
    const text = data.text;

    console.log(`📝 Extracted ${text.length} characters from PDF`);

    // Split into lines
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);

    // Extract table structure
    const tableRows = extractTableRows(lines);
    console.log(`📋 Found ${tableRows.length} potential transaction rows`);

    // Map rows to transactions
    const transactions = [];
    for (const row of tableRows) {
      const transaction = mapRowToTransaction(row, resourceIdentifier);
      if (transaction) {
        transactions.push(transaction);
      }
    }

    console.log(`✅ Extracted ${transactions.length} valid transactions`);

    return {
      bank: "AUTO_DETECTED",
      totalTransactions: transactions.length,
      transactions,
      extractedAt: new Date().toISOString(),
      method: "table-detection",
    };
  } catch (error) {
    console.error("❌ Table extraction error:", error.message);
    throw error;
  }
}
