import * as studentModel from '../models/studentModel.js';
import * as dietPlanModel from '../models/dietPlanModel.js';
import * as foodLogModel from '../models/foodLogModel.js';
import * as bmiRecordModel from '../models/bmiRecordModel.js';
import * as healthStatusModel from '../models/healthStatusModel.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

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
    
    return {
      id: student.id,
      name: student.name,
      age: student.age,
      gender: student.gender,
      height: student.height,
      weight: student.weight,
      current_bmi: student.current_bmi,
      rfid_card_id: student.rfid_card_id,
      email: student.email,
      created_at: student.created_at,
    };
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
    const [student, foodLogs, aiHealthStatus, weeklyAvgCalories] = await Promise.all([
      studentModel.getStudentById(studentId),
      foodLogModel.getFoodLogsByStudentId(studentId, 30),
      healthStatusModel.getLatestHealthStatus(studentId),
      foodLogModel.getWeeklyAverageCalories(studentId),
    ]);

    if (!student) {
      throw new AppError('Student not found', HTTP_STATUS.NOT_FOUND);
    }

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
        required_calories: aiHealthStatus.required_calories,
        avg_weekly_calories: aiHealthStatus.avg_weekly_calories,
        created_at: aiHealthStatus.created_at,
      };
    }

    // Format food logs with date sorting (newest first)
    const formattedFoodLogs = (foodLogs || [])
      .map(log => ({
        id: log.id,
        food_item: log.food_item,
        served_grams: log.served_grams,
        estimated_calories: log.estimated_calories,
        protein: log.protein,
        logged_at: log.logged_at || log.created_at,
      }))
      .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));

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
        created_at: student.created_at,
      },
      nutrition_analytics: {
        avg_weekly_calories: parseFloat(weeklyAvgCalories.toFixed(2)),
        required_calories: aiHealthStatus?.required_calories || 1800,
        calorie_deficit: Math.max(0, (aiHealthStatus?.required_calories || 1800) - weeklyAvgCalories),
        calorie_ratio: parseFloat((weeklyAvgCalories / (aiHealthStatus?.required_calories || 1800)).toFixed(2)),
        total_servings: foodLogs?.length || 0,
      },
      ai_analysis: aiPrediction,
      food_history: formattedFoodLogs,
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
