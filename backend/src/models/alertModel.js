import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Alert Model - Database queries for health alerts (PostgreSQL)
 */

/**
 * Create an alert
 * @param {number} studentId - Student ID
 * @param {object} data - Alert data
 * @returns {Promise<object>} Created alert
 */
export const createAlert = async (studentId, data) => {
  try {
    const {
      alert_type = 'BMI_ALERT',
      severity = 'warning',
      risk_level = 'at_risk',
      message,
    } = data;

    const createdAlert = await query(
      `INSERT INTO alerts 
       (student_id, alert_type, severity, message, risk_level, resolved, created_at)
       VALUES ($1, $2, $3, $4, $5, false, CURRENT_TIMESTAMP)
       RETURNING *`,
      [studentId, alert_type, severity, message, risk_level]
    );

    return createdAlert.rows[0];
  } catch (error) {
    throw new AppError('Failed to create alert', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get all alerts
 * @param {object} filters - { risk_level, resolved, page, limit }
 * @returns {Promise<object>} { alerts, total, page, limit }
 */
export const getAllAlerts = async (filters = {}) => {
  try {
    const { risk_level = null, resolved = false, page = 1, limit = 20 } = filters;

    let whereConditions = [];
    let params = [];

    // Filter by risk level
    if (risk_level && risk_level !== 'all') {
      whereConditions.push(`a.risk_level = $${params.length + 1}`);
      params.push(risk_level);
    }

    // Filter by resolution status
    if (resolved !== null && resolved !== undefined) {
      whereConditions.push(`a.resolved = $${params.length + 1}`);
      params.push(resolved);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM alerts a ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const offset = (page - 1) * limit;
    const countParams = [...params, limit, offset];

    const result = await query(
      `SELECT a.*, 
              s.name as student_name, 
              s.current_bmi, 
              s.age, 
              s.gender, 
              s.rfid_card_id
       FROM alerts a
       LEFT JOIN students s ON a.student_id = s.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      countParams
    );

    return {
      alerts: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw new AppError('Failed to fetch alerts', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get alerts for a specific student
 * @param {number} studentId - Student ID
 * @param {number} limit - Number of alerts to fetch
 * @returns {Promise<array>} Array of alerts
 */
export const getAlertsByStudentId = async (studentId, limit = 20) => {
  try {
    const result = await query(
      `SELECT * FROM alerts 
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [studentId, limit]
    );

    return result.rows;
  } catch (error) {
    throw new AppError('Failed to fetch student alerts', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get unresolved alerts
 * @returns {Promise<array>} Array of unresolved alerts
 */
export const getUnresolvedAlerts = async () => {
  try {
    const result = await query(
      `SELECT * FROM alerts 
       WHERE resolved = false
       ORDER BY created_at DESC`
    );

    return result.rows;
  } catch (error) {
    throw new AppError('Failed to fetch unresolved alerts', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Mark alert as resolved
 * @param {number} alertId - Alert ID
 * @returns {Promise<object>} Updated alert
 */
export const markAlertResolved = async (alertId) => {
  try {
    await query(
      `UPDATE alerts 
       SET resolved = true, resolved_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [alertId]
    );

    // Fetch the updated alert
    const result = await query(
      `SELECT * FROM alerts WHERE id = $1`,
      [alertId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Alert not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update alert', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get alert by ID
 * @param {number} alertId - Alert ID
 * @returns {Promise<object>} Alert
 */
export const getAlertById = async (alertId) => {
  try {
    const result = await query(
      'SELECT * FROM alerts WHERE id = $1',
      [alertId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Alert not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch alert', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get alert statistics
 * @returns {Promise<object>} { healthy, at_risk, critical }
 */
export const getAlertStatistics = async () => {
  try {
    const result = await query(`
      SELECT 
        COUNT(CASE WHEN risk_level = 'healthy' THEN 1 END) as healthy,
        COUNT(CASE WHEN risk_level = 'at_risk' THEN 1 END) as at_risk,
        COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical
      FROM alerts
      WHERE resolved = false
    `);

    return {
      healthy: parseInt(result.rows[0].healthy, 10),
      at_risk: parseInt(result.rows[0].at_risk, 10),
      critical: parseInt(result.rows[0].critical, 10),
    };
  } catch (error) {
    throw new AppError('Failed to fetch alert statistics', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  createAlert,
  getAllAlerts,
  getAlertsByStudentId,
  getUnresolvedAlerts,
  markAlertResolved,
  getAlertById,
  getAlertStatistics,
};
