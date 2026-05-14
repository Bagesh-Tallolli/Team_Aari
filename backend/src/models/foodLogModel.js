import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Food Log Model - Database queries for food logging (PostgreSQL)
 */

/**
 * Create food log entry
 * @param {number} studentId - Student ID
 * @param {object} data - Food log data
 * @returns {Promise<object>} Created food log
 */
export const createFoodLog = async (studentId, data) => {
  try {
    const {
      food_item,
      served_grams,
      estimated_calories = 0,
      protein = 0,
      carbs = 0,
      fats = 0,
    } = data;

    const result = await query(
      `INSERT INTO food_logs 
       (student_id, food_item, served_grams, estimated_calories, protein, carbs, fats, logged_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [studentId, food_item, served_grams, estimated_calories, protein, carbs, fats]
    );

    return result.rows[0];
  } catch (error) {
    throw new AppError('Failed to create food log', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get food logs by student ID
 * @param {number} studentId - Student ID
 * @param {number} limit - Number of recent logs to fetch
 * @returns {Promise<array>} Array of food logs
 */
export const getFoodLogsByStudentId = async (studentId, limit = 50) => {
  try {
    const result = await query(
      `SELECT * FROM food_logs 
       WHERE student_id = $1
       ORDER BY logged_at DESC
       LIMIT $2`,
      [studentId, limit]
    );

    return result.rows;
  } catch (error) {
    throw new AppError('Failed to fetch food logs', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get today's food logs for a student
 * @param {number} studentId - Student ID
 * @returns {Promise<array>} Today's food logs
 */
export const getTodaysFoodLogs = async (studentId) => {
  try {
    const result = await query(
      `SELECT * FROM food_logs 
       WHERE student_id = $1
       AND CURRENT_DATE = DATE(logged_at)
       ORDER BY logged_at DESC`,
      [studentId]
    );

    return result.rows;
  } catch (error) {
    throw new AppError('Failed to fetch today\'s food logs', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Calculate total daily nutrition intake for a student
 * @param {number} studentId - Student ID
 * @param {string} date - Date (YYYY-MM-DD format, default today)
 * @returns {Promise<object>} { total_calories, total_protein, total_carbs, total_fats, count }
 */
export const getDailyNutritionSummary = async (studentId, date = null) => {
  try {
    let query_text;
    let params;

    if (date) {
      query_text = `SELECT 
         COUNT(*) as count,
         COALESCE(SUM(estimated_calories), 0) as total_calories,
         COALESCE(SUM(protein), 0) as total_protein,
         COALESCE(SUM(carbs), 0) as total_carbs,
         COALESCE(SUM(fats), 0) as total_fats
       FROM food_logs 
       WHERE student_id = $1 AND DATE(logged_at) = $2`;
      params = [studentId, date];
    } else {
      query_text = `SELECT 
         COUNT(*) as count,
         COALESCE(SUM(estimated_calories), 0) as total_calories,
         COALESCE(SUM(protein), 0) as total_protein,
         COALESCE(SUM(carbs), 0) as total_carbs,
         COALESCE(SUM(fats), 0) as total_fats
       FROM food_logs 
       WHERE student_id = $1 AND CURRENT_DATE = DATE(logged_at)`;
      params = [studentId];
    }

    const result = await query(query_text, params);

    return {
      ...result.rows[0],
      count: parseInt(result.rows[0].count, 10),
      total_calories: parseFloat(result.rows[0].total_calories),
      total_protein: parseFloat(result.rows[0].total_protein),
      total_carbs: parseFloat(result.rows[0].total_carbs),
      total_fats: parseFloat(result.rows[0].total_fats),
    };
  } catch (error) {
    throw new AppError('Failed to calculate nutrition summary', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get food log by ID
 * @param {number} logId - Food log ID
 * @returns {Promise<object>} Food log
 */
export const getFoodLogById = async (logId) => {
  try {
    const result = await query(
      'SELECT * FROM food_logs WHERE id = $1',
      [logId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Food log not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch food log', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Calculate weekly average calories for a student
 * @param {number} studentId - Student ID
 * @returns {Promise<number>} Weekly average calories
 */
export const getWeeklyAverageCalories = async (studentId) => {
  try {
    const result = await query(
      `SELECT AVG(estimated_calories) as avg_calories
       FROM food_logs
       WHERE student_id = $1
       AND created_at >= NOW() - INTERVAL '7 days'`,
      [studentId]
    );

    return parseFloat(result.rows[0]?.avg_calories || 0);
  } catch (error) {
    throw new AppError('Failed to calculate weekly average calories', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  createFoodLog,
  getFoodLogsByStudentId,
  getTodaysFoodLogs,
  getDailyNutritionSummary,
  getFoodLogById,
  getWeeklyAverageCalories,
};
