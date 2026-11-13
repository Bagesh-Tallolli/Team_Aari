import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Food Log Model - Database queries for food logging (PostgreSQL)
 */

/**
 * Create food log entry
 * Supports both signatures:
 * - createFoodLog(studentId, data)
 * - createFoodLog(foodLogData) where foodLogData has student_id
 * @param {number|object} studentIdOrData - Student ID or complete food log object
 * @param {object} [maybeData] - Food log data if studentId is passed first
 * @returns {Promise<object>} Created food log
 */
export const createFoodLog = async (studentIdOrData, maybeData = null) => {
  try {
    let studentId;
    let data;

    if (typeof studentIdOrData === 'object' && studentIdOrData !== null && maybeData === null) {
      studentId = studentIdOrData.student_id ?? studentIdOrData.studentId;
      data = studentIdOrData;
    } else {
      studentId = studentIdOrData;
      data = maybeData || {};
    }

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
 * Calculate weekly average daily calories for a student
 * Groups by date first, then averages across recorded days in the last 7 days
 * @param {number} studentId - Student ID
 * @returns {Promise<number>} Weekly average daily calories
 */
export const getWeeklyAverageCalories = async (studentId) => {
  try {
    const result = await query(
      `WITH daily_totals AS (
         SELECT DATE(logged_at) AS log_date, SUM(estimated_calories) AS day_cals
         FROM food_logs
         WHERE student_id = $1
           AND logged_at >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(logged_at)
       )
       SELECT COALESCE(AVG(day_cals), 0) as avg_calories, COUNT(*) as recorded_days
       FROM daily_totals`,
      [studentId]
    );

    return parseFloat(parseFloat(result.rows[0]?.avg_calories || 0).toFixed(2));
  } catch (error) {
    throw new AppError('Failed to calculate weekly average calories', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Calculate total monthly calories for a student
 * @param {number} studentId - Student ID
 * @returns {Promise<number>} Monthly total calories
 */
export const getMonthlyTotalCalories = async (studentId) => {
  try {
    const result = await query(
      `SELECT SUM(estimated_calories) as total_calories
       FROM food_logs
       WHERE student_id = $1
       AND logged_at >= NOW() - INTERVAL '30 days'`,
      [studentId]
    );

    return parseFloat(result.rows[0]?.total_calories || 0);
  } catch (error) {
    throw new AppError('Failed to calculate monthly total calories', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get all food logs with pagination
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<object>} { food_logs, total, page, limit, pages }
 */
export const getAllFoodLogs = async (page = 1, limit = 20) => {
  try {
    const countResult = await query('SELECT COUNT(*) as total FROM food_logs');
    const total = parseInt(countResult.rows[0].total, 10);

    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT * FROM food_logs 
       ORDER BY logged_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      food_logs: result.rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw new AppError('Failed to fetch food logs', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Update food log entry
 * @param {number} foodLogId - Log ID
 * @param {object} foodLogData - Updated fields
 * @returns {Promise<object>} Updated food log
 */
export const updateFoodLog = async (foodLogId, foodLogData) => {
  try {
    const { student_id, food_item, served_grams, estimated_calories, protein, carbs, fats } = foodLogData;

    const result = await query(
      `UPDATE food_logs 
       SET student_id = COALESCE($1, student_id),
           food_item = COALESCE($2, food_item),
           served_grams = COALESCE($3, served_grams),
           estimated_calories = COALESCE($4, estimated_calories),
           protein = COALESCE($5, protein),
           carbs = COALESCE($6, carbs),
           fats = COALESCE($7, fats)
       WHERE id = $8
       RETURNING *`,
      [student_id, food_item, served_grams, estimated_calories, protein, carbs, fats, foodLogId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Food log not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update food log', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Delete food log entry
 * @param {number} foodLogId - Log ID
 * @returns {Promise<object>} Deleted food log
 */
export const deleteFoodLog = async (foodLogId) => {
  try {
    const result = await query(
      'DELETE FROM food_logs WHERE id = $1 RETURNING *',
      [foodLogId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Food log not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to delete food log', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get food logs within a date range
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<array>} Food logs
 */
export const getFoodLogsByDateRange = async (startDate, endDate) => {
  try {
    const result = await query(
      `SELECT * FROM food_logs 
       WHERE logged_at >= $1 AND logged_at <= $2 
       ORDER BY logged_at DESC`,
      [startDate, endDate]
    );

    return result.rows;
  } catch (error) {
    throw new AppError('Failed to fetch food logs by date range', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get food logs for a student by specific date
 * @param {number} studentId
 * @param {string} date - YYYY-MM-DD
 */
export const getFoodLogsByDate = async (studentId, date) => {
  try {
    const result = await query(
      `SELECT * FROM food_logs 
       WHERE student_id = $1 AND DATE(logged_at) = $2
       ORDER BY logged_at DESC`,
      [studentId, date]
    );
    return result.rows;
  } catch (error) {
    return [];
  }
};

export default {
  getAllFoodLogs,
  createFoodLog,
  getFoodLogsByStudentId,
  getTodaysFoodLogs,
  getDailyNutritionSummary,
  getFoodLogById,
  updateFoodLog,
  deleteFoodLog,
  getFoodLogsByDateRange,
  getFoodLogsByDate,
  getWeeklyAverageCalories,
  getMonthlyTotalCalories,
};
