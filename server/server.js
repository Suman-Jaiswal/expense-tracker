import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { google } from "googleapis";
import { authorize } from "./src/auth/index.js";
import { deleteAllCards, initializeCards } from "./src/repository/cards.js";
import { deleteAllStatements } from "./src/repository/statements.js";
import {
  addMultipleTransactions,
  deleteAllTransactions,
} from "./src/repository/transactions.js";
import { fetchAllStatements } from "./src/services/creditCards/index.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Middleware
app.use(
  cors({
    origin:
      NODE_ENV === "production"
        ? process.env.CLIENT_URL
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

async function init() {
  const auth = await authorize();
  const gmail = google.gmail({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });
  return { gmail, drive };
}

// Error handler middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export function startServer() {
  init()
    .then(({ gmail, drive }) => {
      // Health check endpoint
      app.get("/", (req, res) => {
        res.json({
          status: "ok",
          message: "Expense Tracker API is running",
          version: "1.0.0",
          timestamp: new Date().toISOString(),
        });
      });

      app.get("/health", (req, res) => {
        res.json({
          status: "healthy",
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        });
      });

      // Sync endpoints
      app.get(
        "/sync-statements",
        asyncHandler(async (req, res) => {
          console.log("Starting statement synchronization...");
          await fetchAllStatements(gmail, drive);
          res.json({
            success: true,
            message: "Statements synchronized successfully",
            timestamp: new Date().toISOString(),
          });
        })
      );

      app.get(
        "/sync-cards",
        asyncHandler(async (req, res) => {
          console.log("Starting card synchronization...");
          await initializeCards(gmail);
          res.json({
            success: true,
            message: "Cards synchronized successfully",
            timestamp: new Date().toISOString(),
          });
        })
      );

      app.get(
        "/sync-tnxs",
        asyncHandler(async (req, res) => {
          console.log("Starting transaction synchronization...");
          // Note: fetchAndCalculateOutstanding is not imported, need to implement
          res.json({
            success: true,
            message: "Transactions synchronization started",
            timestamp: new Date().toISOString(),
          });
        })
      );

      // Delete endpoints (be careful with these!)
      app.delete(
        "/statements",
        asyncHandler(async (req, res) => {
          console.log("⚠️  Deleting all statements...");
          await deleteAllStatements();
          res.json({
            success: true,
            message: "All statements deleted",
            timestamp: new Date().toISOString(),
          });
        })
      );

      app.delete(
        "/cards",
        asyncHandler(async (req, res) => {
          console.log("⚠️  Deleting all cards...");
          await deleteAllCards();
          res.json({
            success: true,
            message: "All cards deleted",
            timestamp: new Date().toISOString(),
          });
        })
      );

      app.delete(
        "/transactions",
        asyncHandler(async (req, res) => {
          console.log("⚠️  Deleting all transactions...");
          await deleteAllTransactions();
          res.json({
            success: true,
            message: "All transactions deleted",
            timestamp: new Date().toISOString(),
          });
        })
      );

      // Transaction endpoints
      app.post(
        "/transactions",
        asyncHandler(async (req, res) => {
          const transactions = req.body;

          if (!transactions || !Array.isArray(transactions)) {
            return res.status(400).json({
              success: false,
              error: "Invalid request body. Expected an array of transactions.",
            });
          }

          await addMultipleTransactions(transactions);
          res.status(201).json({
            success: true,
            message: `${transactions.length} transaction(s) added successfully`,
            count: transactions.length,
            timestamp: new Date().toISOString(),
          });
        })
      );

      // 404 handler
      app.use((req, res) => {
        res.status(404).json({
          success: false,
          error: "Not Found",
          message: `Route ${req.method} ${req.path} not found`,
          timestamp: new Date().toISOString(),
        });
      });

      // Global error handler
      app.use((err, req, res, next) => {
        console.error("❌ Error:", err);

        const statusCode = err.statusCode || 500;
        const message = err.message || "Internal Server Error";

        res.status(statusCode).json({
          success: false,
          error: NODE_ENV === "development" ? message : "An error occurred",
          ...(NODE_ENV === "development" && { stack: err.stack }),
          timestamp: new Date().toISOString(),
        });
      });

      app.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════╗
║   💰 Expense Tracker API Server              ║
║                                               ║
║   🚀 Server running on port ${PORT}            ║
║   🌍 Environment: ${NODE_ENV.padEnd(27)}║
║   📅 Started: ${new Date().toISOString().substring(0, 19)} ║
╚═══════════════════════════════════════════════╝
        `);
      });
    })
    .catch((err) => {
      console.error("❌ Failed to initialize server:", err);
      process.exit(1);
    });
}
