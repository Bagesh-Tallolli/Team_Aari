import * as studentModel from '../models/studentModel.js';
import * as foodLogModel from '../models/foodLogModel.js';
import * as bmiRecordModel from '../models/bmiRecordModel.js';
import * as alertModel from '../models/alertModel.js';
import * as aiService from './aiService.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import { ALERT_THRESHOLDS } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Food Log Service
 * Handles food logging, AI analysis, and alert generation
 */

/**
 * Process new food log entry
 * Complete flow: log → fetch student → call AI → update BMI → generate alert
 * 
 * @param {number} studentId - Student ID
 * @param {object} logData - { food_item, served_grams, protein, calories, carbs, fats }
 * @returns {Promise<object>} { log, analysis, alert }
 */
export const processNewFoodLog = async (studentId, logData) => {
  try {
    // Step 1: Create food log entry
    const foodLog = await foodLogModel.createFoodLog(studentId, logData);
    logger.info(`📝 Food log created for student ${studentId}: ${logData.food_item}`);

    // Step 2: Get student data
    const student = await studentModel.getStudentById(studentId);

    // Step 3: Get today's food logs (including new one)
    const todaysFoodLogs = await foodLogModel.getTodaysFoodLogs(studentId);

    // Step 4: Call AI service for analysis
    let analysisResult = null;
    try {
      const foodLogsForAi = todaysFoodLogs.map(log => ({
        id: log.id,
        food_item: log.food_item,
        served_grams: log.served_grams,
        estimated_calories: log.estimated_calories,
        protein: log.protein,
        carbs: log.carbs,
        fats: log.fats,
      }));

      // Get diet plan
      const { default: dietPlanModel } = await import('../models/dietPlanModel.js');
      const dietPlan = await dietPlanModel.getDietPlanByStudentId(studentId);

      analysisResult = await aiService.analyzeNutrition({
        student,
        foodLogs: foodLogsForAi,
        dietPlan,
      });

      logger.info(`🤖 AI analysis completed for student ${studentId}:`, analysisResult);
    } catch (error) {
      // If AI service fails, use mock analysis
      logger.warn(`⚠️  AI service unavailable, using mock analysis:`, error.message);
      analysisResult = await aiService.mockAnalyzeNutrition(student, todaysFoodLogs);
    }

    // Step 5: Create BMI record
    const bmiRecord = await bmiRecordModel.createBmiRecord(studentId, {
      bmi: analysisResult.bmi,
      weight: student.weight,
      height: student.height,
      status: analysisResult.status,
      risk_flag: analysisResult.risk,
      ai_analysis: analysisResult.analysis,
    });

    // Step 6: Update student's risk level and BMI
    await studentModel.updateStudent(studentId, {
      current_bmi: analysisResult.bmi,
      risk_level: analysisResult.risk,
    });

    // Step 7: Generate alert if risk detected
    let generatedAlert = null;
    if (analysisResult.risk !== 'healthy') {
      generatedAlert = await generateRiskAlert(studentId, student.name, analysisResult);
    }

    return {
      success: true,
      log: foodLog,
      analysis: analysisResult,
      bmi_record: bmiRecord,
      alert: generatedAlert,
      message: 'Food log processed and analyzed successfully',
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('❌ Error processing food log:', error.message);
    throw new AppError('Failed to process food log', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Generate alert if risk level is at_risk or critical
 * 
 * @private
 * @param {number} studentId - Student ID
 * @param {string} studentName - Student name
 * @param {object} analysis - AI analysis results
 * @returns {Promise<object>} Created alert
 */
const generateRiskAlert = async (studentId, studentName, analysis) => {
  try {
    let category = 'nutrition_warning';
    let message = '';

    // Determine alert category and message based on risk type
    if (analysis.status === 'obese' && analysis.bmi >= ALERT_THRESHOLDS.BMI_OBESE_THRESHOLD) {
      category = 'bmi_critical';
      message = `CRITICAL: BMI is ${analysis.bmi} (Obese category). Immediate health intervention required.`;
    } else if (analysis.status === 'underweight' && analysis.bmi <= ALERT_THRESHOLDS.BMI_UNDERWEIGHT_THRESHOLD) {
      category = 'bmi_critical';
      message = `CRITICAL: BMI is ${analysis.bmi} (Underweight). Nutritional support needed.`;
    } else if (analysis.status === 'overweight') {
      category = 'bmi_warning';
      message = `WARNING: BMI is ${analysis.bmi} (Overweight). Monitor diet and increase physical activity.`;
    } else {
      category = 'nutrition_warning';
      message = analysis.recommendations;
    }

    const alert = await alertModel.createAlert(studentId, {
      student_name: studentName,
      risk_level: analysis.risk,
      message,
      category,
      action_url: `/students/${studentId}`,
    });

    logger.info(`🚨 Alert generated for student ${studentId}: ${category}`);
    return alert;
  } catch (error) {
    logger.error('❌ Error generating alert:', error.message);
    // Don't throw - alert generation failure shouldn't block food log
    return null;
  }
};

/**
 * Get student food log history with analysis
 * 
 * @param {number} studentId - Student ID
 * @param {number} days - Number of days to look back
 * @returns {Promise<object>} { logs, summary, bmi_trend }
 */
export const getStudentFoodHistory = async (studentId, days = 7) => {
  try {
    // Get food logs
    const foodLogs = await foodLogModel.getFoodLogsByStudentId(studentId, days * 20);

    // Get BMI history
    const bmiHistory = await bmiRecordModel.getBmiHistoryByStudentId(studentId, days * 2);

    // Get today's summary
    const todaysSummary = await foodLogModel.getDailyNutritionSummary(studentId);

    return {
      food_logs: foodLogs,
      daily_summary: todaysSummary,
      bmi_history: bmiHistory,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch food history', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  processNewFoodLog,
  getStudentFoodHistory,
};
