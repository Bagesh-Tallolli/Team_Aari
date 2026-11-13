import express from 'express';
import * as parentDeliveryController from '../controllers/parentReportDeliveryController.js';
import { authMiddleware, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Phase 7: Parent Report Deliveries Route
 * Prefix: /api/parent-report-deliveries
 */

// Public single-use token verification link (clicked directly from parent email)
// Note: Displays confirmation landing page WITHOUT consuming token (protects against automated email scanners)
router.get(
  '/verify-email',
  parentDeliveryController.getVerificationLandingPage
);

// Explicit user confirmation action that consumes the token
router.post(
  '/confirm-verification',
  parentDeliveryController.confirmVerificationToken
);

// Programmatic / direct verification POST alias
router.post(
  '/verify-email',
  parentDeliveryController.confirmVerificationToken
);

// Retrieve specific delivery log by ID (staff/admin only)
router.get(
  '/:deliveryId(\\d+)',
  authMiddleware,
  authorizeRoles('admin', 'staff'),
  parentDeliveryController.getDeliveryById
);

export default router;

