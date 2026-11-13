import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';

/**
 * Weekly Nutrition Report Model (Phase 6)
 * Handles PostgreSQL persistence and querying for weekly student nutrition reports.
 */

let tableInitialized = false;

/**
 * Ensure weekly_nutrition_reports table exists in PostgreSQL
 */
export const ensureTableExists = async () => {
  if (tableInitialized) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS weekly_nutrition_reports (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        report_period_start DATE NOT NULL,
        report_period_end DATE NOT NULL,
        report_data JSONB NOT NULL,
        recorded_days_count INTEGER DEFAULT 0,
        avg_daily_calories DECIMAL(6, 2) DEFAULT 0,
        avg_daily_protein DECIMAL(6, 2) DEFAULT 0,
        target_fulfillment_pct INTEGER DEFAULT 0,
        risk_category VARCHAR(100) DEFAULT 'Normal monitoring',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_weekly_reports_student ON weekly_nutrition_reports(student_id);
      CREATE INDEX IF NOT EXISTS idx_weekly_reports_period ON weekly_nutrition_reports(student_id, report_period_end);
    `);
    tableInitialized = true;
    logger.debug('✓ weekly_nutrition_reports table verified in PostgreSQL');
  } catch (err) {
    logger.warn(`⚠️ ensureTableExists error (table may already exist): ${err.message}`);
  }
};

/**
 * Save or update a weekly report for a student
 * 
 * @param {object} params
 * @returns {Promise<object>}
 */
export const saveReport = async ({
  student_id,
  report_period_start,
  report_period_end,
  report_data,
  recorded_days_count = 0,
  avg_daily_calories = 0,
  avg_daily_protein = 0,
  target_fulfillment_pct = 0,
  risk_category = 'Normal monitoring',
}) => {
  await ensureTableExists();

  try {
    // Check if an existing report exists for this student on the same end date
    const existing = await query(
      `SELECT id FROM weekly_nutrition_reports 
       WHERE student_id = $1 AND report_period_end = $2
       LIMIT 1`,
      [student_id, report_period_end]
    );

    if (existing.rows.length > 0) {
      const reportId = existing.rows[0].id;
      const updated = await query(
        `UPDATE weekly_nutrition_reports
         SET report_period_start = $1,
             report_data = $2,
             recorded_days_count = $3,
             avg_daily_calories = $4,
             avg_daily_protein = $5,
             target_fulfillment_pct = $6,
             risk_category = $7,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING *`,
        [
          report_period_start,
          JSON.stringify(report_data),
          recorded_days_count,
          avg_daily_calories,
          avg_daily_protein,
          target_fulfillment_pct,
          risk_category,
          reportId,
        ]
      );
      return updated.rows[0];
    }

    const inserted = await query(
      `INSERT INTO weekly_nutrition_reports (
         student_id, report_period_start, report_period_end, report_data,
         recorded_days_count, avg_daily_calories, avg_daily_protein,
         target_fulfillment_pct, risk_category, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        student_id,
        report_period_start,
        report_period_end,
        JSON.stringify(report_data),
        recorded_days_count,
        avg_daily_calories,
        avg_daily_protein,
        target_fulfillment_pct,
        risk_category,
      ]
    );
    return inserted.rows[0];
  } catch (error) {
    logger.error('❌ Failed to save weekly nutrition report:', error.message);
    throw new AppError('Failed to save weekly nutrition report', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get the latest weekly report for a student
 * 
 * @param {number} studentId
 * @returns {Promise<object|null>}
 */
export const getLatestReportByStudent = async (studentId) => {
  await ensureTableExists();
  try {
    const result = await query(
      `SELECT * FROM weekly_nutrition_reports
       WHERE student_id = $1
       ORDER BY report_period_end DESC, created_at DESC
       LIMIT 1`,
      [studentId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('❌ Failed to fetch latest weekly report:', error.message);
    throw new AppError('Failed to fetch latest weekly report', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get weekly report by ID
 * 
 * @param {number} reportId
 * @returns {Promise<object|null>}
 */
export const getReportById = async (reportId) => {
  await ensureTableExists();
  try {
    const result = await query(
      `SELECT * FROM weekly_nutrition_reports
       WHERE id = $1
       LIMIT 1`,
      [reportId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('❌ Failed to fetch weekly report by ID:', error.message);
    throw new AppError('Failed to fetch weekly report', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get previous report for trend comparison (strictly before a given end date or before current report id)
 * 
 * @param {number} studentId
 * @param {string} beforeDate - ISO date string YYYY-MM-DD
 * @param {number} [excludeReportId]
 * @returns {Promise<object|null>}
 */
export const getPreviousReport = async (studentId, beforeDate, excludeReportId = null) => {
  await ensureTableExists();
  try {
    let sql = `
      SELECT * FROM weekly_nutrition_reports
      WHERE student_id = $1
        AND report_period_end < $2
    `;
    const params = [studentId, beforeDate];

    if (excludeReportId) {
      sql += ` AND id != $3`;
      params.push(excludeReportId);
    }

    sql += ` ORDER BY report_period_end DESC, created_at DESC LIMIT 1`;

    const result = await query(sql, params);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('❌ Failed to fetch previous weekly report:', error.message);
    return null;
  }
};

/**
 * Get all historical weekly reports for a student
 * 
 * @param {number} studentId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export const getReportHistoryByStudent = async (studentId, limit = 10) => {
  await ensureTableExists();
  try {
    const result = await query(
      `SELECT id, student_id, report_period_start, report_period_end,
              recorded_days_count, avg_daily_calories, avg_daily_protein,
              target_fulfillment_pct, risk_category, created_at
       FROM weekly_nutrition_reports
       WHERE student_id = $1
       ORDER BY report_period_end DESC, created_at DESC
       LIMIT $2`,
      [studentId, limit]
    );
    return result.rows;
  } catch (error) {
    logger.error('❌ Failed to fetch report history:', error.message);
    throw new AppError('Failed to fetch report history', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  ensureTableExists,
  saveReport,
  getLatestReportByStudent,
  getReportById,
  getPreviousReport,
  getReportHistoryByStudent,
};

