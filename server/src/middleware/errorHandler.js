/**
 * Custom error classes
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized access") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  const NODE_ENV = process.env.NODE_ENV || "development";

  // Log error
  console.error("Error:", {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode,
    timestamp: err.timestamp || new Date().toISOString(),
    path: req.path,
    method: req.method,
    ...(NODE_ENV === "development" && { stack: err.stack }),
  });

  // Default error values
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Send error response
  res.status(statusCode).json({
    success: false,
    error:
      NODE_ENV === "production" && statusCode === 500
        ? "An error occurred"
        : message,
    timestamp: err.timestamp || new Date().toISOString(),
    ...(NODE_ENV === "development" && {
      stack: err.stack,
      path: req.path,
    }),
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
};
