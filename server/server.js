import express from "express";
import { google } from "googleapis";
import { authorize } from "./src/auth/index.js";
import { fetchStatement } from "./src/services/creditCards/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

async function init() {
  const auth = await authorize();
  const gmail = google.gmail({ version: "v1", auth });
  app.get("/statement", async (req, res) => {
    res.send(await fetchStatement(gmail));
  });
  app.get("/", (req, res) => {
    res.send("OK");
  });
}

export function startServer() {
  init();
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
