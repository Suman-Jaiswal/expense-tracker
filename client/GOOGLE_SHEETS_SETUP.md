# Google Sheets Integration Setup

This guide explains how to set up Google Sheets integration to display latest bills on the Credit Cards page.

## 📋 Overview

The application fetches latest bills data from Google Sheets and displays it directly on each credit card in the Credit Cards page.

**Spreadsheet ID:** `1Q6olLQykUoM2trfyu1dTv4fqEVOROCcETYbA8BFc7SM`
**Sheet Name:** `LatestBills`

## 🔑 Setup Instructions

### 1. Get Google Sheets API Key

#### Step 1: Create/Select Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project name for reference

#### Step 2: Enable Google Sheets API

1. Go to **"APIs & Services"** > **"Library"**
2. Search for **"Google Sheets API"**
3. Click on it and click the **"Enable"** button
4. Wait for it to enable (may take a few seconds)

#### Step 3: Create API Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"Create Credentials"** > **"API Key"**
3. Copy the generated API key immediately
4. **Important:** Keep this key secure!

#### Step 4: Configure API Key (Recommended)

1. Click on the API key you just created to edit it
2. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Check only **"Google Sheets API"**
3. Under **"Application restrictions"** (for development):
   - Select **"HTTP referrers (web sites)"**
   - Click **"Add an item"**
   - Add: `http://localhost:3000/*`
   - Add: `http://localhost:*/*` (for other ports)
4. Click **"Save"**

**Note:** For production, update HTTP referrers to your actual domain.

### 2. Make Google Sheet Public (Read-Only)

1. Open your Google Sheet
2. Click "Share" button
3. Under "General access", select "Anyone with the link"
4. Set permission to "Viewer"
5. Click "Done"

### 3. Configure Environment Variable

1. Create or update `.env` file in the `client` directory:

```env
# Google Sheets API Key
REACT_APP_GOOGLE_SHEETS_API_KEY=your_api_key_here

# Other existing variables...
REACT_APP_API_URL=http://localhost:4000
REACT_APP_FIREBASE_API_KEY=...
# ... etc
```

2. Restart the development server:

```bash
npm start
```

## 📊 Data Format

The `LatestBills` sheet should have the following columns:

| Date      | BillAmount | Outstanding | CardID       |
| --------- | ---------- | ----------- | ------------ |
| 12/3/2025 | 6200       | 17129.94    | ICICI_XX9003 |
| 12/2/2025 | 100        | 738.64      | ICICI_XX5000 |
| 12/3/2025 | 433        | 21658       | SBI_XX5965   |
| 12/3/2025 | 520        | 10237       | HDFC_XX9335  |
| 12/3/2025 | 0          | 0           | AXIS_XX2376  |

### Column Descriptions:

- **Date**: Bill generation date (format: M/D/YYYY or MM/DD/YYYY)
- **BillAmount**: The bill amount for the period
- **Outstanding**: Current outstanding balance
- **CardID**: Card identifier matching your card IDs (e.g., ICICI_XX9003)

## 🎨 Features

- **Automatic Sync**: Bills data is fetched when the Credit Cards page loads
- **Manual Refresh**: Click "Sync Bills" button to refresh data
- **Visual Display**: Bills appear as purple gradient cards below each credit card
- **Smart Matching**: Bills are automatically matched to cards by Card ID

## 🔧 Troubleshooting

### ❌ Error 403: "Access forbidden"

This is the most common error. Here's how to fix it:

#### ✅ Solution 1: Enable Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **"APIs & Services"** > **"Library"**
4. Search for **"Google Sheets API"**
5. Click **"Enable"** (if not already enabled)
6. Wait a few minutes for changes to propagate

#### ✅ Solution 2: Make Sheet Publicly Accessible

1. Open your Google Sheet
2. Click the **"Share"** button (top right)
3. Under **"General access"**, click **"Restricted"**
4. Change to **"Anyone with the link"**
5. Set permission to **"Viewer"**
6. Click **"Done"**

#### ✅ Solution 3: Verify API Key Restrictions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **"APIs & Services"** > **"Credentials"**
3. Click on your API key
4. Check **"API restrictions"**:
   - Should be set to **"Restrict key"**
   - **"Google Sheets API"** should be checked
5. Check **"Application restrictions"**:
   - For development: Use **"HTTP referrers"** with `http://localhost:*/*`
   - For production: Add your actual domain
6. Click **"Save"** and wait a few minutes

#### ✅ Solution 4: Verify Spreadsheet ID

Make sure the spreadsheet ID in the code matches your actual sheet:

- Current ID in code: `1Q6olLQykUoM2trfyu1dTv4fqEVOROCcETYbA8BFc7SM`
- Your sheet URL should be: `https://docs.google.com/spreadsheets/d/1Q6olLQykUoM2trfyu1dTv4fqEVOROCcETYbA8BFc7SM/edit`

### "Google Sheets API key not configured"

- Ensure `REACT_APP_GOOGLE_SHEETS_API_KEY` is set in your `.env` file
- The key should be a long string (not a URL)
- Restart the development server after adding the variable: `npm start`

### "Failed to fetch bills" (Other errors)

- Check browser console for specific error message
- Verify the sheet name is exactly **"LatestBills"** (case-sensitive)
- Ensure there's data in the LatestBills sheet
- Check that the first row contains headers

### Bills not showing on cards

- Ensure the **CardID** column in the sheet matches your card IDs exactly
  - Example: `ICICI_XX9003` (must match your Firebase card IDs)
- Check that there's data in the LatestBills sheet
- Click "Sync Bills" button to manually refresh
- Look for errors in the browser console

### API Key Not Working

If you just created the API key:

1. Wait 5-10 minutes for Google's systems to propagate the changes
2. Clear browser cache and reload the page
3. Try a different browser or incognito mode
4. Verify the key was copied correctly (no extra spaces)

### Still Having Issues?

1. **Check Browser Console**: Press F12, go to Console tab
2. **Check Network Tab**: Look for the Google Sheets API request
3. **Verify .env file**: Make sure there are no quotes around the API key
4. **Test the API manually**: Use this URL in your browser (replace YOUR_API_KEY):
   ```
   https://sheets.googleapis.com/v4/spreadsheets/1Q6olLQykUoM2trfyu1dTv4fqEVOROCcETYbA8BFc7SM/values/LatestBills?key=YOUR_API_KEY
   ```
   You should see JSON data, not an error.

## 📝 API Reference

### Service Methods

```javascript
import { fetchLatestBills } from "../services/googleSheets";

// Fetch all bills
const bills = await fetchLatestBills();
```

### Data Structure

```javascript
[
  {
    Date: "12/3/2025",
    BillAmount: "6200",
    Outstanding: "17129.94",
    CardID: "ICICI_XX9003",
  },
  // ...
];
```

## 🚀 Usage

The Latest Bills data will automatically appear on the Credit Cards page:

1. Navigate to "Credit Cards" in the sidebar
2. Bills data will load automatically
3. Each card displays its latest bill information (if available)
4. Click "Sync Bills" to refresh the data

The bill info shows:

- 📋 Bill date
- Bill Amount
- Current Outstanding

## 🔒 Security Notes

- The API key only has access to read data from Google Sheets
- The sheet should be set to "Viewer" access only
- Consider restricting the API key to specific domains in production
- Do not commit the `.env` file to version control
