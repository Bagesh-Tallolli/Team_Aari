import express from 'express';
import * as alertController from '../controllers/alertController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Alert Routes
 */

/**
 * GET /api/alerts
 * Get all health alerts
 * 
 * Query: { riskLevel, resolved, page, limit }
 * Response: { success, data: { alerts, total, stats }, message }
 */
router.get(
  '/',
  authMiddleware,
  alertController.getAllAlerts
);

/**
 * GET /api/alerts/stats
 * Get alert statistics
 * 
 * Response: { success, data: { healthy, at_risk, critical } }
 */
router.get(
  '/stats',
  authMiddleware,
  alertController.getAlertStatistics
);

/**
 * GET /api/alerts/student/:studentId
 * Get alerts for specific student
 * 
 * Response: { success, data: [] }
 */
router.get(
  '/student/:studentId',
  authMiddleware,
  alertController.getStudentAlerts
);

/**
 * PUT /api/alerts/:id
 * Mark alert as resolved
 * 
 * Response: { success, data: { alert } }
 */
router.put(
  '/:id',
  authMiddleware,
  alertController.resolveAlert
);

export default router;
