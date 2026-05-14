import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';

const router = express.Router();

/**
 * Analytics Routes
 * Provides nutrition analytics and trends
 */

/**
 * GET /api/analytics/monthly/:student_id
 * Monthly nutrition analytics for a student
 */
router.get('/monthly/:student_id', analyticsController.getMonthlyAnalytics);

/**
 * GET /api/analytics/monthly/:student_id/detailed
 * Detailed monthly analytics with status distribution
 */
router.get('/monthly/:student_id/detailed', analyticsController.getMonthlyAnalyticsDetailed);

export default router;
