import express from "express";
import { google } from "googleapis";
import { authorize } from "./src/auth/index.js";
import { deleteAllCards } from "./src/repository/cards.js";
import {
  fetchAndCalculateOutstanding,
  fetchStatement,
} from "./src/services/creditCards/index.js";
const app = express();
const PORT = process.env.PORT || 4000;

async function init() {
  const auth = await authorize();
  return google.gmail({ version: "v1", auth });
}

export function startServer() {
  // initializeAccounts();
  // initializeCards();
  init()
    .then((gmail) => {
      app.get("/statement", async (req, res) => {
        res.send(await fetchStatement(gmail));
      });

      app.get("/", async (req, res) =>
        res.send(await fetchAndCalculateOutstanding(gmail))
      );

      app.get("/delete-cards", async (req, res) => {
        await deleteAllCards();
        res.send({ message: "All cards deleted" });
      });

      app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("❌ Failed to init:", err);
      process.exit(1);
    });
}
