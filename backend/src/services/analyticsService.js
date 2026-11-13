import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';

/**
 * Analytics Service
 * Calculates nutrition and health metrics from food logs
 * 
 * CORE CORRECTION (Phase 1):
 * - Groups food records by (student_id, date) so multi-item meals on the same day are summed first.
 * - Averages daily totals across recorded days, without treating unrecorded days as 0 calories.
 */

/**
 * Get weekly average daily calorie intake for a student
 * Sums all meals on each date, then averages the daily totals over recorded days in the last 7 days.
 * 
 * @param {number} studentId - Student ID
 * @returns {Promise<number>} Average daily calories recorded (0 if no logs in window)
 */
export const getWeeklyAverage = async (studentId) => {
  try {
    if (!studentId) {
      throw new AppError('Student ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    logger.debug(`📊 Calculating daily-aggregated weekly average for student: ${studentId}`);

    const result = await query(
      `WITH daily_intake AS (
         SELECT 
           DATE(logged_at) AS log_date,
           SUM(estimated_calories) AS daily_calories
         FROM food_logs
         WHERE student_id = $1
           AND logged_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
         GROUP BY DATE(logged_at)
       )
       SELECT 
         COALESCE(AVG(daily_calories), 0) AS avg_daily_calories,
         COUNT(*) AS recorded_days_count,
         COALESCE(SUM(daily_calories), 0) AS total_period_calories
       FROM daily_intake`,
      [studentId]
    );

    const avgDailyCalories = result.rows.length > 0 && result.rows[0].avg_daily_calories
      ? parseFloat(parseFloat(result.rows[0].avg_daily_calories).toFixed(2))
      : 0;

    logger.debug(`✅ Weekly daily-average calculated: ${avgDailyCalories} kcal/day (${result.rows[0]?.recorded_days_count || 0} active days)`);

    return avgDailyCalories;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ Weekly average calculation failed: ${error.message}`);
    throw new AppError('Failed to calculate weekly average', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get detailed 7-day intake metrics including protein and active recorded days
 * @param {number} studentId - Student ID
 * @returns {Promise<object>}
 */
export const getWeeklyIntakeDetails = async (studentId) => {
  try {
    if (!studentId) {
      throw new AppError('Student ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const result = await query(
      `WITH daily_intake AS (
         SELECT 
           DATE(logged_at) AS log_date,
           SUM(estimated_calories) AS daily_calories,
           SUM(protein) AS daily_protein,
           SUM(carbs) AS daily_carbs,
           SUM(fats) AS daily_fats,
           COUNT(*) AS daily_item_count
         FROM food_logs
         WHERE student_id = $1
           AND logged_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
         GROUP BY DATE(logged_at)
       )
       SELECT 
         COALESCE(AVG(daily_calories), 0) AS avg_daily_calories,
         COALESCE(AVG(daily_protein), 0) AS avg_daily_protein,
         COALESCE(AVG(daily_carbs), 0) AS avg_daily_carbs,
         COALESCE(AVG(daily_fats), 0) AS avg_daily_fats,
         COUNT(*) AS recorded_days_count,
         COALESCE(SUM(daily_calories), 0) AS total_period_calories,
         COALESCE(SUM(daily_protein), 0) AS total_period_protein,
         COALESCE(SUM(daily_item_count), 0) AS total_items_served
       FROM daily_intake`,
      [studentId]
    );

    const row = result.rows[0] || {};
    return {
      avg_daily_calories: parseFloat(parseFloat(row.avg_daily_calories || 0).toFixed(2)),
      avg_daily_protein: parseFloat(parseFloat(row.avg_daily_protein || 0).toFixed(2)),
      avg_daily_carbs: parseFloat(parseFloat(row.avg_daily_carbs || 0).toFixed(2)),
      avg_daily_fats: parseFloat(parseFloat(row.avg_daily_fats || 0).toFixed(2)),
      recorded_days_count: parseInt(row.recorded_days_count || 0, 10),
      total_period_calories: parseFloat(parseFloat(row.total_period_calories || 0).toFixed(2)),
      total_period_protein: parseFloat(parseFloat(row.total_period_protein || 0).toFixed(2)),
      total_items_served: parseInt(row.total_items_served || 0, 10),
      window_days: 7,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ Weekly intake details calculation failed: ${error.message}`);
    throw new AppError('Failed to calculate weekly intake details', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get total calories recorded today for a student (sums all items served today)
 * @param {number} studentId - Student ID
 * @returns {Promise<number>} Total calories today (0 if no data)
 */
export const getTodaysTotalCalories = async (studentId) => {
  try {
    if (!studentId) {
      throw new AppError('Student ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const result = await query(
      `SELECT 
         COALESCE(SUM(estimated_calories), 0) AS total_calories,
         COALESCE(SUM(protein), 0) AS total_protein
       FROM food_logs
       WHERE student_id = $1
       AND DATE(logged_at) = CURRENT_DATE`,
      [studentId]
    );

    const totalCalories = result.rows.length > 0 && result.rows[0].total_calories 
      ? parseFloat(parseFloat(result.rows[0].total_calories).toFixed(2))
      : 0;

    return totalCalories;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ Today's total calculation failed: ${error.message}`);
    throw new AppError('Failed to calculate today\'s total', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get weekly nutrition summary
 * Aggregates daily intake across the last 7 days
 * 
 * @param {number} studentId - Student ID
 * @returns {Promise<object>} Weekly nutrition totals & daily averages
 */
export const getWeeklySummary = async (studentId) => {
  try {
    if (!studentId) {
      throw new AppError('Student ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    logger.debug(`📊 Calculating daily-aggregated weekly summary for student: ${studentId}`);

    const result = await query(
      `WITH daily_summary AS (
         SELECT 
           DATE(logged_at) AS log_date,
           COUNT(*) AS daily_items,
           SUM(estimated_calories) AS day_cals,
           SUM(protein) AS day_protein,
           SUM(carbs) AS day_carbs,
           SUM(fats) AS day_fats
         FROM food_logs
         WHERE student_id = $1
           AND logged_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
         GROUP BY DATE(logged_at)
       )
       SELECT 
         COUNT(*) AS active_days,
         COALESCE(SUM(daily_items), 0) AS meal_count,
         COALESCE(SUM(day_cals), 0) AS total_calories,
         COALESCE(AVG(day_cals), 0) AS avg_calories_per_day,
         COALESCE(SUM(day_protein), 0) AS total_protein,
         COALESCE(AVG(day_protein), 0) AS avg_protein_per_day,
         COALESCE(SUM(day_carbs), 0) AS total_carbs,
         COALESCE(AVG(day_carbs), 0) AS avg_carbs_per_day,
         COALESCE(SUM(day_fats), 0) AS total_fats,
         COALESCE(AVG(day_fats), 0) AS avg_fats_per_day
       FROM daily_summary`,
      [studentId]
    );

    if (result.rows.length === 0 || parseInt(result.rows[0].active_days, 10) === 0) {
      return {
        active_days: 0,
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
      active_days: parseInt(row.active_days, 10),
      meal_count: parseInt(row.meal_count, 10),
      total_calories: parseFloat(parseFloat(row.total_calories || 0).toFixed(2)),
      avg_calories: parseFloat(parseFloat(row.avg_calories_per_day || 0).toFixed(2)),
      total_protein: parseFloat(parseFloat(row.total_protein || 0).toFixed(2)),
      avg_protein: parseFloat(parseFloat(row.avg_protein_per_day || 0).toFixed(2)),
      total_carbs: parseFloat(parseFloat(row.total_carbs || 0).toFixed(2)),
      avg_carbs: parseFloat(parseFloat(row.avg_carbs_per_day || 0).toFixed(2)),
      total_fats: parseFloat(parseFloat(row.total_fats || 0).toFixed(2)),
      avg_fats: parseFloat(parseFloat(row.avg_fats_per_day || 0).toFixed(2)),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ Weekly summary calculation failed: ${error.message}`);
    throw new AppError('Failed to calculate weekly summary', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get all students with their daily-aggregated weekly average calories
 * 
 * @returns {Promise<array>} Array of students with daily averages
 */
export const getAllStudentsWeeklyAverages = async () => {
  try {
    logger.debug(`📊 Calculating weekly daily-averages for all students`);

    const result = await query(
      `WITH daily_logs AS (
         SELECT 
           student_id,
           DATE(logged_at) AS log_date,
           SUM(estimated_calories) AS day_calories,
           SUM(protein) AS day_protein,
           COUNT(*) AS day_items_count
         FROM food_logs
         WHERE logged_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
         GROUP BY student_id, DATE(logged_at)
       )
       SELECT 
         s.id,
         s.name,
         s.age,
         s.gender,
         s.current_bmi,
         s.risk_level,
         COALESCE(COUNT(d.log_date), 0) AS recorded_days,
         COALESCE(SUM(d.day_items_count), 0) AS meal_count,
         COALESCE(SUM(d.day_calories), 0) AS total_calories,
         CASE 
           WHEN COUNT(d.log_date) > 0 THEN SUM(d.day_calories) / COUNT(d.log_date) 
           ELSE 0 
         END AS avg_daily_calories,
         CASE 
           WHEN COUNT(d.log_date) > 0 THEN SUM(d.day_protein) / COUNT(d.log_date) 
           ELSE 0 
         END AS avg_daily_protein
       FROM students s
       LEFT JOIN daily_logs d ON s.id = d.student_id
       GROUP BY s.id, s.name, s.age, s.gender, s.current_bmi, s.risk_level
       ORDER BY s.id`
    );

    return result.rows.map(row => ({
      student_id: row.id,
      name: row.name,
      age: row.age,
      gender: row.gender,
      bmi: parseFloat(row.current_bmi) || 0,
      risk_level: row.risk_level,
      recorded_days: parseInt(row.recorded_days, 10),
      meal_count: parseInt(row.meal_count, 10),
      total_weekly_calories: parseFloat(parseFloat(row.total_calories || 0).toFixed(2)),
      avg_weekly_calories: parseFloat(parseFloat(row.avg_daily_calories || 0).toFixed(2)),
      avg_weekly_protein: parseFloat(parseFloat(row.avg_daily_protein || 0).toFixed(2)),
    }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ All students weekly averages calculation failed: ${error.message}`);
    throw new AppError('Failed to calculate all students weekly averages', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get daily nutrition trend for a student over specified days
 * Sums all meals served on each calendar date
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

    const safeDays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 90);

    const result = await query(
      `SELECT 
         DATE(logged_at) AS date,
         COUNT(*) as items_served_count,
         SUM(estimated_calories) as total_calories,
         SUM(protein) as total_protein,
         SUM(carbs) as total_carbs,
         SUM(fats) as total_fats
       FROM food_logs
       WHERE student_id = $1
       AND logged_at >= CURRENT_TIMESTAMP - ($2 || ' days')::INTERVAL
       GROUP BY DATE(logged_at)
       ORDER BY DATE(logged_at) DESC`,
      [studentId, safeDays]
    );

    return result.rows.map(row => ({
      date: row.date,
      items_served_count: parseInt(row.items_served_count, 10),
      total_calories: row.total_calories ? parseFloat(parseFloat(row.total_calories).toFixed(2)) : 0,
      total_protein: row.total_protein ? parseFloat(parseFloat(row.total_protein).toFixed(2)) : 0,
      total_carbs: row.total_carbs ? parseFloat(parseFloat(row.total_carbs).toFixed(2)) : 0,
      total_fats: row.total_fats ? parseFloat(parseFloat(row.total_fats).toFixed(2)) : 0,
    }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ Nutrition trend calculation failed: ${error.message}`);
    throw new AppError('Failed to calculate nutrition trend', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  getWeeklyAverage,
  getWeeklyIntakeDetails,
  getTodaysTotalCalories,
  getWeeklySummary,
  getAllStudentsWeeklyAverages,
  getNutritionTrend,
};
