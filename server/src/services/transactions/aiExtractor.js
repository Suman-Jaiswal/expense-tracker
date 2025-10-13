import OpenAI from "openai";

/**
 * AI-powered transaction extractor using OpenAI GPT-4o-mini
 * Replaces regex-based extraction for better accuracy
 */

// Lazy initialization to ensure env vars are loaded
let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is not set. Please add it to your .env file."
      );
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Extract transactions from PDF text using AI
 * @param {string} pdfText - Raw text from PDF
 * @param {string} bankType - Bank type (ICICI, AXIS, SBI)
 * @param {Object} statementMetadata - Statement metadata (period, cardNumber, etc.)
 * @returns {Promise<Array>} Array of extracted transactions
 */
export async function extractTransactionsWithAI(
  pdfText,
  bankType,
  statementMetadata = {}
) {
  const openai = getOpenAIClient();

  console.log(
    `🤖 Using AI to extract transactions for ${bankType} statement...`
  );

  const systemPrompt = `You are an expert at parsing Indian credit card statements. Your task is to extract ALL transactions from ${bankType} credit card statement text.

IMPORTANT RULES:
1. Extract EVERY transaction you find, no matter how small
2. For dates: Convert to YYYY-MM-DD format (use ${statementMetadata.year || new Date().getFullYear()} as year if not explicit)
3. For amounts: Handle Indian formatting (1,234.56 or 1234.56). Return as number without commas
4. For type: "debit" for purchases/charges, "credit" for refunds/reversals/payments
5. Look for "CR" or negative sign (-) to indicate credits
6. Merchant names should be cleaned (remove extra spaces, card numbers, etc.)
7. Categories: Food, Shopping, Transport, Entertainment, Bills, Health, Education, Travel, Groceries, Other
8. If you see multiple amounts on one line, the LAST amount is usually the transaction amount

COMMON PATTERNS:
- ICICI: "DD/MM/YYYY[ref]MERCHANT NAME LOCATION[amount]"
- AXIS: "DD/MM/YYYY MERCHANT NAME [category] amount Dr/Cr"
- SBI: "DD/MM/YYYY MERCHANT NAME amount"

Return ONLY valid JSON with this structure:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Merchant Name",
      "merchant": "Merchant Name",
      "amount": 1234.56,
      "type": "debit",
      "category": "Shopping"
    }
  ]
}`;

  const userPrompt = `Extract all transactions from this ${bankType} credit card statement.

Statement Period: ${statementMetadata.period?.start || "Unknown"} to ${statementMetadata.period?.end || "Unknown"}
Card Number: ${statementMetadata.cardNumber || "Unknown"}

Statement Text:
${pdfText}

Return ONLY the JSON object with all transactions.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cost-effective and accurate
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent, deterministic output
      max_tokens: 4096, // Enough for most statements
    });

    const result = JSON.parse(completion.choices[0].message.content);

    if (!result.transactions || !Array.isArray(result.transactions)) {
      console.error("❌ Invalid AI response format:", result);
      throw new Error("AI returned invalid format");
    }

    console.log(
      `✅ AI extracted ${result.transactions.length} transactions from ${bankType} statement`
    );

    // Validate and clean transactions
    const validTransactions = result.transactions
      .filter((txn) => {
        // Basic validation
        if (!txn.date || !txn.amount || !txn.type || !txn.description) {
          console.warn("⚠️  Skipping invalid transaction:", txn);
          return false;
        }
        return true;
      })
      .map((txn) => ({
        date: txn.date,
        description: txn.description.trim(),
        merchant: txn.merchant?.trim() || txn.description.trim(),
        amount: parseFloat(txn.amount),
        type: txn.type.toLowerCase(),
        category: txn.category || "Other",
      }));

    console.log(
      `✅ Validated ${validTransactions.length} transactions (${result.transactions.length - validTransactions.length} skipped)`
    );

    return validTransactions;
  } catch (error) {
    console.error("❌ AI extraction error:", error.message);

    // If AI fails, throw error so fallback can be used if needed
    if (error.code === "insufficient_quota") {
      throw new Error(
        "OpenAI API quota exceeded. Please check your API key and billing."
      );
    }

    throw error;
  }
}

/**
 * Estimate cost of AI extraction (for monitoring)
 * GPT-4o-mini pricing: $0.15/1M input tokens, $0.60/1M output tokens
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @returns {number} Cost in USD
 */
export function estimateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1000000) * 0.15;
  const outputCost = (outputTokens / 1000000) * 0.6;
  return inputCost + outputCost;
}

/**
 * Batch process multiple statements with rate limiting
 * @param {Array} statements - Array of {pdfText, bankType, metadata}
 * @param {number} concurrency - Number of parallel requests
 * @returns {Promise<Array>} Array of results
 */
export async function batchExtractTransactions(statements, concurrency = 3) {
  console.log(
    `🤖 Batch processing ${statements.length} statements with AI (concurrency: ${concurrency})...`
  );

  const results = [];
  const chunks = [];

  // Split into chunks for parallel processing
  for (let i = 0; i < statements.length; i += concurrency) {
    chunks.push(statements.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const promises = chunk.map((stmt) =>
      extractTransactionsWithAI(stmt.pdfText, stmt.bankType, stmt.metadata)
        .then((transactions) => ({
          success: true,
          transactions,
          statementId: stmt.statementId,
        }))
        .catch((error) => ({
          success: false,
          error: error.message,
          statementId: stmt.statementId,
        }))
    );

    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);

    // Small delay between chunks to avoid rate limits
    if (chunks.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const successful = results.filter((r) => r.success).length;
  console.log(
    `✅ Batch processing complete: ${successful}/${statements.length} successful`
  );

  return results;
}
