import express from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { deleteAllCards, initializeCards } from "../repository/cards.js";
import { deleteAllStatements } from "../repository/statements.js";
import {
  addMultipleTransactions,
  deleteAllTransactions,
} from "../repository/transactions.js";
import { fetchAllStatements } from "../services/creditCards/index.js";
import transactionExtractionRoutes from "./transactions.js";

export function setupRoutes(app, gmail, drive) {
  const router = express.Router();

  // Health check endpoints
  router.get("/", (req, res) => {
    res.json({
      status: "ok",
      message: "Expense Tracker API is running",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  router.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Sync endpoints
  router.get(
    "/sync/statements",
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

  router.get(
    "/sync/cards",
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

  router.get(
    "/sync/transactions",
    asyncHandler(async (req, res) => {
      console.log("Starting transaction synchronization...");
      // Note: Implement fetchAndCalculateOutstanding function
      res.json({
        success: true,
        message: "Transactions synchronization started",
        timestamp: new Date().toISOString(),
      });
    })
  );

  // Transaction endpoints
  router.post(
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

  // Delete endpoints (use with caution!)
  router.delete(
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

  router.delete(
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

  router.delete(
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

  // Mount transaction extraction routes
  app.use("/api/transactions", transactionExtractionRoutes);

  // Mount router
  app.use("/api", router);

  // Legacy routes for backward compatibility
  app.get(
    "/sync-statements",
    router.stack.find((r) => r.route?.path === "/sync/statements").route
      .stack[0].handle
  );
  app.get(
    "/sync-cards",
    router.stack.find((r) => r.route?.path === "/sync/cards").route.stack[0]
      .handle
  );
  app.get(
    "/sync-tnxs",
    router.stack.find((r) => r.route?.path === "/sync/transactions").route
      .stack[0].handle
  );
  app.delete(
    "/delete-statements",
    router.stack.find((r) => r.route?.path === "/statements").route.stack[0]
      .handle
  );
  app.delete(
    "/delete-cards",
    router.stack.find((r) => r.route?.path === "/cards").route.stack[0].handle
  );
  app.delete(
    "/delete-tnxs",
    router.stack.find((r) => r.route?.path === "/transactions").route.stack[0]
      .handle
  );
  app.post(
    "/transactions",
    router.stack.find(
      (r) => r.route?.path === "/transactions" && r.route.methods.post
    ).route.stack[0].handle
  );

  return router;
}
