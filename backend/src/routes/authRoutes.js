import express from 'express';
import * as authController from '../controllers/authController.js';
import { validate, authSchemas } from '../middlewares/validationMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Authentication Routes
 */

/**
 * POST /api/auth/signup
 * Register a new admin/staff user
 * 
 * Body: { email, password, name, role }
 * Response: { success, token, user, message }
 */
router.post(
  '/signup',
  validate(authSchemas.signup, 'body'),
  authController.signup
);

/**
 * POST /api/auth/login
 * Login with email and password
 * Returns JWT token
 * 
 * Body: { email, password }
 * Response: { success, token, user, message }
 */
router.post(
  '/login',
  validate(authSchemas.login, 'body'),
  authController.login
);

/**
 * GET /api/auth/verify
 * Verify current JWT token
 * Requires Authorization header
 * 
 * Headers: Authorization: Bearer <token>
 * Response: { success, user, message }
 */
router.get(
  '/verify',
  authMiddleware,
  authController.verifyAuth
);

export default router;
