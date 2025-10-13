# Statement Validation Report

**Generated:** 2025-10-13

## Summary

- **Total Statements Validated:** 20
- **Missing Transactions (in PDF but not in DB):** 171
- **Extra Transactions (in DB but not in PDF):** 295
- **Incorrect Transactions:** 0
- **Ambiguous Transactions Found:** 8

---

## Key Findings

### 1. **Amount Parsing Issues**

Several transactions have concatenated amounts that were parsed incorrectly:

**Example from Statement 1970cfe1f95b3dc8 (SBI XX5965):**

- PDF: `887815199.37` (likely should be `15199.37`)
- This appears to be a payment received entry

**Example from Statement 1959d29ae6098fd8 (ICICI XX9003):**

- PDF: `331660` (likely should be `1660` for Riot Dublin)

### 2. **Date Discrepancies**

Many transactions have dates that differ by 1-2 days between PDF and database:

**Examples:**

- **SBI Card Transactions:**
  - PDF: 2025-05-14 → DB: 2025-05-14 ✅
  - PDF: 2025-05-16 → DB: 2025-05-15 ❌ (1 day off)
  - PDF: 2025-05-18 → DB: 2025-05-18 ✅
- **ICICI Card Transactions:**
  - PDF: 2024-12-16 → DB: 2024-12-16 ✅
  - PDF: 2025-01-15 → DB: 2025-01-15 ✅

### 3. **Description Differences**

Some transaction descriptions are truncated or slightly different:

**Examples:**

- PDF: `YOUTUBEGOOGLE MUMBAI IN` → DB: `YOUTUBE`
- PDF: `PAYBLINKIT GURGAON IN` → DB: `PAYBLINKIT`
- PDF: `Riot Dublin IE` → DB: `Riot Dublin`

### 4. **Missing Transactions**

171 transactions found in PDFs but not in database:

**Top Categories:**

- UPI transactions from SBI cards (very common - likely due to extraction issues)
- International transactions (Riot Games, etc.)
- Various merchants (YouTube, Blinkit, Zomato, etc.)

### 5. **Extra Transactions**

295 transactions in database but not found in PDFs:

**Possible Reasons:**

- Amortization entries (EMI breakdowns)
- Duplicate entries with slightly different dates
- Manual entries
- Previous sync issues

---

## Detailed Breakdown by Statement

### Statement: card_ICICI_XX9003 (2024-12-15 to 2025-01-14)

- **PDF Transactions:** 15
- **DB Transactions:** 27
- **Missing:** 5 transactions
- **Extra:** 17 transactions

**Notable Issues:**

- Multiple Riot Dublin transactions with concatenated amounts (`331660` instead of `1660`)
- YouTube transactions with description differences

### Statement: card_SBI_XX5965 (2025-05-24 to 2025-05-30)

- **PDF Transactions:** 24
- **DB Transactions:** 22
- **Missing:** 24 transactions (100% of PDF transactions!)
- **Extra:** 22 transactions

**Major Issue:**

- Payment received entry: `887815199.37` (clearly incorrect - likely `15199.37`)
- All UPI transactions are missing from DB
- Date mismatches on most entries

### Statement: card_SBI_XX5965 (2025-06-24 to 2025-06-29)

- **PDF Transactions:** 20
- **DB Transactions:** 20
- **Missing:** 20 transactions (100% of PDF transactions!)
- **Extra:** 20 transactions

**Issue:**

- Complete date mismatch - all transactions have different dates

### Statement: card_AXIS_XX2376 (2025-09-12 to 2025-09-29)

- **PDF Transactions:** 0
- **DB Transactions:** 2
- **Ambiguous:** 2 transactions

**Issue:**

- PDF extraction completely failed for AXIS card
- Only ambiguous transactions were detected

---

## Root Cause Analysis

### 1. **PDF Extraction Issues**

- AXIS Bank: Extraction is failing completely (0 transactions extracted)
- ICICI Bank: Partial extraction with concatenated amounts
- SBI Bank: UPI transactions being extracted but with date issues

### 2. **Date Handling**

- SBI transactions seem to have systematic date offset issues
- Possibly related to statement generation date vs transaction date

### 3. **Duplicate Handling**

- Many "extra" transactions in DB suggest previous syncs may have created duplicates
- Need better deduplication logic

### 4. **Amortization Entries**

- ICICI card has EMI amortization entries in DB that don't appear in PDF
- These are legitimate but explain some of the "extra" count

---

## Recommendations

### Before Running Fix Script:

1. **Review Large Amount Transactions**
   - Check transactions > ₹100,000 (likely parsing errors)
   - Example: `887815199.37`, `331660`, `221119.82`

2. **Verify Date Offsets**
   - SBI card transactions need manual review for dates
   - Consider if 1-day offset is acceptable or needs fixing

3. **Review Amortization Entries**
   - These are marked as "Extra" but may be valid
   - Consider excluding them from removal

4. **Fix AXIS Extraction**
   - 0 transactions extracted suggests extractor needs improvement
   - May need AI extractor for AXIS statements

### Action Items:

#### Option 1: Conservative Approach (Recommended)

- **Add only clearly missing transactions** (e.g., YouTube, Blinkit, etc.)
- **DO NOT remove** "extra" transactions yet
- **Review large amounts** manually before adding

#### Option 2: Aggressive Approach

- Run full fix script
- Remove all "extra" transactions
- Risk: May remove valid transactions

---

## Fix Script Details

The generated fix script will:

### Add 171 Missing Transactions

- Includes all transactions found in PDFs but not in DB
- Each transaction will be marked with `fixedAt` timestamp
- Each transaction will include `fixReason: "Missing from validation"`

### Remove 295 Extra Transactions

- **⚠️ THIS IS COMMENTED OUT BY DEFAULT**
- You must uncomment the line to enable removal
- Review carefully before enabling

### Update 0 Incorrect Transactions

- No transactions need field updates

---

## Next Steps

1. **Review this report carefully**
2. **Examine the validation-results.json** for detailed transaction data
3. **Decide on approach** (Conservative vs Aggressive)
4. **Edit fix-transactions.js** if needed:
   - Remove transactions with suspicious amounts
   - Comment out removals if too risky
5. **Run:** `node fix-transactions.js` when ready

---

## Files Generated

- `validation-results.json` - Full detailed results
- `fix-transactions.js` - Automated fix script
- `VALIDATION_REPORT.md` - This report

---

## Notes

- The validation compared PDFs directly with DB transactions using my AI analysis
- All PDFs were fetched fresh from Google Drive
- Extraction used both table-based and regex-based methods with fallback
- Many ICICI PDFs showed "Empty FlateDecode stream" warnings (PDF format issue)
- AXIS Bank extraction completely failed and needs improvement
