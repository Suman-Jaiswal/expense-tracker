import { format } from "date-fns";

/**
 * Export data utilities for transactions
 */

export const exportToCSV = (data, filename = "transactions") => {
  if (!data || data.length === 0) {
    return false;
  }

  // Define CSV headers
  const headers = [
    "Date",
    "Description",
    "Amount",
    "Type",
    "Category",
    "Merchant",
    "Resource",
  ];

  // Convert data to CSV rows
  const csvRows = [
    headers.join(","),
    ...data.map((transaction) => {
      return [
        transaction.date || "",
        `"${(transaction.description || "").replace(/"/g, '""')}"`, // Escape quotes
        transaction.amount || 0,
        transaction.type || "",
        transaction.category || "",
        `"${(transaction.merchant || "").replace(/"/g, '""')}"`,
        transaction.resourceIdentifier || "",
      ].join(",");
    }),
  ];

  // Create blob and download
  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }

  return false;
};

export const exportToJSON = (data, filename = "transactions") => {
  if (!data || data.length === 0) {
    return false;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${filename}_${format(new Date(), "yyyy-MM-dd")}.json`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }

  return false;
};

export const copyToClipboard = async (data) => {
  try {
    const text = JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    return false;
  }
};
