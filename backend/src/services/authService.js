import bcrypt from 'bcryptjs';
import { generateToken } from '../middlewares/authMiddleware.js';
import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/constants.js';

/**
 * Authentication Service
 * Handles login, password hashing, token generation
 */

/**
 * Hash password using bcrypt
 * @param {string} password - Plain password
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Verify password against hash
 * @param {string} password - Plain password
 * @param {string} hash - Password hash
 * @returns {Promise<boolean>} True if password matches
 */
export const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * User login
 * Finds user by email and verifies password
 * Returns JWT token and user data
 * 
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} { token, user: { id, email, name, role } }
 * @throws {AppError} If credentials are invalid
 */
export const login = async (email, password) => {
  try {
    // Query for user by email
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND active = $2',
      [email.toLowerCase(), true]
    );

    if (result.rows.length === 0) {
      throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Return token and user data (without password hash)
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Login failed', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @returns {Promise<object>} User object
 * @throws {AppError} If user not found
 */
export const getUserById = async (userId) => {
  try {
    const result = await query(
      'SELECT id, email, name, role, avatar, active FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch user', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Create new user (for admin/staff registration)
 * @param {object} userData - { email, password, name, role }
 * @returns {Promise<object>} Created user
 */
export const createUser = async (userData) => {
  try {
    const { email, password, name, role, phone, school_name } = userData;
    const passwordHash = await hashPassword(password);

    // Check if email already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('Email already registered', HTTP_STATUS.CONFLICT);
    }

    const result = await query(
      `INSERT INTO users (email, password_hash, name, role, phone, school_name, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING *`,
      [email.toLowerCase(), passwordHash, name, role || 'staff', phone || null, school_name || null, true]
    );

    const user = result.rows[0];

    // Return the created user
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      school_name: user.school_name,
      avatar: user.avatar,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to create user', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  hashPassword,
  verifyPassword,
  login,
  getUserById,
  createUser,
};
