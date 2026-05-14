/**
 * HTTP Status Codes and responses
 */

export const HTTP_STATUS = {
  OK: 200,
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Format successful API response
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default 200)
 */
export const successResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    message,
    statusCode,
    data,
  };
};

/**
 * Format error API response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default 500)
 * @param {object} errors - Detailed error object
 */
export const errorResponse = (message = 'Error', statusCode = 500, errors = null) => {
  return {
    success: false,
    message,
    statusCode,
    ...(errors && { errors }),
  };
};
