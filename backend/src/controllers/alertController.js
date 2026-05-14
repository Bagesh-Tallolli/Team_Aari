import * as alertService from '../services/alertService.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Alert Controller
 * Handles health alerts and notifications
 */

/**
 * GET /api/alerts
 * Get all health alerts with filtering and pagination
 * 
 * @query { riskLevel, resolved, page, limit }
 * @returns { success, data: { alerts, total, stats }, message }
 */
export const getAllAlerts = asyncHandler(async (req, res) => {
  const { riskLevel = null, resolved = false, page = 1, limit = 20 } = req.query;

  const result = await alertService.getAllAlerts({
    risk_level: riskLevel,
    resolved: resolved === 'true',
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Alerts retrieved', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/alerts/student/:studentId
 * Get alerts for specific student
 * 
 * @params { studentId }
 * @returns { success, data: [], message }
 */
export const getStudentAlerts = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const result = await alertService.getStudentAlerts(parseInt(studentId, 10));

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Student alerts retrieved', HTTP_STATUS.OK)
  );
});

/**
 * PUT /api/alerts/:id
 * Mark alert as resolved
 * 
 * @params { id: alert_id }
 * @returns { success, data: { alert }, message }
 */
export const resolveAlert = asyncHandler(async (req, res) => {
  const { id: alertId } = req.params;

  const result = await alertService.resolveAlert(parseInt(alertId, 10));

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Alert resolved', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/alerts/stats
 * Get alert statistics
 * 
 * @returns { success, data: { healthy, at_risk, critical }, message }
 */
export const getAlertStatistics = asyncHandler(async (req, res) => {
  const result = await alertService.getAlertStatistics();

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Alert statistics retrieved', HTTP_STATUS.OK)
  );
});

export default {
  getAllAlerts,
  getStudentAlerts,
  resolveAlert,
  getAlertStatistics,
};
