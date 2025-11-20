import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";

/**
 * Aggregate transaction data for dashboard analytics
 */

// Helper function to safely parse dates
const isValidDate = (date) => {
  if (!date) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
};

export const calculateTotalSpending = (transactions, startDate, endDate) => {
  if (!transactions || !Array.isArray(transactions)) return 0;

  return transactions
    .filter((tx) => {
      if (!isValidDate(tx.date)) return false;
      const txDate = new Date(tx.date);
      return txDate >= startDate && txDate <= endDate && tx.type === "debit";
    })
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
};

export const calculateTotalIncome = (transactions, startDate, endDate) => {
  if (!transactions || !Array.isArray(transactions)) return 0;

  return transactions
    .filter((tx) => {
      if (!isValidDate(tx.date)) return false;
      const txDate = new Date(tx.date);
      return txDate >= startDate && txDate <= endDate && tx.type === "credit";
    })
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
};

export const getMonthlyTrends = (transactions, months = 6) => {
  if (!transactions || !Array.isArray(transactions)) return [];

  const monthsData = [];
  const today = new Date();
  let cumulativeSpending = 0;
  let cumulativeIncome = 0;

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(today, i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const spending = calculateTotalSpending(transactions, monthStart, monthEnd);
    const income = calculateTotalIncome(transactions, monthStart, monthEnd);

    // Add to cumulative totals
    cumulativeSpending += spending;
    cumulativeIncome += income;

    monthsData.push({
      month: format(monthDate, "MMM"),
      fullDate: format(monthDate, "MMM yyyy"),
      spending: cumulativeSpending,
      income: cumulativeIncome,
      net: cumulativeIncome - cumulativeSpending,
    });
  }

  return monthsData;
};

export const getCategoryBreakdown = (transactions) => {
  if (!transactions || !Array.isArray(transactions)) return [];

  const categories = {};

  transactions
    .filter((tx) => tx.type === "debit")
    .forEach((tx) => {
      const category = tx.category || "Uncategorized";
      categories[category] =
        (categories[category] || 0) + parseFloat(tx.amount || 0);
    });

  return Object.entries(categories)
    .map(([name, value]) => ({
      name,
      value: Math.round(value),
    }))
    .sort((a, b) => b.value - a.value);
};

export const getCardWiseSpending = (resources) => {
  if (!resources || !resources.cards) return [];

  return resources.cards
    .map((card) => ({
      name: card.id,
      spending: parseFloat(card.outstanding || 0),
      limit: parseFloat(card.creditLimit || 0),
      utilization: (
        (parseFloat(card.outstanding || 0) /
          parseFloat(card.creditLimit || 1)) *
        100
      ).toFixed(1),
    }))
    .sort((a, b) => b.spending - a.spending);
};

export const getTopMerchants = (transactions, limit = 5) => {
  if (!transactions || !Array.isArray(transactions)) return [];

  const merchants = {};

  transactions
    .filter((tx) => tx.type === "debit" && tx.merchant)
    .forEach((tx) => {
      const merchant = tx.merchant;
      if (!merchants[merchant]) {
        merchants[merchant] = { count: 0, total: 0 };
      }
      merchants[merchant].count++;
      merchants[merchant].total += parseFloat(tx.amount || 0);
    });

  return Object.entries(merchants)
    .map(([name, data]) => ({
      name,
      count: data.count,
      total: Math.round(data.total),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
};

export const getRecentTransactions = (transactions, limit = 5) => {
  if (!transactions || !Array.isArray(transactions)) return [];

  return [...transactions]
    .filter((tx) => isValidDate(tx.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
};

export const formatCurrency = (amount, currency = "₹") => {
  return `${currency}${Math.abs(amount).toLocaleString("en-IN")}`;
};

export const getCurrentMonthStats = (transactions) => {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const spending = calculateTotalSpending(transactions, monthStart, monthEnd);
  const income = calculateTotalIncome(transactions, monthStart, monthEnd);
  const transactionCount = transactions.filter((tx) => {
    if (!isValidDate(tx.date)) return false;
    const txDate = new Date(tx.date);
    return txDate >= monthStart && txDate <= monthEnd;
  }).length;

  const avgTransaction = transactionCount > 0 ? spending / transactionCount : 0;

  return {
    spending,
    income,
    net: income - spending,
    transactionCount,
    avgTransaction,
    month: format(today, "MMMM yyyy"),
  };
};
