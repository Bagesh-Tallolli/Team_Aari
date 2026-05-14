import { HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';

/**
 * Custom Application Error Class
 * Extends Error with HTTP status code and message
 */
export class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_ERROR) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error handler wrapper
 * Wraps async controller functions to catch errors automatically
 * 
 * Usage: router.post('/path', asyncHandler(controllerFunction))
 * 
 * @param {Function} fn - Async controller function
 * @returns {Function} Express middleware
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global Error Handler Middleware
 * Must be the LAST middleware in the app
 * 
 * Catches all errors and formats response
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_ERROR;
  const message = err.message || 'Internal Server Error';

  // Log error details to console
  logger.error(`Error: ${message}`, {
    statusCode,
    method: req.method,
    path: req.path,
    stack: err.stack,
  });

  // Validation error from Joi
  if (err.details) {
    const validationErrors = err.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Validation Error',
      statusCode: HTTP_STATUS.BAD_REQUEST,
      errors: validationErrors,
    });
  }

  // Database error
  if (err.code === 'ER_DUP_ENTRY' || err.code === '23505') {
    return res.status(HTTP_STATUS.CONFLICT).json({
      success: false,
      message: 'Resource already exists',
      statusCode: HTTP_STATUS.CONFLICT,
    });
  }

  // Format response
  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 Not Found handler
 * Should be used after all route definitions
 */
export const notFoundHandler = (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    statusCode: HTTP_STATUS.NOT_FOUND,
  });
};
