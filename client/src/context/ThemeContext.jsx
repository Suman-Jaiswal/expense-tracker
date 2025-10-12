import { ConfigProvider, theme as antdTheme } from "antd";
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Check for saved theme preference or default to light
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }
    // Optional: Check system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    // Save theme preference
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");

    // Update body class for additional styling if needed
    document.body.className = isDarkMode ? "dark-mode" : "light-mode";
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const themeConfig = {
    algorithm: isDarkMode
      ? antdTheme.darkAlgorithm
      : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: "#6366f1", // Modern indigo
      borderRadius: 12,
      ...(isDarkMode
        ? {
            // Warmer, richer dark theme
            colorBgContainer: "#1e293b", // Slate-800
            colorBgElevated: "#334155", // Slate-700
            colorBgLayout: "#0f172a", // Slate-900
            colorText: "#f1f5f9", // Slate-100
            colorTextSecondary: "#94a3b8", // Slate-400
            colorBorder: "#475569", // Slate-600
            colorSuccess: "#10b981", // Emerald-500
            colorError: "#ef4444", // Red-500
            colorWarning: "#f59e0b", // Amber-500
            colorInfo: "#3b82f6", // Blue-500
          }
        : {
            // Light theme with softer colors
            colorBgContainer: "#ffffff",
            colorBgLayout: "#f8fafc", // Slate-50
            colorText: "#1e293b", // Slate-800
            colorTextSecondary: "#64748b", // Slate-500
            colorBorder: "#e2e8f0", // Slate-200
            colorSuccess: "#10b981",
            colorError: "#ef4444",
            colorWarning: "#f59e0b",
            colorInfo: "#3b82f6",
          }),
    },
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <ConfigProvider theme={themeConfig}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  );
};
