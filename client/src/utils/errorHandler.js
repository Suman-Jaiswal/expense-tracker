/**
 * Centralized error handling utilities
 */

export class APIError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
  }
}

export const handleAPIError = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error("API Error Response:", error.response);
    return new APIError(
      error.response.data?.message || "An error occurred",
      error.response.status,
      error.response.data
    );
  } else if (error.request) {
    // The request was made but no response was received
    console.error("API No Response:", error.request);
    return new APIError("No response from server", 503);
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error("API Error:", error.message);
    return new APIError(error.message, 500);
  }
};

export const showErrorNotification = (message, description = null) => {
  // This can be integrated with Ant Design notification component
  console.error("Error:", message, description);
  // Example: notification.error({ message, description });
};

export const logError = (error, context = {}) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context,
  };

  console.error("Error Log:", errorInfo);

  // In production, send to error tracking service (e.g., Sentry)
  if (process.env.NODE_ENV === "production") {
    // Example: Sentry.captureException(error, { extra: context });
  }
};
