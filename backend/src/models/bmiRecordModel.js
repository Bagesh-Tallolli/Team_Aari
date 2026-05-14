import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * BMI Record Model - Database queries for BMI history tracking (PostgreSQL)
 */

/**
 * Create BMI record
 * @param {number} studentId - Student ID
 * @param {object} data - BMI record data
 * @returns {Promise<object>} Created BMI record
 */
export const createBmiRecord = async (studentId, data) => {
  try {
    const {
      bmi,
      weight,
      height,
      status = 'normal',
      risk_flag = 'healthy',
      ai_analysis = null,
    } = data;

    const result = await query(
      `INSERT INTO bmi_records 
       (student_id, bmi, weight, height, status, risk_flag, ai_analysis, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [studentId, bmi, weight, height, status, risk_flag, ai_analysis]
    );

    return result.rows[0];
  } catch (error) {
    throw new AppError('Failed to create BMI record', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get BMI history for a student
 * @param {number} studentId - Student ID
 * @param {number} limit - Number of records to fetch
 * @returns {Promise<array>} Array of BMI records
 */
export const getBmiHistoryByStudentId = async (studentId, limit = 30) => {
  try {
    const result = await query(
      `SELECT * FROM bmi_records 
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [studentId, limit]
    );

    return result.rows;
  } catch (error) {
    throw new AppError('Failed to fetch BMI history', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get latest BMI record for a student
 * @param {number} studentId - Student ID
 * @returns {Promise<object>} Latest BMI record
 */
export const getLatestBmiRecord = async (studentId) => {
  try {
    const result = await query(
      `SELECT * FROM bmi_records 
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    throw new AppError('Failed to fetch latest BMI record', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get BMI record by ID
 * @param {number} recordId - BMI record ID
 * @returns {Promise<object>} BMI record
 */
export const getBmiRecordById = async (recordId) => {
  try {
    const result = await query(
      'SELECT * FROM bmi_records WHERE id = $1',
      [recordId]
    );

    if (result.rows.length === 0) {
      throw new AppError('BMI record not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch BMI record', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get average BMI across all students
 * @returns {Promise<number>} Average BMI
 */
export const getAverageBmi = async () => {
  try {
    const result = await query(
      `SELECT AVG(bmi) as avg_bmi FROM (
        SELECT DISTINCT student_id, bmi 
        FROM bmi_records 
        WHERE id IN (
          SELECT MAX(id) FROM bmi_records GROUP BY student_id
        )
      ) latest_bmi`
    );

    return parseFloat(result.rows[0].avg_bmi) || 0;
  } catch (error) {
    throw new AppError('Failed to calculate average BMI', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Count students with specific risk flag
 * @param {string} riskFlag - Risk flag (healthy, at_risk, critical)
 * @returns {Promise<number>} Count of students
 */
export const countStudentsByRisk = async (riskFlag) => {
  try {
    const result = await query(
      `SELECT COUNT(DISTINCT student_id) as count 
       FROM (
         SELECT student_id, risk_flag 
         FROM bmi_records 
         WHERE id IN (
           SELECT MAX(id) FROM bmi_records GROUP BY student_id
         )
       ) latest_risks
       WHERE risk_flag = $1`,
      [riskFlag]
    );

    return parseInt(result.rows[0].count, 10) || 0;
  } catch (error) {
    throw new AppError('Failed to count students by risk', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  createBmiRecord,
  getBmiHistoryByStudentId,
  getLatestBmiRecord,
  getBmiRecordById,
  getAverageBmi,
  countStudentsByRisk,
};
