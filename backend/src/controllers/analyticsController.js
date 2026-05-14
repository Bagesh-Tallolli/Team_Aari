import * as db from '../config/db.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../utils/httpStatus.js';
import { AppError } from '../middlewares/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Analytics Controller
 * Provides monthly nutrition analytics and trends
 */

/**
 * GET /api/analytics/monthly/:student_id
 * Get monthly nutrition analytics for a student
 * 
 * Calculates averages for the past 30 days:
 * - avg_calories: Average daily calorie intake
 * - avg_protein: Average daily protein intake
 * - avg_bmi: Average BMI
 * - record_count: Number of health records in period
 * 
 * @params { student_id }
 * @returns { success: true, data: { avg_calories, avg_protein, avg_bmi, record_count } }
 */
export const getMonthlyAnalytics = asyncHandler(async (req, res) => {
  const { student_id } = req.params;

  if (!student_id) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'student_id is required',
      statusCode: HTTP_STATUS.BAD_REQUEST,
    });
  }

  logger.debug(`📊 Fetching monthly analytics for student ${student_id}`);

  const query = `
    SELECT
      COUNT(*) AS record_count,
      ROUND(AVG(calories)::numeric, 2) AS avg_calories,
      ROUND(AVG(protein)::numeric, 2) AS avg_protein,
      ROUND(AVG(bmi)::numeric, 2) AS avg_bmi,
      MIN(created_at) AS first_record,
      MAX(created_at) AS last_record
    FROM health_status
    WHERE student_id = $1
    AND created_at >= NOW() - INTERVAL '30 days'
  `;

  try {
    const result = await db.query(query, [student_id]);

    if (!result.rows || result.rows.length === 0) {
      logger.warn(`No health records found for student ${student_id} in past 30 days`);
      return res.status(HTTP_STATUS.OK).json(
        successResponse(
          {
            student_id,
            record_count: 0,
            avg_calories: 0,
            avg_protein: 0,
            avg_bmi: 0,
            message: 'No health records found in past 30 days',
          },
          'Monthly analytics retrieved',
          HTTP_STATUS.OK
        )
      );
    }

    const analytics = result.rows[0];
    logger.debug(`✅ Monthly analytics calculated:`, {
      record_count: analytics.record_count,
      avg_calories: analytics.avg_calories,
      avg_protein: analytics.avg_protein,
      avg_bmi: analytics.avg_bmi,
    });

    res.status(HTTP_STATUS.OK).json(
      successResponse(
        {
          student_id,
          record_count: parseInt(analytics.record_count, 10),
          avg_calories: parseFloat(analytics.avg_calories) || 0,
          avg_protein: parseFloat(analytics.avg_protein) || 0,
          avg_bmi: parseFloat(analytics.avg_bmi) || 0,
          period: {
            start: analytics.first_record,
            end: analytics.last_record,
            days: 30,
          },
        },
        'Monthly analytics retrieved successfully',
        HTTP_STATUS.OK
      )
    );
  } catch (error) {
    logger.error('❌ Failed to fetch monthly analytics', { student_id, error: error.message });
    throw new AppError('Failed to fetch monthly analytics', HTTP_STATUS.INTERNAL_ERROR);
  }
});

/**
 * GET /api/analytics/monthly/:student_id/detailed
 * Get detailed monthly analytics with status distribution
 * 
 * Returns:
 * - Daily averages
 * - Status distribution (Healthy, At Risk, Underweight)
 * - Min/Max values
 * 
 * @params { student_id }
 * @returns { success: true, data: { summary, status_distribution, trends } }
 */
export const getMonthlyAnalyticsDetailed = asyncHandler(async (req, res) => {
  const { student_id } = req.params;

  if (!student_id) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'student_id is required',
      statusCode: HTTP_STATUS.BAD_REQUEST,
    });
  }

  logger.debug(`📊 Fetching detailed monthly analytics for student ${student_id}`);

  const summaryQuery = `
    SELECT
      COUNT(*) AS total_records,
      ROUND(AVG(calories)::numeric, 2) AS avg_calories,
      ROUND(AVG(protein)::numeric, 2) AS avg_protein,
      ROUND(AVG(bmi)::numeric, 2) AS avg_bmi,
      MIN(calories) AS min_calories,
      MAX(calories) AS max_calories,
      MIN(protein) AS min_protein,
      MAX(protein) AS max_protein,
      MIN(bmi) AS min_bmi,
      MAX(bmi) AS max_bmi
    FROM health_status
    WHERE student_id = $1
    AND created_at >= NOW() - INTERVAL '30 days'
  `;

  const statusQuery = `
    SELECT
      status,
      COUNT(*) AS count,
      ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER ()::numeric, 1) AS percentage
    FROM health_status
    WHERE student_id = $1
    AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY status
    ORDER BY count DESC
  `;

  try {
    const summaryResult = await db.query(summaryQuery, [student_id]);
    const statusResult = await db.query(statusQuery, [student_id]);

    if (!summaryResult.rows || summaryResult.rows.length === 0) {
      logger.warn(`No health records found for student ${student_id}`);
      return res.status(HTTP_STATUS.OK).json(
        successResponse(
          {
            student_id,
            message: 'No health records found in past 30 days',
          },
          'Detailed monthly analytics retrieved',
          HTTP_STATUS.OK
        )
      );
    }

    const summary = summaryResult.rows[0];
    const statusDistribution = statusResult.rows || [];

    logger.debug(`✅ Detailed analytics calculated:`, {
      total_records: summary.total_records,
      avg_calories: summary.avg_calories,
    });

    res.status(HTTP_STATUS.OK).json(
      successResponse(
        {
          student_id,
          summary: {
            total_records: parseInt(summary.total_records, 10),
            avg_calories: parseFloat(summary.avg_calories) || 0,
            avg_protein: parseFloat(summary.avg_protein) || 0,
            avg_bmi: parseFloat(summary.avg_bmi) || 0,
          },
          ranges: {
            calories: {
              min: parseFloat(summary.min_calories) || 0,
              max: parseFloat(summary.max_calories) || 0,
            },
            protein: {
              min: parseFloat(summary.min_protein) || 0,
              max: parseFloat(summary.max_protein) || 0,
            },
            bmi: {
              min: parseFloat(summary.min_bmi) || 0,
              max: parseFloat(summary.max_bmi) || 0,
            },
          },
          status_distribution: statusDistribution.map(s => ({
            status: s.status,
            count: parseInt(s.count, 10),
            percentage: parseFloat(s.percentage) || 0,
          })),
          period: {
            days: 30,
          },
        },
        'Detailed monthly analytics retrieved successfully',
        HTTP_STATUS.OK
      )
    );
  } catch (error) {
    logger.error('❌ Failed to fetch detailed analytics', { student_id, error: error.message });
    throw new AppError('Failed to fetch detailed analytics', HTTP_STATUS.INTERNAL_ERROR);
  }
});

export default {
  getMonthlyAnalytics,
  getMonthlyAnalyticsDetailed,
};
