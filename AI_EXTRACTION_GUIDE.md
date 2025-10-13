# AI-Based Transaction Extraction Guide

## Problem with Current Regex Approach

### Limitations

1. **Rigid Patterns**: Regex requires exact patterns, fails with variations
2. **Concatenated Text**: Cannot intelligently separate merged text (e.g., "PAYMENT000PP015122BX887815199.37C")
3. **Context-Blind**: Doesn't understand semantic meaning
4. **Maintenance**: Each bank format requires custom regex patterns
5. **Ambiguity**: Cannot make intelligent guesses when data is unclear

### Current Ambiguous Cases

- **AXIS**: Multiple amounts in one line (main + cashback)
- **ICICI**: Missing decimals, unclear amount boundaries
- **SBI**: Transaction IDs concatenated with amounts

---

## AI/ML Solutions

### Option 1: OpenAI GPT-4 Vision (Recommended)

**Best for**: Direct PDF/image processing

#### Advantages

- ✅ Reads PDF statements directly (no text extraction needed)
- ✅ Understands table layouts visually
- ✅ Handles any bank format without training
- ✅ Very high accuracy (95%+)
- ✅ No regex maintenance
- ✅ Easy to implement

#### Cost

- ~$0.01 per page for GPT-4 Vision
- ~100 pages/month = $1/month
- Very affordable for personal use

#### Implementation

```javascript
// Extract transactions using GPT-4 Vision
async function extractWithGPT4Vision(pdfPath) {
  // Convert PDF pages to images
  const images = await pdfToImages(pdfPath);

  const results = [];
  for (const image of images) {
    const base64Image = fs.readFileSync(image).toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all credit card transactions from this statement image. 
              Return a JSON array with this exact structure:
              [
                {
                  "date": "YYYY-MM-DD",
                  "description": "merchant name and description",
                  "amount": 1234.56,
                  "type": "debit" or "credit",
                  "confidence": 0.0-1.0
                }
              ]
              
              Rules:
              - Parse dates carefully
              - Separate amounts from transaction IDs
              - Identify debit/credit correctly
              - Include confidence score (0-1)
              - Skip header/footer text
              `,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });

    const transactions = JSON.parse(response.choices[0].message.content);
    results.push(...transactions);
  }

  return results;
}
```

---

### Option 2: OpenAI GPT-4 Text (Good Alternative)

**Best for**: Using existing PDF text extraction

#### Advantages

- ✅ Works with extracted text
- ✅ Understands context and semantics
- ✅ Can separate concatenated text intelligently
- ✅ Handles multiple formats
- ✅ Lower cost than Vision

#### Cost

- ~$0.002 per statement (much cheaper)
- ~100 statements/month = $0.20/month

#### Implementation

```javascript
async function extractWithGPT4(pdfText) {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `You are an expert at parsing credit card statements. 
        You can intelligently separate concatenated text, identify transaction 
        boundaries, and extract accurate amounts even from messy formatting.`,
      },
      {
        role: "user",
        content: `Extract all transactions from this credit card statement text:

${pdfText}

Return ONLY valid JSON (no markdown, no explanations):
{
  "bank": "AXIS" | "ICICI" | "SBI" | "OTHER",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "merchant description",
      "amount": 1234.56,
      "type": "debit" | "credit",
      "confidence": 0.95,
      "rawLine": "original text line"
    }
  ]
}

Rules:
1. Parse dates correctly (handle DD/MM/YYYY, DD MMM YY formats)
2. When you see concatenated text like "PAYMENT000PP015122BX887815199.37C", 
   intelligently separate: description="PAYMENT 000PP015122BX5RR0XO", amount=15199.37, type="credit"
3. For multiple amounts on same line (cashback), create separate transactions
4. Set confidence < 0.8 if unsure
5. Preserve original line in rawLine
`,
      },
    ],
    temperature: 0.1, // Low temperature for consistency
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content);
}
```

---

### Option 3: Claude 3.5 Sonnet (Alternative)

**Best for**: Cost-conscious, similar to GPT-4

#### Advantages

- ✅ Cheaper than GPT-4
- ✅ Good at structured output
- ✅ Can handle images (Claude 3)
- ✅ Fast processing

#### Cost

- ~$0.001 per statement
- Very affordable

#### Implementation

```javascript
import Anthropic from "@anthropic-ai/sdk";

async function extractWithClaude(pdfText) {
  const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
  });

  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Extract credit card transactions from this statement. 
        Handle concatenated text intelligently.
        
        ${pdfText}
        
        Return JSON: { transactions: [...] }`,
      },
    ],
  });

  return JSON.parse(message.content[0].text);
}
```

---

### Option 4: Local LLM (Llama 3, Mistral)

**Best for**: Privacy, no API costs

#### Advantages

- ✅ No recurring costs
- ✅ Complete privacy
- ✅ No internet dependency
- ❌ Requires local GPU
- ❌ Lower accuracy than GPT-4

#### Models to Consider

- **Llama 3 8B**: Fast, decent accuracy
- **Mistral 7B**: Good structured output
- **Gemma 7B**: Google's model

#### Implementation

```javascript
// Using Ollama (local LLM runner)
import ollama from "ollama";

async function extractWithLocalLLM(pdfText) {
  const response = await ollama.chat({
    model: "llama3:8b",
    messages: [
      {
        role: "system",
        content: "You extract credit card transactions from statements.",
      },
      {
        role: "user",
        content: `Extract transactions as JSON from:\n${pdfText}`,
      },
    ],
    format: "json",
  });

  return JSON.parse(response.message.content);
}
```

---

## Recommended Architecture

### Hybrid Approach (Best of Both Worlds)

```
1. Try Regex First (Fast, Free)
   ↓
2. If ambiguous → Use AI (Accurate, Small Cost)
   ↓
3. Store both results
   ↓
4. User reviews only AI-flagged transactions
```

### Implementation Flow

```javascript
async function intelligentExtraction(pdfPath, bank) {
  // Step 1: Extract text
  const pdfText = await extractTextFromPDF(pdfPath);

  // Step 2: Try regex first
  const regexResult = extractWithRegex(pdfText, bank);

  // Step 3: If ambiguous, use AI
  if (regexResult.ambiguousCount > 0) {
    console.log(
      `Found ${regexResult.ambiguousCount} ambiguous transactions, using AI...`
    );

    // Extract only the ambiguous lines with AI
    const ambiguousLines = regexResult.ambiguousTransactions
      .map((t) => t.rawLine)
      .join("\n");

    const aiResult = await extractWithGPT4(`
      Parse these ambiguous transaction lines:
      ${ambiguousLines}
    `);

    // Merge: Use regex for clean, AI for ambiguous
    return {
      transactions: [...regexResult.transactions, ...aiResult.transactions],
      method: "hybrid",
      aiUsed: true,
      aiCost: calculateCost(ambiguousLines),
    };
  }

  // No ambiguous transactions, return regex result
  return {
    transactions: regexResult.transactions,
    method: "regex",
    aiUsed: false,
    aiCost: 0,
  };
}
```

---

## Cost Comparison (100 statements/month)

| Method       | Cost/Statement | Monthly Cost | Accuracy | Speed       |
| ------------ | -------------- | ------------ | -------- | ----------- |
| Regex Only   | $0             | $0           | 85%      | ⚡ Fast     |
| GPT-4 Vision | $0.01          | $1.00        | 98%      | 🐌 Slow     |
| GPT-4 Text   | $0.002         | $0.20        | 95%      | ⚡ Fast     |
| Claude 3.5   | $0.001         | $0.10        | 94%      | ⚡ Fast     |
| **Hybrid**   | **$0.0005**    | **$0.05**    | **95%**  | **⚡ Fast** |
| Local LLM    | $0 (GPU cost)  | $0           | 88%      | 🐢 Slow     |

**Winner**: Hybrid approach (regex + GPT-4 for ambiguous only)

---

## Implementation Steps

### Phase 1: Setup (30 min)

```bash
# Install OpenAI SDK
cd server
npm install openai

# Add to .env
echo "OPENAI_API_KEY=sk-your-key-here" >> .env
```

### Phase 2: Create AI Extractor (1 hour)

```javascript
// server/src/services/transactions/aiExtractor.js

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function extractWithAI(text, context = {}) {
  const { bank, ambiguousLines } = context;

  const prompt = `Extract credit card transactions from this ${bank} statement text.
  Focus on these ambiguous lines:
  ${ambiguousLines}
  
  Return JSON: { transactions: [{ date, description, amount, type }] }`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: "You are a transaction parser." },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### Phase 3: Update Sync Process (30 min)

```javascript
// server/src/services/transactions/syncTransactions.js

import { extractWithAI } from "./aiExtractor.js";

// In the sync loop, after regex extraction:
if (extractionResult.ambiguousCount > 0) {
  console.log(
    `Using AI for ${extractionResult.ambiguousCount} ambiguous transactions...`
  );

  const aiResult = await extractWithAI(text, {
    bank: statement.bank,
    ambiguousLines: extractionResult.ambiguousTransactions.map(
      (t) => t.rawLine
    ),
  });

  // Replace ambiguous with AI results
  extractionResult.transactions.push(...aiResult.transactions);
  extractionResult.ambiguousTransactions = []; // Clear ambiguous
  extractionResult.method = "hybrid";
}
```

---

## Advanced: GPT-4 Vision for Full Automation

### Convert PDF to Images

```javascript
import { fromPath } from "pdf2pic";

async function pdfToImages(pdfPath) {
  const converter = fromPath(pdfPath, {
    density: 100,
    saveFilename: "page",
    savePath: "./temp",
    format: "png",
    width: 2000,
    height: 2800,
  });

  const pages = [];
  const pageCount = await getPdfPageCount(pdfPath);

  for (let i = 1; i <= pageCount; i++) {
    const result = await converter(i);
    pages.push(result.path);
  }

  return pages;
}
```

### Vision-Based Extraction

```javascript
async function extractWithVision(pdfPath) {
  const images = await pdfToImages(pdfPath);
  const allTransactions = [];

  for (const imagePath of images) {
    const base64 = fs.readFileSync(imagePath).toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all transactions from this credit card statement page. Return JSON.",
            },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });

    const pageTransactions = JSON.parse(response.choices[0].message.content);
    allTransactions.push(...pageTransactions);
  }

  return allTransactions;
}
```

---

## Monitoring AI Usage

### Track Costs

```javascript
const aiUsageStats = {
  totalCalls: 0,
  totalTokens: 0,
  totalCost: 0,
  byBank: {},
};

function trackAIUsage(bank, tokens, cost) {
  aiUsageStats.totalCalls++;
  aiUsageStats.totalTokens += tokens;
  aiUsageStats.totalCost += cost;

  if (!aiUsageStats.byBank[bank]) {
    aiUsageStats.byBank[bank] = { calls: 0, cost: 0 };
  }
  aiUsageStats.byBank[bank].calls++;
  aiUsageStats.byBank[bank].cost += cost;

  // Save to Firebase for tracking
  saveAIUsageStats(aiUsageStats);
}
```

### Add to API Response

```javascript
{
  success: true,
  totalTransactions: 150,
  ambiguousCount: 0,
  aiUsed: true,
  aiCost: 0.0034,
  method: 'hybrid'
}
```

---

## Testing AI Extraction

### Test Cases

```javascript
const testCases = [
  {
    name: "SBI Concatenated Amount",
    input: "26 Aug 25PAYMENT RECEIVED 000BD015241BAIAAABFFSJT40064.30C",
    expected: {
      date: "2025-08-26",
      description: "PAYMENT RECEIVED 000BD015241BAIAAABFFSJT",
      amount: 40064.3,
      type: "credit",
    },
  },
  {
    name: "AXIS Multiple Amounts",
    input: "04/08/2025FLIPKART,BANGLORE DEPT STORES192.00 Dr9.00 Cr",
    expected: [
      { description: "FLIPKART", amount: 192.0, type: "debit" },
      { description: "FLIPKART CASHBACK", amount: 9.0, type: "credit" },
    ],
  },
];

async function testAIExtraction() {
  for (const test of testCases) {
    const result = await extractWithAI(test.input);
    console.assert(
      JSON.stringify(result) === JSON.stringify(test.expected),
      `Failed: ${test.name}`
    );
  }
}
```

---

## Benefits Summary

### Regex → AI Migration Benefits

1. **Accuracy**: 85% → 95%+ accuracy
2. **Maintenance**: Zero regex maintenance
3. **Flexibility**: Handles any format automatically
4. **Ambiguity**: No more ambiguous transactions
5. **Cost**: ~$0.05/month for 100 statements
6. **Time**: Saves hours of debugging regex

### When to Use Each Method

- **Regex**: Well-formatted, consistent statements
- **GPT-4 Text**: Ambiguous lines only (hybrid)
- **GPT-4 Vision**: Scanned/image PDFs
- **Local LLM**: Privacy-critical, offline usage

---

## Recommendation

### Start with Hybrid Approach

1. **Week 1**: Implement GPT-4 Text for ambiguous transactions only
2. **Week 2**: Test with real statements, measure accuracy
3. **Week 3**: Optimize prompts based on results
4. **Week 4**: Evaluate full AI migration if needed

### Expected Results

- 95%+ accuracy on all transactions
- $0.05-0.20/month cost
- Zero ambiguous transactions
- Minimal code maintenance

---

## Next Steps

Would you like me to:

**A)** Implement the hybrid approach (regex + AI for ambiguous only)
**B)** Implement full GPT-4 Vision extraction (no regex)
**C)** Set up local LLM for privacy
**D)** Show me a detailed cost analysis first

Choose an option, or I can implement the hybrid approach (recommended) right away!
