import * as dashboardService from '../services/dashboardService.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Dashboard Controller
 * Handles dashboard analytics and aggregated data
 */

/**
 * GET /api/dashboard
 * Get aggregated dashboard data
 * Returns KPIs, BMI trends, food intake, risk distribution, activity feed
 * 
 * @returns { success, data: { kpis, alerts, bmi_trend, food_intake, risk_distribution, recent_activity }, message }
 */
export const getDashboardData = asyncHandler(async (req, res) => {
  const result = await dashboardService.getDashboardData();

  res.status(HTTP_STATUS.SUCCESS).json(
    successResponse(result, 'Dashboard data retrieved', HTTP_STATUS.SUCCESS)
  );
});

export default {
  getDashboardData,
};
