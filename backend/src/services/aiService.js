import axios from 'axios';
import env from '../config/env.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';

/**
 * AI Service Integration
 * Wrapper for communication with Flask AI microservice
 */

/**
 * Call AI ML Model for prediction
 * Uses trained scikit-learn model for malnutrition status prediction
 * 
 * @param {number} age - Student age
 * @param {number} bmi - BMI value
 * @param {number} calories - Daily calorie intake
 * @param {number} protein - Daily protein intake
 * @returns {Promise<object>} { status, confidence, probabilities }
 */
export const predictMalnutritionStatus = async (age, bmi, calories, protein) => {
  try {
    // Validate inputs
    if (!age || !bmi || calories === undefined || protein === undefined) {
      throw new AppError('Missing required parameters: age, bmi, calories, protein', HTTP_STATUS.BAD_REQUEST);
    }

    const payload = {
      age: parseFloat(age),
      bmi: parseFloat(bmi),
      calories: parseFloat(calories),
      protein: parseFloat(protein),
    };

    logger.debug(`📤 Calling AI predict endpoint: ${env.AI_SERVICE_URL}`, { payload });

    const response = await axios.post(env.AI_SERVICE_URL, payload, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });

    logger.debug('📥 AI Prediction received', { response: response.data });

    if (!response.data || !response.data.status) {
      throw new AppError('Invalid AI service response', HTTP_STATUS.INTERNAL_ERROR);
    }

    return {
      status: response.data.status,
      confidence: response.data.confidence || 0,
      probabilities: response.data.probabilities || {},
      riskLevel: response.data.status === 'Healthy' ? 'low' : (response.data.status === 'At Risk' ? 'medium' : 'high'),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;

    if (error.code === 'ECONNREFUSED') {
      logger.error('❌ AI Service unavailable (connection refused)', { url: env.AI_SERVICE_URL });
      throw new AppError(
        'AI service is unavailable. Please check if Flask service is running on port 8000.',
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }

    if (error.code === 'ENOTFOUND') {
      logger.error('❌ AI Service not found', { url: env.AI_SERVICE_URL });
      throw new AppError('AI service host not found', HTTP_STATUS.SERVICE_UNAVAILABLE);
    }

    if (error.response?.status === 400) {
      logger.error('❌ Invalid input to AI service', { data: error.response.data });
      throw new AppError(
        `AI Service validation error: ${error.response.data?.message || 'Invalid input'}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (error.response) {
      logger.error('❌ AI Service error', { status: error.response.status, data: error.response.data });
      throw new AppError(
        `AI Service error: ${error.response.data?.message || 'Unknown error'}`,
        error.response.status || HTTP_STATUS.INTERNAL_ERROR
      );
    }

    logger.error('❌ AI prediction failed', { error: error.message });
    throw new AppError('Failed to predict malnutrition status', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Call AI service for nutrition analysis
 * Sends student data and food logs to Flask service
 * Receives BMI, risk level, and recommendations
 * 
 * @param {object} data - { student, foodLogs, dietPlan }
 * @returns {Promise<object>} { bmi, status, risk, recommendations }
 */
export const analyzeNutrition = async (data) => {
  try {
    const { student, foodLogs, dietPlan } = data;

    // First, get prediction from ML model
    let totalCalories = 0;
    let totalProtein = 0;

    if (foodLogs && Array.isArray(foodLogs)) {
      totalCalories = foodLogs.reduce((sum, log) => sum + (log.estimated_calories || 0), 0);
      totalProtein = foodLogs.reduce((sum, log) => sum + (log.protein || 0), 0);
    }

    // Calculate BMI: weight (kg) / (height in m)^2
    const heightInMeters = student.height / 100;
    const bmi = student.weight / (heightInMeters * heightInMeters);

    // Get AI prediction
    const prediction = await predictMalnutritionStatus(
      student.age,
      parseFloat(bmi.toFixed(2)),
      totalCalories,
      totalProtein
    );

    return {
      bmi: parseFloat(bmi.toFixed(2)),
      status: prediction.status,
      riskLevel: prediction.riskLevel,
      confidence: prediction.confidence,
      recommendations: `AI Prediction: ${prediction.status} (Confidence: ${(prediction.confidence * 100).toFixed(0)}%)`,
      analysis: prediction.probabilities,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('❌ Nutrition analysis failed', { error: error.message });
    throw new AppError('Failed to analyze nutrition', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Mock AI analysis for development (when AI service is unavailable)
 * Calculates BMI and simulates AI response
 * 
 * @param {object} student - Student data
 * @param {array} foodLogs - Food logs
 * @returns {object} Simulated AI response
 */
export const mockAnalyzeNutrition = async (student, foodLogs) => {
  // Calculate BMI: weight (kg) / (height in m)^2
  const heightInMeters = student.height / 100;
  const bmi = student.weight / (heightInMeters * heightInMeters);

  // Determine BMI status
  let status = 'normal';
  let risk = 'healthy';

  if (bmi < 18.5) {
    status = 'underweight';
    risk = 'at_risk';
  } else if (bmi < 24.9) {
    status = 'normal';
    risk = 'healthy';
  } else if (bmi < 29.9) {
    status = 'overweight';
    risk = 'at_risk';
  } else {
    status = 'obese';
    risk = 'critical';
  }

  // Calculate total calories from food logs
  const totalCalories = foodLogs.reduce((sum, log) => sum + (log.estimated_calories || 0), 0);

  let recommendations = '';
  if (totalCalories > 2500) {
    recommendations = 'Reduce caloric intake. Your consumption is above recommended levels.';
  } else if (totalCalories < 1500) {
    recommendations = 'Increase food intake. You are under the recommended calorie range.';
  } else {
    recommendations = 'Your nutrition intake is balanced. Continue with current diet habits.';
  }

  return {
    bmi: parseFloat(bmi.toFixed(2)),
    status,
    risk,
    recommendations,
    analysis: `BMI calculated as ${bmi.toFixed(2)} (${status}). Daily intake: ${totalCalories} kcal.`,
  };
};

export default {
  analyzeNutrition,
  mockAnalyzeNutrition,
};
