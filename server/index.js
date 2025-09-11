// import { startServer } from "./server.js";
// startServer();

import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Decrypt a PDF file using qpdf CLI
 * @param {string} inputPath - Path to encrypted PDF
 * @param {string} outputPath - Path to save decrypted PDF
 * @param {string} password - PDF password
 */
export async function decryptPdfFile(inputPath, outputPath, password) {
  try {
    const { stderr } = await execFileAsync("qpdf", [
      `--password=${password}`,
      "--decrypt",
      inputPath,
      outputPath,
    ]);

    if (stderr && stderr.includes("WARNING")) {
      console.warn("⚠️ qpdf warning:", stderr.trim());
    }

    console.log(`✅ Decrypted PDF saved to ${outputPath}`);
  } catch (err) {
    console.error("❌ qpdf failed:", err.message);
  }
}

(async () => {
  const input = path.join(process.cwd(), "src/utils/pdf.pdf");
  const output = path.join(process.cwd(), "src/utils/decrypted.pdf");

  await decryptPdfFile(input, output, "suma0709"); // replace with real password
})();
