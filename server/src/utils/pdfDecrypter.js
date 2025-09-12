// decrypt-parse-tmp.mjs
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Decrypt an encrypted PDF by writing to /tmp
 * @param {string} inputPath - Path to encrypted PDF
 * @param {string} password - PDF password
 * @returns {Promise<Buffer>} decrypted PDF bytes
 */
export async function decryptPdfTmp(inputPath, password) {
  // Always target /tmp, safe in local + container
  const outputPath = path.join("/tmp", `decrypted.pdf`);

  try {
    const { stderr } = await execFileAsync("qpdf", [
      `--password=${password}`,
      "--decrypt",
      inputPath,
      outputPath,
    ]);
  } catch (err) {
    console.error("❌ qpdf error:", err.message);
  }

  const decrypted = fs.readFileSync(outputPath);

  // Clean up after ourselves
  fs.unlinkSync(outputPath);

  return decrypted;
}

/**
 * Unlock and parse text from a password-protected PDF
 */
export async function unlockAndParse(inputPath, password) {
  const decryptedBytes = await decryptPdfTmp(inputPath, password);
  const data = await pdf(decryptedBytes);
  return data.text;
}

// Example usage
// extract-fields.mjs
export function extractFields(statementText) {
  const lines = statementText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean); // remove empty lines

  const getAfterLabel = (label) => {
    const idx = lines.findIndex((l) => l.toUpperCase().includes(label));
    if (idx !== -1 && idx + 1 < lines.length) {
      return lines[idx + 1];
    }
    return null;
  };

  const fields = {
    statementDate: getAfterLabel("STATEMENT DATE"),
    paymentDueDate: getAfterLabel("PAYMENT DUE DATE"),
    totalAmountDue:
      (statementText.match(/Total Amount due\s+[`₹]?([\d,]+\.\d{2})/i) ||
        [])[1] || null,
    minimumAmountDue:
      (statementText.match(/Minimum Amount due\s+[`₹]?([\d,]+\.\d{2})/i) ||
        [])[1] || null,
    creditLimit:
      (statementText.match(/Credit Limit.*?[`₹]?([\d,]+\.\d{2})/i) || [])[1] ||
      null,
    availableCredit:
      (statementText.match(/Available Credit.*?[`₹]?([\d,]+\.\d{2})/i) ||
        [])[1] || null,
  };

  console.log("✅ Extracted fields:", fields);
  return fields;
}

export function extractAllMoneyAndDates(statementText) {
  // Match ₹ or ` followed by numbers with commas/decimals
  const moneyMatches = [
    ...statementText.matchAll(/[₹`]\s?([\d,]+\.\d{2})/g),
  ].map((m) => m[1]);

  // Match date formats like "August 15, 2025" or "Sep 2, 2025"
  const dateMatches = [
    ...statementText.matchAll(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/gi
    ),
  ].map((d) => d[0]);

  console.log("✅ Found money amounts:", moneyMatches);
  console.log("✅ Found dates:", dateMatches);

  return { money: moneyMatches, dates: dateMatches };
}

export function extractAllMoneyAndDates2(statementText) {
  // Extract rupee values
  const moneyMatches = [
    ...statementText.matchAll(/[₹`]\s?([\d,]+\.\d{2})/g),
  ].map((m) => m[1]);

  // Deduplicate & sort (convert to numbers for sorting)
  const money = Array.from(new Set(moneyMatches))
    .map((val) => ({
      raw: val,
      num: parseFloat(val.replace(/,/g, "")),
    }))
    .sort((a, b) => b.num - a.num)
    .map((m) => m.raw);

  // Extract dates
  const dateMatches = [
    ...statementText.matchAll(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/gi
    ),
  ].map((d) => d[0]);

  // Deduplicate & sort (convert to Date)
  const dates = Array.from(new Set(dateMatches))
    .map((d) => new Date(d))
    .sort((a, b) => a - b)
    .map((d) =>
      d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );

  console.log("✅ Found money amounts:", money);
  console.log("✅ Found dates:", dates);

  return { money, dates };
}

export const getStatement = async () => {
  try {
    const input = "/tmp/statement.pdf"; // replace with real path
    const text = await unlockAndParse(input, "suma0709"); // replace with real password
    return extractAllMoneyAndDates(text);
  } catch (err) {
    console.error("❌ Failed:", err.message);
  }
};
