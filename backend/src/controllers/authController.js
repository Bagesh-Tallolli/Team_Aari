import * as authService from '../services/authService.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { successResponse } from '../utils/httpStatus.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Authentication Controller
 * Handles login and signup endpoints
 */

/**
 * POST /api/auth/signup
 * Register a new admin/staff user
 * Returns JWT token and user information
 * 
 * @body { email, password, name, role }
 * @returns { success, token, user: { id, email, name, role }, message }
 */
export const signup = asyncHandler(async (req, res) => {
  const { email, password, name, role, phone, school_name } = req.body;

  // Create new user
  const user = await authService.createUser({ email, password, name, role, phone, school_name });

  // Generate JWT token
  const { generateToken } = await import('../middlewares/authMiddleware.js');
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  res.status(HTTP_STATUS.CREATED).json({
    ...successResponse(
      { token, user },
      'User registered successfully'
    ),
  });
});

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 * Returns JWT token and user information
 * 
 * @body { email, password }
 * @returns { success, token, user: { id, email, name, role, avatar }, message }
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Call auth service
  const result = await authService.login(email, password);

  res.status(HTTP_STATUS.SUCCESS).json({
    ...successResponse(
      { token: result.token, user: result.user },
      'Login successful'
    ),
  });
});

/**
 * GET /api/auth/verify
 * Verify current authentication token
 * Requires valid JWT in Authorization header
 * 
 * @returns { success, user: { id, email, name, role, avatar } }
 */
export const verifyAuth = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const user = await authService.getUserById(userId);

  res.status(HTTP_STATUS.SUCCESS).json(
    successResponse(user, 'Token verified')
  );
});

export default {
  signup,
  login,
  verifyAuth,
};
