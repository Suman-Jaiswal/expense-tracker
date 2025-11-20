export const getTotalSpendCurve = (statements) => {
  // Calculate cumulative total spend across all cards combined
  const monthlyData = {};

  statements.forEach((stmt) => {
    if (!stmt.totalSpend) return;

    // Extract month from period.start
    const date =
      stmt.period?.start ||
      stmt.startDate ||
      stmt.statementDate ||
      stmt.createdAt;
    if (!date) return;

    // Parse date (format: YYYY-MM-DD or DD/MM/YYYY)
    let month;
    if (date.includes("/")) {
      const parts = date.split("/");
      month = `${parts[2]}-${parts[1]}`; // YYYY-MM
    } else {
      month = date.substring(0, 7); // YYYY-MM
    }

    if (!monthlyData[month]) {
      monthlyData[month] = 0;
    }

    monthlyData[month] += stmt.totalSpend || 0;
  });

  // Convert to array format with cumulative totals
  const sortedMonths = Object.keys(monthlyData).sort();
  let cumulativeTotal = 0;

  const result = sortedMonths.map((month) => {
    cumulativeTotal += monthlyData[month];
    return {
      month: formatMonth(month),
      totalSpend: cumulativeTotal,
    };
  });

  return result;
};

export const getMonthlySpendByCardNonCumulative = (statements) => {
  // Group statements by month and card WITHOUT cumulative totals
  const monthlyData = {};

  statements.forEach((stmt) => {
    if (!stmt.totalSpend || !stmt.resourceIdentifier) return;

    // Extract month from period.start
    const date =
      stmt.period?.start ||
      stmt.startDate ||
      stmt.statementDate ||
      stmt.createdAt;
    if (!date) return;

    // Parse date (format: YYYY-MM-DD or DD/MM/YYYY)
    let month;
    if (date.includes("/")) {
      const parts = date.split("/");
      month = `${parts[2]}-${parts[1]}`; // YYYY-MM
    } else {
      month = date.substring(0, 7); // YYYY-MM
    }

    if (!monthlyData[month]) {
      monthlyData[month] = {};
    }

    const cardName = getCardDisplayName(stmt.resourceIdentifier);

    if (!monthlyData[month][cardName]) {
      monthlyData[month][cardName] = 0;
    }

    monthlyData[month][cardName] += stmt.totalSpend || 0;
  });

  // Get all unique cards
  const allCards = new Set();
  Object.values(monthlyData).forEach((monthData) => {
    Object.keys(monthData).forEach((card) => allCards.add(card));
  });

  // Convert to array format for Recharts (monthly, NOT cumulative)
  const sortedMonths = Object.keys(monthlyData).sort();

  const result = sortedMonths.map((month) => {
    const monthData = { month: formatMonth(month) };

    // Just use the monthly values, no cumulative calculation
    allCards.forEach((card) => {
      monthData[card] = monthlyData[month][card] || 0;
    });

    return monthData;
  });

  return result;
};

export const getMonthlySpendByCard = (statements) => {
  // Group statements by month and card
  const monthlyData = {};

  statements.forEach((stmt) => {
    if (!stmt.totalSpend || !stmt.resourceIdentifier) return;

    // Extract month from period.start
    const date =
      stmt.period?.start ||
      stmt.startDate ||
      stmt.statementDate ||
      stmt.createdAt;
    if (!date) return;

    // Parse date (format: YYYY-MM-DD or DD/MM/YYYY)
    let month;
    if (date.includes("/")) {
      const parts = date.split("/");
      month = `${parts[2]}-${parts[1]}`; // YYYY-MM
    } else {
      month = date.substring(0, 7); // YYYY-MM
    }

    if (!monthlyData[month]) {
      monthlyData[month] = {};
    }

    const cardName = getCardDisplayName(stmt.resourceIdentifier);

    if (!monthlyData[month][cardName]) {
      monthlyData[month][cardName] = 0;
    }

    monthlyData[month][cardName] += stmt.totalSpend || 0;
  });

  // Get all unique cards
  const allCards = new Set();
  Object.values(monthlyData).forEach((monthData) => {
    Object.keys(monthData).forEach((card) => allCards.add(card));
  });

  // Convert to array format for Recharts with cumulative totals
  const sortedMonths = Object.keys(monthlyData).sort();
  const cumulativeTotals = {};

  // Initialize cumulative totals for each card
  allCards.forEach((card) => {
    cumulativeTotals[card] = 0;
  });

  const result = sortedMonths.map((month) => {
    const monthData = { month: formatMonth(month) };

    // Update cumulative totals
    allCards.forEach((card) => {
      cumulativeTotals[card] += monthlyData[month][card] || 0;
      monthData[card] = cumulativeTotals[card];
    });

    return monthData;
  });

  return result;
};

export const getTotalSpendByCard = (statements) => {
  const cardSpend = {};

  statements.forEach((stmt) => {
    if (!stmt.totalSpend || !stmt.resourceIdentifier) return;

    const cardName = getCardDisplayName(stmt.resourceIdentifier);

    if (!cardSpend[cardName]) {
      cardSpend[cardName] = 0;
    }

    cardSpend[cardName] += stmt.totalSpend || 0;
  });

  return Object.keys(cardSpend).map((card) => ({
    name: card,
    value: cardSpend[card],
  }));
};

export const getUpcomingDues = (statements) => {
  const today = new Date();
  const upcomingDues = [];

  statements.forEach((stmt) => {
    if (!stmt.dueAmount || !stmt.dueDate) return;

    // Parse due date
    let dueDate;
    if (stmt.dueDate.includes("/")) {
      const parts = stmt.dueDate.split("/");
      dueDate = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
    } else {
      dueDate = new Date(stmt.dueDate);
    }

    if (dueDate >= today) {
      upcomingDues.push({
        card: getCardDisplayName(stmt.resourceIdentifier),
        dueDate: stmt.dueDate,
        dueAmount: stmt.dueAmount,
        daysRemaining: Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)),
      });
    }
  });

  return upcomingDues.sort((a, b) => a.daysRemaining - b.daysRemaining);
};

const getCardDisplayName = (resourceIdentifier) => {
  if (!resourceIdentifier) return "Unknown";

  // Extract card name from resourceIdentifier
  // Format: card_BANK_XXNNNN or similar
  const parts = resourceIdentifier.replace("card_", "").split("_");
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return resourceIdentifier;
};

const formatMonth = (monthStr) => {
  // Convert YYYY-MM to "Mon YYYY"
  const [year, month] = monthStr.split("-");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
};
