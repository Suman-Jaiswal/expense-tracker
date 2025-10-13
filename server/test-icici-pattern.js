// Test ICICI transaction parsing with sample lines

const sampleLines = [
  // Format: DD/MM/YYYY{11-digit-ref}{description}{1-2-digit-reward}{amount}{CR?}
  "13/07/2025123456789012IND*AMAZON HTTP://WWW.AM IN16581.93",
  "13/07/2025123456789012IND*AMAZON HTTP://WWW.AM IN5581.93",
  "13/07/2025123456789012IND*AMAZON HTTP://WWW.AM IN 16 581.93",
  "13/07/2025123456789012IND*AMAZON HTTP://WWW.AM 16581.93",
  "13/07/202512345678901AMAZON HTTP://WWW.AM IN5819316300",
  "13/07/202512345678901AMAZON5819316300581.93",
];

// ICICI Patterns
const pattern1 =
  /^(\d{2}\/\d{2}\/\d{4})\d{11}(.+?)\d{1,2}([\d,]+\.\d{2})\s*(CR)?$/i;
const pattern2 = /(\d{2}-[A-Z]{3}-\d{2})\s+(.*?)\s+([\d,]+\.\d{2})/i;

console.log("🔍 TESTING ICICI TRANSACTION PATTERNS\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

console.log("Pattern 1:");
console.log(pattern1.toString());
console.log("\nExpected format:");
console.log("DD/MM/YYYY{11-digit-ref}{description}{1-2-digit-reward}{amount}");
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

sampleLines.forEach((line, idx) => {
  console.log(`Test ${idx + 1}: "${line}"`);
  console.log(`Length: ${line.length}\n`);

  const match = line.match(pattern1);
  if (match) {
    console.log("✅ MATCHED!");
    console.log(`  Date: "${match[1]}"`);
    console.log(`  Description: "${match[2]}"`);
    console.log(`  Amount captured: "${match[3]}"`);
    console.log(`  Type: ${match[4] || "DR"}`);

    // Parse amount
    const cleanAmount = match[3].replace(/[₹,\s]/g, "");
    const parsedAmount = parseFloat(cleanAmount);
    console.log(`  Parsed amount: ${parsedAmount}`);
  } else {
    console.log("❌ NO MATCH");

    // Show what numbers are in the line
    const allNumbers = line.match(/\d+/g);
    console.log(
      `  All numbers found: ${allNumbers ? allNumbers.join(", ") : "none"}`
    );

    const decimalAmounts = line.match(/[\d,]+\.\d{2}/g);
    console.log(
      `  Decimal amounts: ${decimalAmounts ? decimalAmounts.join(", ") : "none"}`
    );
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
});

// Now test the problematic amount
console.log("\n\n🔴 ANALYZING THE PROBLEMATIC TRANSACTION:\n");
console.log("Amount in DB: 58193163");
console.log("Expected: ~581.93\n");

console.log("Possible scenarios:");
console.log("1. Amount without decimal: '58193163' → parseFloat() → 58193163");
console.log(
  "2. Amount with space: '581 93' → after removing spaces → '58193' → 58193"
);
console.log("3. Pattern captured wrong part: captured reward+amount together");
console.log("4. Multiple amounts in line, captured wrong one");
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Test what happens if we have the exact DB format
const testAmount = "58193163";
console.log(`\nIf amount string is "${testAmount}":`);
console.log(`  parseFloat("${testAmount}") = ${parseFloat(testAmount)}`);

// What if it was stored as paise (cents)?
console.log(`\nIf amount is in paise (58193163 paise):`);
console.log(`  In rupees: ₹${(58193163 / 100).toFixed(2)}`);

// What if last 2 digits are decimal?
console.log(`\nIf last 2 digits are decimal (581931.63):`);
const assumedRupees = Math.floor(58193163 / 100);
const assumedPaise = 58193163 % 100;
console.log(`  Amount: ₹${assumedRupees}.${assumedPaise}`);

// What if first 3 digits are rupees?
console.log(`\nIf pattern is XXX.XXXXX (581.93163):`);
console.log(`  Doesn't make sense - too many decimal places`);

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log("\n💡 MOST LIKELY CAUSE:");
console.log("The regex failed to match because the PDF text doesn't have");
console.log("a decimal point, and the pattern requires '\\.d{2}' at the end.");
console.log("\nThis causes the pattern to NOT match, and the transaction");
console.log("might be captured by pattern2 or fallback logic, which then");
console.log("captures the wrong amount or parses it incorrectly.");
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
