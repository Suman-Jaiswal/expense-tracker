import express from "express";
import fs from "fs";
import multer from "multer";
import {
  extractTransactionsFromPDF,
  extractTransactionsFromText,
  formatTransactionsForDB,
} from "../services/transactions/transactionExtractor.js";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: "/tmp/uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

/**
 * POST /api/transactions/extract
 * Extract transactions from uploaded PDF statement
 *
 * Body:
 * - file: PDF file (required)
 * - password: PDF password (optional)
 * - cardId: Credit card identifier (optional)
 * - statementId: Statement identifier (optional)
 */
router.post("/extract", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const { password, cardId, statementId } = req.body;
    const filePath = req.file.path;

    console.log("📤 Processing uploaded file:", req.file.originalname);

    // Extract transactions
    const result = await extractTransactionsFromPDF(filePath, password || null);

    // Format for database if cardId provided
    if (cardId) {
      result.formattedTransactions = formatTransactionsForDB(
        result.transactions,
        cardId,
        statementId || null
      );
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Clean up file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    console.error("❌ Error extracting transactions:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/transactions/extract-text
 * Extract transactions from plain text
 *
 * Body:
 * - text: Statement text (required)
 * - cardId: Credit card identifier (optional)
 * - statementId: Statement identifier (optional)
 */
router.post("/extract-text", async (req, res) => {
  try {
    const { text, cardId, statementId } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: "No text provided",
      });
    }

    // Extract transactions
    const result = extractTransactionsFromText(text);

    // Format for database if cardId provided
    if (cardId) {
      result.formattedTransactions = formatTransactionsForDB(
        result.transactions,
        cardId,
        statementId || null
      );
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error extracting transactions:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/transactions/extract-local
 * Extract transactions from local PDF file (for testing)
 *
 * Body:
 * - filePath: Path to PDF file (required)
 * - password: PDF password (optional)
 * - cardId: Credit card identifier (optional)
 * - statementId: Statement identifier (optional)
 */
router.post("/extract-local", async (req, res) => {
  try {
    const { filePath, password, cardId, statementId } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "No file path provided",
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "File not found",
      });
    }

    // Extract transactions
    const result = await extractTransactionsFromPDF(filePath, password || null);

    // Format for database if cardId provided
    if (cardId) {
      result.formattedTransactions = formatTransactionsForDB(
        result.transactions,
        cardId,
        statementId || null
      );
    }

    res.json({
      success: false,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error extracting transactions:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
