import * as studentModel from '../models/studentModel.js';
import * as dietPlanModel from '../models/dietPlanModel.js';
import * as foodLogModel from '../models/foodLogModel.js';
import * as analyticsService from './analyticsService.js';
import * as predictionService from './predictionService.js';
import * as servingRuleService from './servingRuleService.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';
import {
  getSchoolMealTarget,
  getFullDayRequirement,
  assessPediatricBmi,
  calculateServedNutrients,
} from '../config/nutritionStandards.js';

/**
 * RFID Scan Service
 * Handles RFID scan processing and serving decisions
 * Identifies student by RFID card and determines meal quantities
 */

/**
 * Process RFID scan - Fast response for machine integration
 * Finds student by RFID card ID and returns serving quantity
 * AUTOMATICALLY LOGS FOOD SERVING AND CALCULATES WEEKLY METRICS
 * 
 * @param {string} rfidCardId - RFID card ID from scanner
 * @returns {Promise<object>} { student_id, name, bmi, grams, calories, avg_weekly_calories }
 */
export const processRfidScan = async (rfidCardId, options = {}) => {
  try {
    if (!rfidCardId || rfidCardId.trim() === '') {
      throw new AppError('RFID card ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    logger.debug(`🔍 Looking up student by RFID: ${rfidCardId}`);

    // Step 1: Find student by RFID card ID
    const student = await getStudentByRfidCardId(rfidCardId);

    if (!student) {
      logger.warn(`❌ Student not found for RFID: ${rfidCardId}`);
      throw new AppError('Student not found', HTTP_STATUS.NOT_FOUND);
    }

    logger.info(`✅ Student identified: ${student.name} (ID: ${student.id})`);

    // Step 2: Calculate serving size using rule engine
    const grams = servingRuleService.getRiceGrams(student.age);
    logger.debug(`📊 Serving calculated: ${grams}g for age ${student.age}`);

    // Step 3: Calculate verified nutrient contribution
    const nutrients = calculateServedNutrients('rice', grams);
    const schoolMealTarget = getSchoolMealTarget(student.age);
    const fullDayRequirement = getFullDayRequirement(student.age, student.gender);
    const heightInMeters = (parseFloat(student.height) || 120) / 100;
    const weightKg = parseFloat(student.weight) || 25;
    const currentBmi = parseFloat((weightKg / (heightInMeters * heightInMeters)).toFixed(2));
    const pediatricAssessment = assessPediatricBmi(student.age, student.gender, currentBmi);

    // Step 4: Separation of scanning and food serving logging
    // A successful RFID scan alone MUST NEVER log a food serving. Serving confirmation
    // requires real weight verification from the HX711 load cell via /api/hardware/served.
    let loggedEntry = null;
    if (options && options.autoLog === true) {
      loggedEntry = await foodLogModel.createFoodLog(student.id, foodLogEntry);
      logger.info(`📝 Food serving logged via explicit autoLog: ${student.name} - ${grams}g rice (${nutrients.calories}kcal)`);
    } else {
      logger.info(`🔍 RFID scan verified for ${student.name}. Serving pending hardware dispensation.`);
    }

    // Step 5: Calculate daily-aggregated weekly average calories
    const avgWeeklyCalories = await analyticsService.getWeeklyAverage(student.id);
    logger.info(`📊 Daily-aggregated weekly average: ${avgWeeklyCalories} kcal/day`);

    // Step 6: Get AI prediction & pediatric evaluation
    let aiPrediction = null;
    try {
      const prediction = await predictionService.getPrediction(student.id, 'veg');
      aiPrediction = predictionService.formatPredictionResponse(prediction);
      logger.info(`🤖 Assessment: ${prediction.status} (confidence: ${prediction.confidence})`);
    } catch (error) {
      logger.warn(`⚠️ Prediction failed, continuing without it: ${error.message}`);
    }

    const schoolMealCalorieGap = Math.max(0, parseFloat((schoolMealTarget.calories - nutrients.calories).toFixed(2)));
    const remainingDailyCalories = Math.max(0, parseFloat((fullDayRequirement.calories - nutrients.calories).toFixed(2)));

    // Step 7: Return comprehensive response for machine and frontend
    return {
      success: true,
      student_id: student.id,
      name: student.name,
      age: student.age,
      gender: student.gender,
      bmi: currentBmi,
      risk_level: student.risk_level || 'unknown',
      rfid_card_id: student.rfid_card_id,
      grams: grams,
      calories: nutrients.calories,
      protein: nutrients.protein,
      // Clearly separated benchmarks
      school_meal_calories_target: schoolMealTarget.calories,
      school_meal_protein_target: schoolMealTarget.protein,
      school_meal_calorie_gap: schoolMealCalorieGap,
      full_day_calories_required: fullDayRequirement.calories,
      full_day_protein_required: fullDayRequirement.protein,
      remaining_daily_calories: remainingDailyCalories,
      seven_day_avg_daily_calories: avgWeeklyCalories,
      pediatric_screening: pediatricAssessment,
      is_served_record: true,
      is_confirmed_consumed: false,
      // AI prediction results
      nutrition_status: aiPrediction?.status || null,
      nutrition_confidence: aiPrediction?.confidence || null,
      nutrition_reason: aiPrediction?.reason || null,
      diet_recommendations: aiPrediction?.diet_plan || null,
      ai_prediction: aiPrediction,
      message: 'Food served and logged successfully',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ Scan processing failed: ${error.message}`);
    throw new AppError('Failed to process RFID scan', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Process RFID scan with detailed meal composition
 * Returns complete meal breakdown with nutrition estimates
 * AUTOMATICALLY LOGS FOOD SERVING AND CALCULATES WEEKLY METRICS
 * 
 * @param {string} rfidCardId - RFID card ID from scanner
 * @returns {Promise<object>} Detailed meal composition and nutrition
 */
export const processRfidScanDetailed = async (rfidCardId, options = {}) => {
  try {
    if (!rfidCardId || rfidCardId.trim() === '') {
      throw new AppError('RFID card ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    logger.debug(`📊 Detailed scan lookup for RFID: ${rfidCardId}`);

    // Step 1: Find student by RFID
    const student = await getStudentByRfidCardId(rfidCardId);

    if (!student) {
      logger.warn(`❌ Student not found for RFID: ${rfidCardId}`);
      throw new AppError('Student not found', HTTP_STATUS.NOT_FOUND);
    }

    logger.info(`✅ Student identified: ${student.name}`);

    // Step 2: Get detailed meal composition
    const mealComposition = servingRuleService.getMealComposition(student);
    const nutritionEstimate = servingRuleService.getEstimatedNutrition(student);

    // Step 3: Calculate total grams and calories for logging
    const totalGrams = mealComposition.total || 300;
    const totalCalories = nutritionEstimate.estimated_calories || 0;

    // Step 4: Separation of scanning and food serving logging
    let loggedEntry = null;
    if (options && options.autoLog === true) {
      const foodLogEntry = {
        food_item: 'rice with dal and vegetables',
        served_grams: totalGrams,
        estimated_calories: totalCalories,
        protein: nutritionEstimate.estimated_protein_g || 0,
        carbs: nutritionEstimate.estimated_carbs_g || 0,
        fats: nutritionEstimate.estimated_fat_g || 0,
      };
      loggedEntry = await foodLogModel.createFoodLog(student.id, foodLogEntry);
      logger.info(`📝 Food logged successfully via explicit autoLog: ${student.name} - ${totalGrams}g meal (${totalCalories}kcal)`);
    } else {
      logger.info(`📊 Detailed scan completed for ${student.name}. Serving pending hardware dispensation.`);
    }

    // Step 5: Calculate weekly metrics for AI model
    const avgWeeklyCalories = await analyticsService.getWeeklyAverage(student.id);
    const weeklySummary = await analyticsService.getWeeklySummary(student.id);
    logger.info(`📊 Weekly metrics calculated: ${avgWeeklyCalories} kcal avg`);

    // Step 6: Get AI prediction (MALNUTRITION DETECTION) ← NEW
    let aiPrediction = null;
    try {
      const prediction = await predictionService.getPrediction(student.id, 'veg');
      aiPrediction = predictionService.formatPredictionResponse(prediction);
      logger.info(`🤖 AI Prediction: ${prediction.status} (confidence: ${prediction.confidence})`);
    } catch (error) {
      logger.warn(`⚠️  AI prediction failed, continuing without it: ${error.message}`);
      // Continue without prediction - not a critical failure
    }

    // Step 7: Fetch diet plan if available
    let dietPlan = null;
    try {
      dietPlan = await dietPlanModel.getDietPlanByStudentId(student.id);
    } catch (err) {
      logger.debug(`⚠️  No diet plan found for student ${student.id}`);
    }

    logger.debug(`✅ Detailed meal composition calculated for ${student.name}`);

    return {
      success: true,
      student: {
        id: student.id,
        name: student.name,
        age: student.age,
        gender: student.gender,
        current_bmi: parseFloat(student.current_bmi) || 0,
        risk_level: student.risk_level || 'healthy',
        rfid_card_id: student.rfid_card_id,
      },
      meal_composition: mealComposition,
      nutrition_estimate: nutritionEstimate,
      food_logged: {
        grams: totalGrams,
        calories: totalCalories,
        message: 'Food served and logged successfully',
      },
      weekly_metrics: {
        avg_weekly_calories: avgWeeklyCalories,
        weekly_summary: weeklySummary,
      },
      // AI prediction results (for frontend display)
      nutrition_status: aiPrediction?.status || null,
      nutrition_confidence: aiPrediction?.confidence || null,
      nutrition_reason: aiPrediction?.reason || null,
      diet_recommendations: aiPrediction?.diet_plan || null,
      // Full prediction details
      ai_prediction: aiPrediction,
      diet_plan: dietPlan || null,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ Detailed scan processing failed: ${error.message}`);
    throw new AppError('Failed to process detailed scan', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Legacy scan processing for student_id input
 * Kept for backward compatibility
 * 
 * @param {number} studentId - Student ID
 * @returns {Promise<object>} Meal plan data
 */
export const processRfidScanLegacy = async (studentId) => {
  try {
    // Fetch diet plan (legacy behavior)
    const dietPlan = await dietPlanModel.getDietPlanByStudentId(studentId);

    return {
      student_id: studentId,
      meal_type: 'lunch',
      items: dietPlan.map((item) => ({
        food_item: item.food_item,
        required_grams: item.required_grams,
      })),
      total_items: dietPlan.length,
      scan_timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Legacy scan processing failed', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get student by RFID card ID
 * Internal helper function
 * 
 * @param {string} rfidCardId - RFID card ID
 * @returns {Promise<object>} Student object or null
 */
async function getStudentByRfidCardId(rfidCardId) {
  try {
    const { query } = await import('../config/db.js');

    const result = await query(
      'SELECT * FROM students WHERE rfid_card_id = $1',
      [rfidCardId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error(`❌ Database query failed for RFID: ${error.message}`);
    throw new AppError('Failed to query student database', HTTP_STATUS.INTERNAL_ERROR);
  }
}

export default {
  processRfidScan,
  processRfidScanDetailed,
  processRfidScanLegacy,
};
