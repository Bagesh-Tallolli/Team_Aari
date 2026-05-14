import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';

/**
 * Analytics Service
 * Calculates nutrition and health metrics from food logs
 * Generates data for AI model predictions
 */

/**
 * Get weekly average calorie intake for a student
 * Calculates average calories from food logs over last 7 days
 * 
 * @param {number} studentId - Student ID
 * @returns {Promise<number>} Average weekly calories (0 if no data)
 */
export const getWeeklyAverage = async (studentId) => {
  try {
    if (!studentId) {
      throw new AppError('Student ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    logger.debug(`📊 Calculating weekly average for student: ${studentId}`);

    // Query: Get average calories from last 7 days
    const result = await query(
      `SELECT AVG(estimated_calories) AS avg_calories
       FROM food_logs
       WHERE student_id = $1
       AND logged_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'`,
      [studentId]
    );

    // Extract average or default to 0
    const avgCalories = result.rows.length > 0 && result.rows[0].avg_calories 
      ? parseFloat(result.rows[0].avg_calories).toFixed(2) 
      : 0;

    logger.debug(`✅ Weekly average calculated: ${avgCalories} kcal`);

    return parseFloat(avgCalories);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ Weekly average calculation failed: ${error.message}`);
    throw new AppError('Failed to calculate weekly average', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get total calories for today
 * @param {number} studentId - Student ID
 * @returns {Promise<number>} Total calories today (0 if no data)
 */
export const getTodaysTotalCalories = async (studentId) => {
  try {
    if (!studentId) {
      throw new AppError('Student ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    logger.debug(`📊 Calculating today's total for student: ${studentId}`);

    const result = await query(
      `SELECT SUM(estimated_calories) AS total_calories
       FROM food_logs
       WHERE student_id = $1
       AND DATE(logged_at) = CURRENT_DATE`,
      [studentId]
    );

    const totalCalories = result.rows.length > 0 && result.rows[0].total_calories 
      ? parseFloat(result.rows[0].total_calories).toFixed(2) 
      : 0;

    logger.debug(`✅ Today's total calculated: ${totalCalories} kcal`);

    return parseFloat(totalCalories);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ Today's total calculation failed: ${error.message}`);
    throw new AppError('Failed to calculate today\'s total', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get weekly nutrition summary
 * Calculates totals for calories, protein, carbs, fats over last 7 days
 * 
 * @param {number} studentId - Student ID
 * @returns {Promise<object>} Weekly nutrition totals
 */
export const getWeeklySummary = async (studentId) => {
  try {
    if (!studentId) {
      throw new AppError('Student ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    logger.debug(`📊 Calculating weekly summary for student: ${studentId}`);

    const result = await query(
      `SELECT 
         COUNT(*) as meal_count,
         SUM(estimated_calories) as total_calories,
         AVG(estimated_calories) as avg_calories,
         SUM(protein) as total_protein,
         AVG(protein) as avg_protein,
         SUM(carbs) as total_carbs,
         AVG(carbs) as avg_carbs,
         SUM(fats) as total_fats,
         AVG(fats) as avg_fats
       FROM food_logs
       WHERE student_id = $1
       AND logged_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return {
        meal_count: 0,
        total_calories: 0,
        avg_calories: 0,
        total_protein: 0,
        avg_protein: 0,
        total_carbs: 0,
        avg_carbs: 0,
        total_fats: 0,
        avg_fats: 0,
      };
    }

    const row = result.rows[0];
    return {
      meal_count: parseInt(row.meal_count, 10),
      total_calories: row.total_calories ? parseFloat(row.total_calories).toFixed(2) : 0,
      avg_calories: row.avg_calories ? parseFloat(row.avg_calories).toFixed(2) : 0,
      total_protein: row.total_protein ? parseFloat(row.total_protein).toFixed(2) : 0,
      avg_protein: row.avg_protein ? parseFloat(row.avg_protein).toFixed(2) : 0,
      total_carbs: row.total_carbs ? parseFloat(row.total_carbs).toFixed(2) : 0,
      avg_carbs: row.avg_carbs ? parseFloat(row.avg_carbs).toFixed(2) : 0,
      total_fats: row.total_fats ? parseFloat(row.total_fats).toFixed(2) : 0,
      avg_fats: row.avg_fats ? parseFloat(row.avg_fats).toFixed(2) : 0,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ Weekly summary calculation failed: ${error.message}`);
    throw new AppError('Failed to calculate weekly summary', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get all students with their weekly average calories
 * Used for AI model batch processing
 * 
 * @returns {Promise<array>} Array of students with weekly averages
 */
export const getAllStudentsWeeklyAverages = async () => {
  try {
    logger.debug(`📊 Calculating weekly averages for all students`);

    const result = await query(
      `SELECT 
         s.id,
         s.name,
         s.age,
         s.gender,
         s.current_bmi,
         s.risk_level,
         COALESCE(AVG(f.estimated_calories), 0) AS avg_weekly_calories,
         COALESCE(COUNT(f.id), 0) AS meal_count,
         COALESCE(SUM(f.estimated_calories), 0) AS total_calories
       FROM students s
       LEFT JOIN food_logs f ON s.id = f.student_id
         AND f.logged_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
       GROUP BY s.id, s.name, s.age, s.gender, s.current_bmi, s.risk_level
       ORDER BY s.id`
    );

    logger.debug(`✅ Weekly averages calculated for ${result.rows.length} students`);

    return result.rows.map(row => ({
      student_id: row.id,
      name: row.name,
      age: row.age,
      gender: row.gender,
      bmi: parseFloat(row.current_bmi) || 0,
      risk_level: row.risk_level,
      avg_weekly_calories: parseFloat(row.avg_weekly_calories).toFixed(2),
      meal_count: parseInt(row.meal_count, 10),
      total_weekly_calories: parseFloat(row.total_calories).toFixed(2),
    }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ All students weekly averages calculation failed: ${error.message}`);
    throw new AppError('Failed to calculate all students weekly averages', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get nutrition trend for a student over specified days
 * Shows daily totals for trend analysis
 * 
 * @param {number} studentId - Student ID
 * @param {number} days - Number of days to analyze (default 7)
 * @returns {Promise<array>} Daily nutrition data
 */
export const getNutritionTrend = async (studentId, days = 7) => {
  try {
    if (!studentId) {
      throw new AppError('Student ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    logger.debug(`📊 Calculating nutrition trend for student: ${studentId}, days: ${days}`);

    const result = await query(
      `SELECT 
         DATE(logged_at) AS date,
         COUNT(*) as meal_count,
         SUM(estimated_calories) as total_calories,
         AVG(estimated_calories) as avg_calories,
         SUM(protein) as total_protein,
         SUM(carbs) as total_carbs,
         SUM(fats) as total_fats
       FROM food_logs
       WHERE student_id = $1
       AND logged_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
       GROUP BY DATE(logged_at)
       ORDER BY DATE(logged_at) DESC`,
      [studentId]
    );

    return result.rows.map(row => ({
      date: row.date,
      meal_count: parseInt(row.meal_count, 10),
      total_calories: row.total_calories ? parseFloat(row.total_calories).toFixed(2) : 0,
      avg_calories: row.avg_calories ? parseFloat(row.avg_calories).toFixed(2) : 0,
      total_protein: row.total_protein ? parseFloat(row.total_protein).toFixed(2) : 0,
      total_carbs: row.total_carbs ? parseFloat(row.total_carbs).toFixed(2) : 0,
      total_fats: row.total_fats ? parseFloat(row.total_fats).toFixed(2) : 0,
    }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ Nutrition trend calculation failed: ${error.message}`);
    throw new AppError('Failed to calculate nutrition trend', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  getWeeklyAverage,
  getTodaysTotalCalories,
  getWeeklySummary,
  getAllStudentsWeeklyAverages,
  getNutritionTrend,
};
