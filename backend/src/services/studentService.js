import * as studentModel from '../models/studentModel.js';
import * as dietPlanModel from '../models/dietPlanModel.js';
import * as foodLogModel from '../models/foodLogModel.js';
import * as bmiRecordModel from '../models/bmiRecordModel.js';
import * as healthStatusModel from '../models/healthStatusModel.js';
import dietRecommendationService from './dietRecommendationService.js';
import weeklyNutritionAnalysisService from './weeklyNutritionAnalysisService.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import {
  getSchoolMealTarget,
  getFullDayRequirement,
  assessPediatricBmi,
} from '../config/nutritionStandards.js';

/**
 * Student Service
 * Handles student data retrieval and aggregation
 */

/**
 * Register a new student
 * Computes BMI server-side and validates RFID uniqueness
 * 
 * @param {object} studentData - { name, age, gender, height, weight, rfid_card_id, email? }
 * @returns {Promise<object>} Created student with computed BMI
 */
export const registerStudent = async (studentData) => {
  try {
    const student = await studentModel.createStudent(studentData);
    return student;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to register student', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get complete student profile with related data
 * Includes: student info, diet plan, food logs, BMI history
 * 
 * @param {number} studentId - Student ID
 * @returns {Promise<object>} Aggregated student data
 */
export const getStudentProfile = async (studentId) => {
  try {
    // Fetch all data in parallel
    const [student, dietPlan, foodLogs, bmiHistory] = await Promise.all([
      studentModel.getStudentById(studentId),
      dietPlanModel.getDietPlanByStudentId(studentId),
      foodLogModel.getFoodLogsByStudentId(studentId, 10),
      bmiRecordModel.getBmiHistoryByStudentId(studentId, 10),
    ]);

    // Get today's nutrition summary
    const todaysSummary = await foodLogModel.getDailyNutritionSummary(studentId);

    return {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        age: student.age,
        gender: student.gender,
        height: student.height,
        weight: student.weight,
        current_bmi: student.current_bmi,
        rfid_card_id: student.rfid_card_id,
        risk_level: student.risk_level,
        avatar: student.avatar,
        created_at: student.created_at,
      },
      diet_plan: dietPlan,
      food_logs: foodLogs,
      bmi_history: bmiHistory,
      daily_summary: todaysSummary,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch student profile', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get comprehensive student profile with AI predictions and diet recommendations
 * Enhanced version including health_status (AI analysis)
 * 
 * @param {number} studentId - Student ID
 * @returns {Promise<object>} Complete aggregated student data
 */
export const getComprehensiveStudentProfile = async (studentId) => {
  try {
    // Fetch all data in parallel
    const [student, foodLogs, aiHealthStatus, weeklyAvgCalories, dailySummary, monthlyCalories] = await Promise.all([
      studentModel.getStudentById(studentId),
      foodLogModel.getFoodLogsByStudentId(studentId, 30),
      healthStatusModel.getLatestHealthStatus(studentId),
      foodLogModel.getWeeklyAverageCalories(studentId),
      foodLogModel.getDailyNutritionSummary(studentId),
      foodLogModel.getMonthlyTotalCalories(studentId),
    ]);

    if (!student) {
      throw new AppError('Student not found', HTTP_STATUS.NOT_FOUND);
    }

    const age = Number(student.age) || 10;
    const gender = student.gender || 'Male';
    const heightInMeters = (parseFloat(student.height) || 120) / 100;
    const weightKg = parseFloat(student.weight) || 25;
    const currentBmi = parseFloat((weightKg / (heightInMeters * heightInMeters)).toFixed(2));

    const schoolMealTarget = getSchoolMealTarget(age);
    const fullDayRequirement = getFullDayRequirement(age, gender);
    const pediatricAssessment = assessPediatricBmi(age, gender, currentBmi);

    // Format food logs with date sorting (newest first)
    const formattedFoodLogs = (foodLogs || [])
      .map(log => ({
        id: log.id,
        food_item: log.food_item,
        served_grams: parseFloat(log.served_grams || 0),
        estimated_calories: parseFloat(log.estimated_calories || 0),
        protein: parseFloat(log.protein || 0),
        carbs: parseFloat(log.carbs || 0),
        fats: parseFloat(log.fats || 0),
        is_served_record: true,
        is_confirmed_consumed: false,
        logged_at: log.logged_at || log.created_at,
      }))
      .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));

    let actualSchoolCaloriesToday = parseFloat(dailySummary?.total_calories || 0);
    let actualSchoolProteinToday = parseFloat(dailySummary?.total_protein || 0);

    // Fallback: If no logs logged on current calendar date but student has recorded machine servings (e.g. demo data),
    // use the most recent serving session so served calories exist
    if (actualSchoolCaloriesToday === 0 && formattedFoodLogs.length > 0) {
      const latestDate = formattedFoodLogs[0].logged_at ? new Date(formattedFoodLogs[0].logged_at).toISOString().split('T')[0] : null;
      const sameDayLogs = formattedFoodLogs.filter(l => {
        const d = l.logged_at ? new Date(l.logged_at).toISOString().split('T')[0] : null;
        return d === latestDate;
      });
      actualSchoolCaloriesToday = parseFloat(sameDayLogs.reduce((acc, l) => acc + (l.estimated_calories || 0), 0).toFixed(2));
      actualSchoolProteinToday = parseFloat(sameDayLogs.reduce((acc, l) => acc + (l.protein || 0), 0).toFixed(2));
    }

    const isMachineServed = actualSchoolCaloriesToday > 0;
    const schoolMealCalorieGap = Math.max(0, parseFloat((schoolMealTarget.calories - actualSchoolCaloriesToday).toFixed(2)));
    const schoolMealProteinGap = Math.max(0, parseFloat((schoolMealTarget.protein - actualSchoolProteinToday).toFixed(2)));
    const schoolMealFulfillmentPct = Math.round((actualSchoolCaloriesToday / schoolMealTarget.calories) * 100);

    const remainingDailyCalories = Math.max(0, parseFloat((fullDayRequirement.calories - actualSchoolCaloriesToday).toFixed(2)));
    const remainingDailyProtein = Math.max(0, parseFloat((fullDayRequirement.protein - actualSchoolProteinToday).toFixed(2)));
    const icmrFulfillmentPct = Math.min(100, Math.round((actualSchoolCaloriesToday / fullDayRequirement.calories) * 100));

    // Parse AI prediction if it exists
    let aiPrediction = null;
    if (aiHealthStatus) {
      aiPrediction = {
        id: aiHealthStatus.id,
        status: aiHealthStatus.status,
        confidence: aiHealthStatus.confidence,
        reason: aiHealthStatus.reason,
        diet_plan: aiHealthStatus.diet_plan,
        ai_prediction: aiHealthStatus.ai_prediction,
        created_at: aiHealthStatus.created_at,
      };
    }

    let dietRecommendation = null;
    try {
      dietRecommendation = await dietRecommendationService.getLatestRecommendation(studentId);
    } catch (dietErr) {
      console.warn(`Could not fetch diet recommendation for student ${studentId}:`, dietErr.message);
    }

    let weeklyAnalysis = null;
    try {
      weeklyAnalysis = await weeklyNutritionAnalysisService.getLatestWeeklyAnalysis(studentId);
    } catch (weekErr) {
      console.warn(`Could not fetch weekly analysis for student ${studentId}:`, weekErr.message);
    }

    return {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        age: student.age,
        gender: student.gender,
        height: student.height,
        weight: student.weight,
        current_bmi: currentBmi,
        rfid_card_id: student.rfid_card_id,
        risk_level: student.risk_level,
        pediatric_screening: pediatricAssessment,
        parent_name: student.parent_name || null,
        parent_email: student.parent_email || null,
        parent_phone: student.parent_phone || null,
        parent_email_verified: Boolean(student.parent_email_verified),
        parent_report_consent: Boolean(student.parent_report_consent),
        auto_weekly_report_enabled: Boolean(student.auto_weekly_report_enabled),
        created_at: student.created_at,
      },
      parent_contact: {
        parent_name: student.parent_name || null,
        parent_email: student.parent_email || null,
        parent_phone: student.parent_phone || null,
        parent_email_verified: Boolean(student.parent_email_verified),
        parent_report_consent: Boolean(student.parent_report_consent),
        auto_weekly_report_enabled: Boolean(student.auto_weekly_report_enabled),
      },
      nutrition_analytics: {
        // 1. School-Meal Benchmarks (PM POSHAN)
        school_meal_calories_target: schoolMealTarget.calories,
        school_meal_protein_target: schoolMealTarget.protein,
        actual_school_calories_served: actualSchoolCaloriesToday,
        actual_school_protein_served: actualSchoolProteinToday,
        school_meal_calorie_gap: schoolMealCalorieGap,
        school_meal_protein_gap: schoolMealProteinGap,
        school_meal_fulfillment_pct: schoolMealFulfillmentPct,

        // 2. Full-Day Requirements (ICMR-NIN 2020 RDA)
        full_day_calories_required: fullDayRequirement.calories,
        full_day_protein_required: fullDayRequirement.protein,
        remaining_daily_calories: remainingDailyCalories,
        remaining_daily_protein: remainingDailyProtein,
        total_daily_calories_icmr: fullDayRequirement.calories,
        machine_served_calories: actualSchoolCaloriesToday,
        machine_served_protein: actualSchoolProteinToday,
        is_machine_served: isMachineServed,
        icmr_remaining_calories: remainingDailyCalories,
        icmr_fulfillment_pct: icmrFulfillmentPct,
        last_served_at: formattedFoodLogs[0]?.logged_at || null,
        last_served_food: formattedFoodLogs[0]?.food_item || null,
        last_served_grams: formattedFoodLogs[0]?.served_grams || null,

        // 3. Historical Trends
        avg_weekly_daily_calories: parseFloat(weeklyAvgCalories.toFixed(2)),
        monthly_calories: parseFloat(monthlyCalories || 0),
        total_servings: foodLogs?.length || 0,

        // Backward compatibility aliases
        todays_calories: actualSchoolCaloriesToday,
        avg_weekly_calories: parseFloat(weeklyAvgCalories.toFixed(2)),
        required_calories: schoolMealTarget.calories,
        calorie_deficit: schoolMealCalorieGap,
        calorie_ratio: parseFloat((actualSchoolCaloriesToday / schoolMealTarget.calories).toFixed(2)),
        calculation_basis: 'PM POSHAN 2021 Norms (School Meal) & ICMR-NIN 2020 RDA (Full Day)',
      },
      ai_analysis: aiPrediction,
      food_history: formattedFoodLogs,
      diet_recommendation: dietRecommendation,
      weekly_analysis: weeklyAnalysis,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Error in getComprehensiveStudentProfile:', error);
    throw new AppError('Failed to fetch comprehensive student profile', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get all students with pagination and filtering
 * 
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} search - Search query
 * @param {string} riskLevel - Filter by risk level
 * @returns {Promise<object>} Paginated student list
 */
export const listStudents = async (page = 1, limit = 20, search = null, riskLevel = null) => {
  try {
    const result = await studentModel.getAllStudents(page, limit, search, riskLevel);
    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch students', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get students at risk
 * 
 * @returns {Promise<array>} Array of at-risk students
 */
export const getAtRiskStudents = async () => {
  try {
    return await studentModel.getAtRiskStudents();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch at-risk students', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  registerStudent,
  getStudentProfile,
  getComprehensiveStudentProfile,
  listStudents,
  getAtRiskStudents,
};
