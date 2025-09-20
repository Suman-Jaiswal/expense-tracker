import express from "express";
import { google } from "googleapis";
import { authorize } from "./src/auth/index.js";
import { deleteAllCards, initializeCards } from "./src/repository/cards.js";
import { deleteAllStatements } from "./src/repository/statements.js";
import {
  addMultipleTransactions,
  deleteAllTransactions,
} from "./src/repository/transactions.js";
import {
  fetchAndCalculateOutstanding,
  fetchStatement,
} from "./src/services/creditCards/index.js";
const app = express();
const PORT = process.env.PORT || 8000;

async function init() {
  const auth = await authorize();
  const gmail = google.gmail({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });
  return { gmail, drive };
}

export function startServer() {
  // initializeAccounts();
  // initializeCards();
  init()
    .then(({ gmail, drive }) => {
      app.get("/sync-statements", async (req, res) => {
        await fetchStatement(gmail, drive);
        res.send({ message: "Statements synchronized" });
      });

      app.get("/sync-cards", async (req, res) => {
        await initializeCards(gmail);
        res.send({ message: "Cards synchronized" });
      });

      app.get("/sync-tnxs", async (req, res) => {
        await fetchAndCalculateOutstanding(gmail);
        res.send({ message: "Transactions synchronized" });
      });

      app.get("/delete-statements", async (req, res) => {
        await deleteAllStatements();
        res.send({ message: "All statements deleted" });
      });

      app.get("/delete-cards", async (req, res) => {
        await deleteAllCards();
        res.send({ message: "All cards deleted" });
      });

      app.get("/delete-tnxs", async (req, res) => {
        await deleteAllTransactions();
        res.send({ message: "All transactions deleted" });
      });

      app.get("/", async (req, res) => {
        res.send("Hello! The server is running.");
      });

      app.post("/transactions", async (req, res) => {
        const transactions = req.body;
        try {
          await addMultipleTransactions(transactions);
          res.send("Transactions Added");
        } catch (e) {
          res.send("Bad request");
        }
      });

      app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("❌ Failed to init:", err);
    });
}
