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
          const results = await fetchAllStatements(gmail, drive);

          const message =
            results.total === 0
              ? "No new statements found"
              : `${results.total} new statement(s) synchronized successfully`;

          res.json({
            success: true,
            message,
            stats: {
              total: results.total,
              skipped: results.skipped,
              failed: results.failed,
            },
            newStatements: results.newStatements,
            byResource: results.byResource,
            timestamp: new Date().toISOString(),
          });
        })
      );

      app.get(
        "/sync-transactions",
        asyncHandler(async (req, res) => {
          console.log(
            "Starting transaction synchronization from statements..."
          );
          const { syncTransactionsFromStatements } = await import(
            "./src/services/transactions/syncTransactions.js"
          );
          const result = await syncTransactionsFromStatements();
          res.json({
            ...result,
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
      app.get(
        "/transactions/debug",
        asyncHandler(async (req, res) => {
          const { getTransactions } = await import(
            "./src/repository/transactions.js"
          );
          const allTransactions = await getTransactions();

          // Calculate stats
          const totalCount = allTransactions.length;
          const totalAmount = allTransactions.reduce(
            (sum, t) => sum + (parseFloat(t.amount) || 0),
            0
          );
          const byType = allTransactions.reduce((acc, t) => {
            acc[t.type] = (acc[t.type] || 0) + 1;
            return acc;
          }, {});
          const byMonth = allTransactions.reduce((acc, t) => {
            const month = t.date ? t.date.substring(0, 7) : "unknown";
            acc[month] = (acc[month] || 0) + 1;
            return acc;
          }, {});

          // Find top amounts (to identify problem transactions)
          const topAmounts = allTransactions
            .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
            .slice(0, 10)
            .map((t) => ({
              amount: t.amount,
              description: t.description,
              date: t.date,
              type: t.type,
            }));

          res.json({
            success: true,
            summary: {
              totalTransactions: totalCount,
              totalAmount: totalAmount.toFixed(2),
              byType,
              byMonth,
              topAmounts, // NEW: Show top 10 amounts
            },
            sampleTransactions: allTransactions.slice(0, 5),
            timestamp: new Date().toISOString(),
          });
        })
      );

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

      // Add manual transaction from review
      app.post(
        "/transactions/manual",
        asyncHandler(async (req, res) => {
          const {
            resourceIdentifier,
            statementId,
            date,
            description,
            amount,
            type,
            category,
            merchant,
          } = req.body;

          // Validate required fields
          if (
            !resourceIdentifier ||
            !statementId ||
            !date ||
            !description ||
            !amount ||
            !type
          ) {
            return res.status(400).json({
              success: false,
              error: "Missing required fields",
              timestamp: new Date().toISOString(),
            });
          }

          // Generate deterministic ID
          const crypto = await import("crypto");
          const idData = `${resourceIdentifier}|${date}|${description}|${amount}|${type}`;
          const id = `txn_${crypto.default
            .createHash("md5")
            .update(idData)
            .digest("hex")
            .substring(0, 16)}`;

          const transaction = {
            id,
            resourceIdentifier,
            statementId,
            date,
            description,
            merchant: merchant || description,
            amount: parseFloat(amount),
            type,
            category: category || "Other",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await addMultipleTransactions([transaction]);

          res.status(201).json({
            success: true,
            message: "Transaction added successfully",
            transaction,
            timestamp: new Date().toISOString(),
          });
        })
      );

      // Update existing transaction
      app.patch(
        "/transactions/:id",
        asyncHandler(async (req, res) => {
          const { id } = req.params;
          const updates = req.body;

          // Import Firebase functions
          const { doc, updateDoc } = await import("firebase/firestore");
          const { db } = await import("./firebase.js");

          const transactionRef = doc(db, "transactions", id);

          // Prepare update data
          const updateData = {
            ...updates,
            updatedAt: new Date().toISOString(),
          };

          await updateDoc(transactionRef, updateData);

          res.json({
            success: true,
            message: "Transaction updated successfully",
            timestamp: new Date().toISOString(),
          });
        })
      );

      console.log("✅ Registering /transactions/test route...");
      // Test route
      app.get("/transactions/test", (req, res) => {
        res.json({ success: true, message: "Test route works!" });
      });

      console.log("✅ Registering /transactions/ambiguous route...");
      // Get ambiguous transactions
      app.get(
        "/transactions/ambiguous",
        asyncHandler(async (req, res) => {
          const { collection, getDocs, query, where } = await import(
            "firebase/firestore"
          );
          const { db } = await import("./firebase.js");

          const transactionsRef = collection(db, "transactions");
          const q = query(transactionsRef, where("isAmbiguous", "==", true));
          const snapshot = await getDocs(q);

          const ambiguousTransactions = [];
          snapshot.forEach((doc) => {
            ambiguousTransactions.push({
              id: doc.id,
              ...doc.data(),
            });
          });

          res.json({
            success: true,
            count: ambiguousTransactions.length,
            transactions: ambiguousTransactions,
            timestamp: new Date().toISOString(),
          });
        })
      );

      // Check for new statements
      app.get(
        "/statements/check-new",
        asyncHandler(async (req, res) => {
          const { collection, getDocs, query, orderBy, limit } = await import(
            "firebase/firestore"
          );
          const { db } = await import("./firebase.js");

          // Get the most recent statement date
          const statementsRef = collection(db, "statements");
          const q = query(
            statementsRef,
            orderBy("period.end", "desc"),
            limit(1)
          );
          const snapshot = await getDocs(q);

          let lastStatementDate = null;
          if (!snapshot.empty) {
            const lastStatement = snapshot.docs[0].data();
            lastStatementDate = lastStatement.period.end;
          }

          // Calculate if we're likely to have new statements
          const daysSinceLastStatement = lastStatementDate
            ? Math.floor(
                (new Date() - new Date(lastStatementDate)) /
                  (1000 * 60 * 60 * 24)
              )
            : 999;

          // Statements typically come monthly (25-30 days)
          const hasNewStatements = daysSinceLastStatement >= 25;

          res.json({
            success: true,
            hasNewStatements,
            lastStatementDate,
            daysSinceLastStatement,
            message: hasNewStatements
              ? "New statements may be available"
              : `Last statement was ${daysSinceLastStatement} days ago`,
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
╔══════════════════════════════════════════════╗
║   💰 EXPENSE TRACKER API SERVER              ║
║                                              ║
║   🚀 Server running on port ${PORT}             ║
║   🌍 Environment: ${NODE_ENV.padEnd(27)}║
║   📅 Started: ${new Date().toISOString().substring(0, 19)}            ║
╚══════════════════════════════════════════════╝
        `);
      });
    })
    .catch((err) => {
      console.error("❌ Failed to initialize server:", err);
      process.exit(1);
    });
}
