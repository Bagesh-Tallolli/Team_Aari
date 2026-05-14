import * as studentModel from '../models/studentModel.js';
import * as foodLogModel from '../models/foodLogModel.js';
import * as bmiRecordModel from '../models/bmiRecordModel.js';
import * as alertModel from '../models/alertModel.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import { query } from '../config/db.js';

/**
 * Dashboard Service
 * Aggregates data for dashboard KPIs and analytics
 */

/**
 * Get dashboard aggregated data
 * Returns KPIs for dashboard home page
 * 
 * @returns {Promise<object>} { kpis, bmi_trend, food_intake, risk_distribution, activity }
 */
export const getDashboardData = async () => {
  try {
    // Fetch all aggregated data in parallel
    const [totalStudents, mealsToday, avgBmi, atRiskCount, alertStats, bmiTrend, riskDistribution, recentActivity, foodIntakeData] = await Promise.all([
      getTotalStudentsCount(),
      getMealsTodayCount(),
      getAverageBmiValue(),
      getAtRiskStudentsCount(),
      alertModel.getAlertStatistics(),
      getBmiTrendData(14), // Last 14 days
      getRiskDistributionData(),
      getRecentActivityFeed(10),
      getFoodIntakeAggregate(),
    ]);

    // Transform risk distribution to array format for pie chart
    const riskDistArray = [
      { name: 'Healthy', value: riskDistribution.healthy, fill: '#22C55E' },
      { name: 'At Risk', value: riskDistribution.at_risk, fill: '#F59E0B' },
      { name: 'Critical', value: riskDistribution.critical, fill: '#EF4444' },
    ];

    // Transform food intake to array format for chart
    const foodIntakeArray = [
      { name: 'Calories', required: 2000, actual: Math.round(foodIntakeData.avg_calories), lastUpdated: new Date().toISOString() },
      { name: 'Protein', required: 50, actual: Math.round(foodIntakeData.avg_protein), lastUpdated: new Date().toISOString() },
      { name: 'Carbs', required: 300, actual: Math.round(foodIntakeData.avg_carbs), lastUpdated: new Date().toISOString() },
      { name: 'Fats', required: 65, actual: Math.round(foodIntakeData.avg_fats), lastUpdated: new Date().toISOString() },
    ];

    // Transform BMI trend data for chart
    const bmiTrendsArray = bmiTrend.map(row => ({
      date: row.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: parseFloat(row.avg_bmi || 0),
    }));

    // Transform KPI data to array format
    const kpisArray = [
      {
        id: 'students',
        title: 'Total Students',
        value: totalStudents,
        trend: 0,
        icon: 'Users',
        color: 'indigo',
      },
      {
        id: 'meals',
        title: 'Meals Served Today',
        value: mealsToday,
        trend: 0,
        icon: 'UtensilsCrossed',
        color: 'green',
      },
      {
        id: 'at_risk',
        title: 'At-Risk Students',
        value: atRiskCount,
        trend: 0,
        icon: 'AlertTriangle',
        color: 'yellow',
      },
      {
        id: 'avg_bmi',
        title: 'Avg BMI',
        value: parseFloat(avgBmi.toFixed(1)),
        trend: 0,
        icon: 'Activity',
        color: 'purple',
      },
    ];

    // Transform activity feed
    const activityFeedArray = recentActivity.map((activity, idx) => ({
      id: idx + 1,
      type: activity.type,
      studentName: activity.student_name || 'Unknown',
      ...(activity.type === 'meal_served' ? {
        foodName: activity.description || 'Unknown meal',
        quantity: '200g',
      } : {
        message: activity.description || 'No message',
        severity: activity.type === 'alert' ? 'critical' : 'info',
      }),
      timestamp: activity.timestamp,
    }));

    return {
      kpis: kpisArray,
      bmiTrends: bmiTrendsArray,
      foodIntake: foodIntakeArray,
      riskDistribution: riskDistArray,
      activityFeed: activityFeedArray,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch dashboard data', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get total number of students
 * @private
 */
const getTotalStudentsCount = async () => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM students');
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    return 0;
  }
};

/**
 * Get number of meals logged today
 * @private
 */
const getMealsTodayCount = async () => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM food_logs 
       WHERE CURRENT_DATE = DATE(logged_at)`
    );
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    return 0;
  }
};

/**
 * Get average BMI across all students
 * @private
 */
const getAverageBmiValue = async () => {
  try {
    return await bmiRecordModel.getAverageBmi();
  } catch (error) {
    return 0;
  }
};

/**
 * Get count of at-risk/critical students
 * @private
 */
const getAtRiskStudentsCount = async () => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM students 
       WHERE risk_level IN ('at_risk', 'critical')`
    );
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    return 0;
  }
};

/**
 * Get BMI trend data for charting
 * @private
 * @param {number} days - Number of days to look back
 * @returns {Promise<array>} BMI trend data points
 */
const getBmiTrendData = async (days = 14) => {
  try {
    const result = await query(`
      SELECT 
        DATE(created_at) as date,
        AVG(bmi) as avg_bmi,
        COUNT(DISTINCT student_id) as students
      FROM bmi_records
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);

    return result.rows.map(row => ({
      date: row.date,
      avg_bmi: parseFloat(row.avg_bmi),
      students: parseInt(row.students, 10),
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Get food intake aggregate data
 * @private
 */
const getFoodIntakeAggregate = async () => {
  try {
    const result = await query(`
      SELECT 
        AVG(estimated_calories) as avg_calories,
        AVG(protein) as avg_protein,
        AVG(carbs) as avg_carbs,
        AVG(fats) as avg_fats,
        COUNT(*) as total_logs
      FROM food_logs
      WHERE logged_at >= NOW() - INTERVAL '1 day'
    `);

    return {
      avg_calories: parseFloat(result.rows[0].avg_calories || 0),
      avg_protein: parseFloat(result.rows[0].avg_protein || 0),
      avg_carbs: parseFloat(result.rows[0].avg_carbs || 0),
      avg_fats: parseFloat(result.rows[0].avg_fats || 0),
      total_logs: parseInt(result.rows[0].total_logs, 10),
    };
  } catch (error) {
    return {
      avg_calories: 0,
      avg_protein: 0,
      avg_carbs: 0,
      avg_fats: 0,
      total_logs: 0,
    };
  }
};

/**
 * Get risk level distribution
 * @private
 */
const getRiskDistributionData = async () => {
  try {
    const result = await query(`
      SELECT risk_level, COUNT(*) as count
      FROM students
      GROUP BY risk_level
    `);

    const distribution = {
      healthy: 0,
      at_risk: 0,
      critical: 0,
    };

    result.rows.forEach(row => {
      distribution[row.risk_level] = parseInt(row.count, 10);
    });

    return distribution;
  } catch (error) {
    return { healthy: 0, at_risk: 0, critical: 0 };
  }
};

/**
 * Get recent activity feed
 * @private
 * @param {number} limit - Number of activities
 */
const getRecentActivityFeed = async (limit = 10) => {
  try {
    const result = await query(`
      SELECT 
        'food_log' as type,
        s.id as student_id,
        s.name as student_name,
        f.food_item as description,
        f.logged_at as timestamp
      FROM food_logs f
      JOIN students s ON f.student_id = s.id
      
      UNION ALL
      
      SELECT 
        'alert' as type,
        a.student_id,
        a.student_id::text as student_name,
        a.message as description,
        a.created_at as timestamp
      FROM alerts a
      WHERE a.resolved = false
      
      ORDER BY timestamp DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map(row => ({
      type: row.type,
      student_id: row.student_id,
      student_name: row.student_name,
      description: row.description,
      timestamp: row.timestamp,
    }));
  } catch (error) {
    return [];
  }
};

export default {
  getDashboardData,
};
