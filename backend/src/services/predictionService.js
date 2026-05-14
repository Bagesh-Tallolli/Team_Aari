/**
 * Prediction Service
 * Handles AI predictions for malnutrition detection
 * Collects real data, sends to AI model, stores results
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import * as studentModel from '../models/studentModel.js';
import * as analyticsService from './analyticsService.js';
import * as healthStatusModel from '../models/healthStatusModel.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import env from '../config/env.js';

// AI Service configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
const PREDICT_ENDPOINT = `${AI_SERVICE_URL}/predict`;
const AI_TIMEOUT = 5000; // 5 seconds

/**
 * Get required calories based on age (ICMR Standards)
 * @param {number} age - Student age
 * @returns {number} Required calories per day
 */
export const getRequiredCalories = (age) => {
  if (age <= 8) return 1400;
  if (age <= 12) return 1800;
  return 2200;
};

/**
 * Get AI prediction for a student
 * @param {number} studentId - Student ID
 * @param {string} preference - Dietary preference (veg/non_veg)
 * @returns {Promise<object>} AI prediction result
 */
export const getPrediction = async (studentId, preference = 'veg') => {
  try {
    if (!studentId) {
      throw new AppError('Student ID required', HTTP_STATUS.BAD_REQUEST);
    }

    logger.debug(`🔍 Getting AI prediction for student ${studentId}`);

    // Step 1: Get student data from database
    const student = await studentModel.getStudentById(studentId);

    if (!student) {
      logger.warn(`❌ Student not found: ${studentId}`);
      throw new AppError('Student not found', HTTP_STATUS.NOT_FOUND);
    }

    logger.debug(`✅ Student data retrieved: ${student.name}`);

    // Step 2: Get weekly average calories from analytics
    const avgWeeklyCalories = await analyticsService.getWeeklyAverage(studentId);
    logger.debug(`📊 Weekly average calories: ${avgWeeklyCalories}`);

    // Step 3: Prepare data for AI model
    const requiredCalories = getRequiredCalories(student.age);
    
    const aiInput = {
      age: student.age,
      gender: student.gender === 'Female' ? 0 : 1, // 0=Female, 1=Male
      height: parseFloat(student.height),
      weight: parseFloat(student.weight),
      avg_weekly_calories: avgWeeklyCalories,
      preference: preference.toLowerCase()
    };

    logger.debug(`📡 Sending to AI service:`, JSON.stringify(aiInput));

    // Step 4: Call AI service
    let aiResult;
    try {
      const response = await axios.post(PREDICT_ENDPOINT, aiInput, {
        timeout: AI_TIMEOUT
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'AI prediction failed');
      }

      aiResult = response.data;
      logger.info(`✅ AI prediction received: ${aiResult.status} (confidence: ${aiResult.confidence})`);
    } catch (error) {
      logger.error(`❌ AI Service Error Details:`, {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        endpoint: PREDICT_ENDPOINT,
        timeout: AI_TIMEOUT
      });

      if (error.code === 'ECONNREFUSED') {
        logger.error(`❌ AI service connection failed: ${PREDICT_ENDPOINT}`);
        throw new AppError('AI service unavailable', HTTP_STATUS.SERVICE_UNAVAILABLE);
      }
      if (error.response?.status === 400) {
        logger.error(`❌ Invalid input to AI service: ${error.response.data.error}`);
        throw new AppError(error.response.data.error, HTTP_STATUS.BAD_REQUEST);
      }
      logger.error(`❌ AI service error: ${error.message}`);
      throw new AppError('Failed to get AI prediction', HTTP_STATUS.INTERNAL_ERROR);
    }

    // Step 5: Prepare complete prediction data
    const predictionData = {
      student_id: studentId,
      status: aiResult.status,
      confidence: aiResult.confidence,
      bmi: aiResult.analysis.bmi,
      calories: avgWeeklyCalories,
      required_calories: requiredCalories,
      reason: aiResult.reason,
      diet_plan: aiResult.diet_plan,
      analysis: aiResult.analysis,
      probabilities: aiResult.probabilities,
      timestamp: new Date().toISOString()
    };

    logger.debug(`💾 Prepared prediction data for storage`);

    // Step 6: Store prediction in database
    const storedResult = await healthStatusModel.storeAIPrediction(
      studentId,
      predictionData
    );

    logger.info(`✅ Prediction stored successfully for student ${studentId}`);

    return predictionData;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ Prediction error: ${error.message}`);
    throw new AppError('Failed to get prediction', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get batch predictions for all students
 * @returns {Promise<array>} Array of predictions
 */
export const getBatchPredictions = async () => {
  try {
    logger.info(`📊 Starting batch predictions for all students`);

    // Get all students directly from the database model (avoids HTTP + auth)
    const studentsResult = await studentModel.getAllStudents(1, 10000);
    const students = Array.isArray(studentsResult.students) ? studentsResult.students : [];
    const predictions = [];

    // Get prediction for each student
    for (const student of students) {
      try {
        const prediction = await getPrediction(student.id, 'veg');
        predictions.push(prediction);
        
        // Small delay to avoid overwhelming AI service
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.warn(`⚠️  Could not predict for student ${student.id}: ${error.message}`);
        // Continue with next student
      }
    }

    logger.info(`✅ Batch predictions complete: ${predictions.length} students processed`);
    return predictions;
  } catch (error) {
    logger.error(`❌ Batch prediction error: ${error.message}`);
    return [];
  }
};

/**
 * Get prediction summary (for API response)
 * @param {object} prediction - Prediction data
 * @returns {object} Formatted summary for response
 */
export const formatPredictionResponse = (prediction) => {
  if (!prediction) {
    return null;
  }

  return {
    status: prediction.status,
    confidence: prediction.confidence,
    required_calories: prediction.required_calories,
    avg_weekly_calories: prediction.calories,
    deficit_kcal: prediction.required_calories - prediction.calories,
    reason: prediction.reason,
    probabilities: prediction.probabilities,
    diet_plan: prediction.diet_plan,
    timestamp: prediction.timestamp
  };
};

/**
 * Check if prediction needs update (older than 1 day)
 * @param {object} lastPrediction - Last stored prediction
 * @returns {boolean} True if update needed
 */
export const isPredictionStale = (lastPrediction) => {
  if (!lastPrediction || !lastPrediction.created_at) {
    return true;
  }

  const createdTime = new Date(lastPrediction.created_at).getTime();
  const nowTime = new Date().getTime();
  const dayInMs = 24 * 60 * 60 * 1000;

  return (nowTime - createdTime) > dayInMs;
};

export default {
  getRequiredCalories,
  getPrediction,
  getBatchPredictions,
  formatPredictionResponse,
  isPredictionStale
};
