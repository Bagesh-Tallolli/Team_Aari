import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Dashboard Routes
 */

/**
 * GET /api/dashboard
 * Get aggregated dashboard data
 * Includes KPIs, BMI trends, food intake, risk distribution, activity feed
 * 
 * Response: {
 *   success,
 *   data: {
 *     kpis: { total_students, meals_today, avg_bmi, at_risk_count },
 *     alerts: { healthy, at_risk, critical },
 *     bmi_trend: [],
 *     food_intake: {},
 *     risk_distribution: {},
 *     recent_activity: []
 *   }
 * }
 */
router.get(
  '/',
  authMiddleware,
  dashboardController.getDashboardData
);

export default router;
