/**
 * Category icons and colors mapping
 */

export const getCategoryIcon = (category) => {
  const lowerCategory = category?.toLowerCase() || "";

  if (
    lowerCategory.includes("food") ||
    lowerCategory.includes("dining") ||
    lowerCategory.includes("restaurant")
  ) {
    return "🍔";
  }
  if (
    lowerCategory.includes("transport") ||
    lowerCategory.includes("uber") ||
    lowerCategory.includes("taxi")
  ) {
    return "🚗";
  }
  if (lowerCategory.includes("shopping") || lowerCategory.includes("retail")) {
    return "🛒";
  }
  if (
    lowerCategory.includes("healthcare") ||
    lowerCategory.includes("medical") ||
    lowerCategory.includes("pharmacy")
  ) {
    return "💊";
  }
  if (
    lowerCategory.includes("entertainment") ||
    lowerCategory.includes("movie") ||
    lowerCategory.includes("netflix")
  ) {
    return "🎬";
  }
  if (
    lowerCategory.includes("utilities") ||
    lowerCategory.includes("electricity") ||
    lowerCategory.includes("water")
  ) {
    return "💡";
  }
  if (lowerCategory.includes("housing") || lowerCategory.includes("rent")) {
    return "🏠";
  }
  if (
    lowerCategory.includes("education") ||
    lowerCategory.includes("course") ||
    lowerCategory.includes("book")
  ) {
    return "📚";
  }
  if (
    lowerCategory.includes("travel") ||
    lowerCategory.includes("flight") ||
    lowerCategory.includes("hotel")
  ) {
    return "✈️";
  }
  if (
    lowerCategory.includes("subscription") ||
    lowerCategory.includes("membership")
  ) {
    return "📱";
  }
  if (
    lowerCategory.includes("fuel") ||
    lowerCategory.includes("petrol") ||
    lowerCategory.includes("gas")
  ) {
    return "⛽";
  }
  if (
    lowerCategory.includes("grocery") ||
    lowerCategory.includes("supermarket")
  ) {
    return "🥗";
  }

  return "📦"; // Default icon
};

export const getCategoryColor = (category) => {
  const lowerCategory = category?.toLowerCase() || "";

  const colorMap = {
    food: "#ff6b6b",
    transport: "#4ecdc4",
    shopping: "#95e1d3",
    healthcare: "#f38181",
    entertainment: "#aa96da",
    utilities: "#fcbad3",
    housing: "#ffd93d",
    education: "#6c5ce7",
    travel: "#00b894",
    subscription: "#0984e3",
    fuel: "#fd79a8",
    grocery: "#55efc4",
  };

  for (const [key, color] of Object.entries(colorMap)) {
    if (lowerCategory.includes(key)) {
      return color;
    }
  }

  return "#1890ff"; // Default color
};

export const formatCategoryTag = (category) => {
  if (!category) return "Uncategorized";

  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
