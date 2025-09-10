import express from "express";
import { fetchAndCalculateOutstanding } from "./index.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  res.send(await fetchAndCalculateOutstanding());
});

export function startServer() {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
