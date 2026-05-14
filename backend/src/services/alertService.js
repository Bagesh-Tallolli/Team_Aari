import * as alertModel from '../models/alertModel.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Alert Service
 * Handles alert management and risk determination
 */

/**
 * Get all alerts with filters
 * 
 * @param {object} filters - { risk_level, resolved, page, limit }
 * @returns {Promise<object>} Paginated alerts with statistics
 */
export const getAllAlerts = async (filters = {}) => {
  try {
    const alertsData = await alertModel.getAllAlerts(filters);
    const stats = await alertModel.getAlertStatistics();

    return {
      alerts: alertsData.alerts,
      total: alertsData.total,
      page: alertsData.page,
      limit: alertsData.limit,
      totalPages: alertsData.totalPages,
      stats, // { healthy, at_risk, critical }
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch alerts', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get alerts for specific student
 * 
 * @param {number} studentId - Student ID
 * @param {number} limit - Number of alerts
 * @returns {Promise<array>} Student's alerts
 */
export const getStudentAlerts = async (studentId, limit = 20) => {
  try {
    return await alertModel.getAlertsByStudentId(studentId, limit);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch student alerts', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Mark alert as resolved
 * 
 * @param {number} alertId - Alert ID
 * @returns {Promise<object>} Updated alert
 */
export const resolveAlert = async (alertId) => {
  try {
    return await alertModel.markAlertResolved(alertId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to resolve alert', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get alert statistics
 * 
 * @returns {Promise<object>} { healthy, at_risk, critical }
 */
export const getAlertStatistics = async () => {
  try {
    return await alertModel.getAlertStatistics();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch alert statistics', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  getAllAlerts,
  getStudentAlerts,
  resolveAlert,
  getAlertStatistics,
};
