import axios from 'axios';
import env from '../config/env.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';
import {
  assessPediatricBmi,
  getSchoolMealTarget,
  getFullDayRequirement,
} from '../config/nutritionStandards.js';

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
export const predictMalnutritionStatus = async (age, bmi, calories, protein, extraParams = {}) => {
  try {
    // Validate inputs
    if (!age || !bmi) {
      throw new AppError('Missing required parameters: age and bmi', HTTP_STATUS.BAD_REQUEST);
    }

    const height_cm = extraParams.height || extraParams.height_cm || 135;
    const height_m = height_cm / 100;
    const weight_kg = extraParams.weight || extraParams.weight_kg || parseFloat((bmi * height_m * height_m).toFixed(1));

    const payload = {
      age: parseFloat(age),
      gender: extraParams.gender ?? 1,
      height: height_cm,
      weight: weight_kg,
      bmi: parseFloat(bmi),
      actual_school_calories_served: parseFloat(calories || 0),
      actual_school_protein_served: parseFloat(protein || 0),
      avg_weekly_calories: parseFloat(calories || 0),
      ...extraParams,
    };

    const targetUrl = `${(env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/analyze\/?$/, '').replace(/\/predict\/?$/, '')}/predict`;
    logger.debug(`📤 Calling AI predict endpoint: ${targetUrl}`, { payload });

    const response = await axios.post(targetUrl, payload, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });

    logger.debug('📥 AI Prediction received', { response: response.data });

    if (!response.data || !response.data.status) {
      throw new AppError('Invalid AI service response', HTTP_STATUS.INTERNAL_ERROR);
    }

    return {
      status: response.data.status,
      confidence: response.data.confidence ?? null,
      probabilities: response.data.probabilities || {},
      pediatric_screening: response.data.pediatric_screening || null,
      contributing_factors: response.data.contributing_factors || [],
      riskLevel: response.data.status === 'Healthy' ? 'low' : (response.data.status === 'At Risk' ? 'medium' : 'high'),
      model_metadata: response.data.model_metadata || {},
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

    // Get AI prediction with full student context
    const prediction = await predictMalnutritionStatus(
      student.age,
      parseFloat(bmi.toFixed(2)),
      totalCalories,
      totalProtein,
      {
        gender: student.gender === 'Female' ? 0 : 1,
        height_cm: parseFloat(student.height),
        weight_kg: parseFloat(student.weight),
        height: parseFloat(student.height),
        weight: parseFloat(student.weight),
      }
    );

    return {
      bmi: parseFloat(bmi.toFixed(2)),
      status: prediction.status,
      riskLevel: prediction.riskLevel,
      confidence: prediction.confidence,
      pediatric_screening: prediction.pediatric_screening,
      contributing_factors: prediction.contributing_factors || [],
      recommendations: prediction.confidence
        ? `AI Screening: ${prediction.status} (Model confidence: ${(prediction.confidence * 100).toFixed(1)}%)`
        : `AI Screening: ${prediction.status}`,
      analysis: prediction.probabilities,
      model_metadata: prediction.model_metadata || {},
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
  const heightInMeters = (student.height || 120) / 100;
  const bmi = parseFloat((student.weight / (heightInMeters * heightInMeters)).toFixed(2));

  // Determine pediatric BMI status using WHO references (screening indicator)
  const pediatric = assessPediatricBmi(student.age, student.gender, bmi);
  const schoolMealTarget = getSchoolMealTarget(student.age);
  const fullDayReq = getFullDayRequirement(student.age, student.gender);

  const status = pediatric.category === 'normal' ? 'Healthy' : (pediatric.category === 'severe_thinness' ? 'Underweight' : 'At Risk');
  const risk = pediatric.riskLevel;

  // Calculate total calories recorded from school food logs today
  const totalCalories = foodLogs.reduce((sum, log) => sum + (parseFloat(log.estimated_calories) || 0), 0);
  const schoolMealGap = Math.max(0, schoolMealTarget.calories - totalCalories);

  let recommendations = '';
  if (totalCalories >= schoolMealTarget.calories) {
    recommendations = `PM POSHAN school meal calorie target (${schoolMealTarget.calories} kcal) achieved.`;
  } else {
    recommendations = `School meal gap: ${schoolMealGap} kcal remaining against PM POSHAN target (${schoolMealTarget.calories} kcal). Full day requirement: ${fullDayReq.calories} kcal.`;
  }

  return {
    bmi,
    pediatric_screening: pediatric,
    school_meal_calories_target: schoolMealTarget.calories,
    full_day_calories_required: fullDayReq.calories,
    actual_school_calories_served: totalCalories,
    school_meal_calorie_gap: schoolMealGap,
    status,
    riskLevel: risk,
    confidence: null,
    model_metadata: {
      model_name: 'DeterministicPediatricFallback',
      validation_status: 'rule_based_screening_indicator',
      disclaimer: 'AI service unavailable; assistive rule-based screening indicator only — not a clinical diagnosis.',
    },
    recommendations,
    analysis: `Pediatric Screening: BMI ${bmi} (${pediatric.label}, WHO 5-19 reference). School meal intake: ${totalCalories} kcal.`,
  };
};

export default {
  analyzeNutrition,
  mockAnalyzeNutrition,
};
