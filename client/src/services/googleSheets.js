/**
 * Google Sheets API Service
 * Client-side data fetching from Google Sheets
 */

const SPREADSHEET_ID = "1Q6olLQykUoM2trfyu1dTv4fqEVOROCcETYbA8BFc7SM";
const SHEET_NAME = "LatestBills";
const API_KEY = process.env.REACT_APP_GOOGLE_SHEETS_API_KEY;

/**
 * Fetch data from Google Sheets
 * @param {string} range - The range to fetch (default: full sheet)
 * @returns {Promise<Array>} - Array of rows
 */
export const fetchSheetData = async (range = SHEET_NAME) => {
  if (!API_KEY) {
    throw new Error(
      "Google Sheets API key not found. Please add REACT_APP_GOOGLE_SHEETS_API_KEY to your .env file."
    );
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Google Sheets API Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        url: url.replace(API_KEY, "***API_KEY***"), // Hide API key in logs
      });

      if (response.status === 403) {
        throw new Error(
          `Access forbidden (403). Please check:\n` +
            `1. Google Sheets API is enabled in Google Cloud Console\n` +
            `2. The spreadsheet is publicly accessible (Anyone with link can view)\n` +
            `3. Your API key is valid and has correct permissions\n` +
            `4. API key restrictions allow access to Google Sheets API`
        );
      }

      throw new Error(
        `HTTP error! status: ${response.status} - ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error("Error fetching Google Sheets data:", error);
    throw error;
  }
};

/**
 * Fetch and parse data with headers
 * @param {string} range - The range to fetch
 * @returns {Promise<Array<Object>>} - Array of objects with header keys
 */
export const fetchSheetDataWithHeaders = async (range = SHEET_NAME) => {
  try {
    const rows = await fetchSheetData(range);

    if (!rows || rows.length === 0) {
      return [];
    }

    // First row is headers
    const headers = rows[0];
    const data = [];

    // Convert remaining rows to objects
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const obj = {};

      headers.forEach((header, index) => {
        obj[header] = row[index] || "";
      });

      data.push(obj);
    }

    return data;
  } catch (error) {
    console.error("Error parsing sheet data:", error);
    throw error;
  }
};

/**
 * Fetch latest bills from the LatestBills sheet
 * @returns {Promise<Array<Object>>} - Array of bill objects
 */
export const fetchLatestBills = async () => {
  try {
    console.log("Fetching latest bills from Google Sheets...");
    const data = await fetchSheetDataWithHeaders(SHEET_NAME);
    console.log(`✅ Fetched ${data.length} bills`);
    return data;
  } catch (error) {
    console.error("Error fetching latest bills:", error);
    throw error;
  }
};

/**
 * Get spreadsheet metadata
 * @returns {Promise<Object>} - Spreadsheet metadata
 */
export const getSpreadsheetMetadata = async () => {
  if (!API_KEY) {
    throw new Error("Google Sheets API key not found.");
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      title: data.properties.title,
      sheets: data.sheets.map((sheet) => ({
        title: sheet.properties.title,
        sheetId: sheet.properties.sheetId,
        index: sheet.properties.index,
        rowCount: sheet.properties.gridProperties?.rowCount,
        columnCount: sheet.properties.gridProperties?.columnCount,
      })),
    };
  } catch (error) {
    console.error("Error fetching spreadsheet metadata:", error);
    throw error;
  }
};
