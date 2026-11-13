import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { AppError } from './errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';

/**
 * Authentication Middleware
 * Verifies JWT token in Authorization header
 * Extracts user data from token and attaches to request
 * 
 * Expected header format: Authorization: Bearer <token>
 */
export const authMiddleware = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError('No token provided', HTTP_STATUS.UNAUTHORIZED);
    }

    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Attach user data to request
    req.user = decoded;
    req.userId = decoded.id || decoded.userId;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token has expired', HTTP_STATUS.UNAUTHORIZED);
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token', HTTP_STATUS.UNAUTHORIZED);
    }
    throw error;
  }
};

/**
 * Optional Authentication Middleware
 * Attempts to verify JWT but doesn't fail if missing
 * Useful for endpoints that work with or without authentication
 */
export const optionalAuthMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = decoded;
      req.userId = decoded.id || decoded.userId;
      req.isAuthenticated = true;
    } else {
      req.isAuthenticated = false;
    }

    next();
  } catch (error) {
    // Ignore token errors, continue as unauthenticated
    req.isAuthenticated = false;
    next();
  }
};

/**
 * Generate JWT Token
 * @param {object} payload - Data to encode in token
 * @param {string} expiresIn - Token expiration (e.g., '7d', '24h')
 * @returns {string} Signed JWT token
 */
export const generateToken = (payload, expiresIn = env.JWT_EXPIRE) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn,
    algorithm: 'HS256',
  });
};

/**
 * Verify JWT Token
 * @param {string} token - Token to verify
 * @returns {object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token has expired', HTTP_STATUS.UNAUTHORIZED);
    }
    throw new AppError('Invalid token', HTTP_STATUS.UNAUTHORIZED);
  }
};

/**
 * Role-Based Authorization Middleware
 * Ensures authenticated user has one of the allowed roles (e.g. 'admin', 'staff')
 * 
 * @param {...string} allowedRoles
 * @returns {Function} Express middleware
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const hasRole = allowedRoles.some((r) => r.toLowerCase() === userRole);

    if (!hasRole) {
      logger.warn(`⛔ Access forbidden: User ${req.user.id || req.user.email} with role '${userRole}' lacks required roles [${allowedRoles.join(', ')}]`);
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Forbidden: Insufficient role permissions for this operation',
        statusCode: HTTP_STATUS.FORBIDDEN,
      });
    }

    next();
  };
};
