import * as studentModel from '../models/studentModel.js';
import * as foodNutritionModel from '../models/foodNutritionModel.js';
import * as foodLogsModel from '../models/foodLogModel.js';
import * as healthStatusModel from '../models/healthStatusModel.js';
import * as dietPlanModel from '../models/dietPlanModel.js';
import * as aiService from '../services/aiService.js';
import * as dietService from '../services/dietService.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';

/**
 * GET /api/data/students
 * Fetch all students
 */
export const getAllStudents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = null } = req.query;

  const result = await studentModel.getAllStudents(
    parseInt(page, 10),
    parseInt(limit, 10),
    search
  );
  // console.log(result);
  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Students retrieved', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/food
 * Fetch all food nutrition items
 */
export const getAllFood = asyncHandler(async (req, res) => {
  const result = await foodNutritionModel.getAllFoodItems();
  // console.log(result);
  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Food items retrieved', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/food/:foodItem
 * Fetch specific food item nutrition data
 */
export const getFoodByItem = asyncHandler(async (req, res) => {
  const { foodItem } = req.params;
  const result = await foodNutritionModel.getFoodByItem(foodItem);
  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Food item retrieved', HTTP_STATUS.OK)
  );
});

/**
 * POST /api/data/food-log
 * Complete end-to-end flow:
 * 1. Insert food log
 * 2. Calculate nutrition (calories, protein)
 * 3. Get student BMI
 * 4. Call AI for prediction
 * 5. Insert health status
 * 6. Auto-generate diet plan based on AI status
 */
export const createFoodLog = asyncHandler(async (req, res) => {
  const { student_id, food_item, served_grams, timestamp } = req.body;

  logger.debug(`🍽️  Processing food log for student ${student_id}: ${food_item} ${served_grams}g`);

  // Step 1: Insert into food_logs
  const foodLog = await foodLogsModel.createFoodLog({
    student_id,
    food_item,
    served_grams,
    estimated_calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    timestamp: timestamp || new Date().toISOString(),
  });

  logger.debug(`✅ Food log created:`, { id: foodLog?.id });

  // Step 2: Fetch food nutrition data
  let caloriesPerServing = 0;
  let proteinPerServing = 0;

  try {
    const foodNutrition = await foodNutritionModel.getFoodByItem(food_item);
    if (foodNutrition && foodNutrition.length > 0) {
      const nutrition = foodNutrition[0];
      caloriesPerServing = (served_grams / 100) * (nutrition.calories_per_100g || 0);
      proteinPerServing = (served_grams / 100) * (nutrition.protein_per_100g || 0);
      logger.debug(`📊 Nutrition calculated: ${caloriesPerServing}cal, ${proteinPerServing}g protein`);
    }
  } catch (error) {
    logger.warn(`⚠️  Could not fetch nutrition data for ${food_item}`, { error: error.message });
  }

  // Step 3: Fetch student and calculate BMI
  let studentBmi = 20; // default
  let studentAge = 12; // default

  try {
    const student = await studentModel.getStudentById(student_id);
    if (student) {
      studentAge = student.age || 12;
      if (student.height && student.weight) {
        const heightInMeters = student.height / 100;
        studentBmi = student.weight / (heightInMeters * heightInMeters);
        logger.debug(`📏 Student BMI calculated: ${studentBmi.toFixed(2)}`);
      }
    }
  } catch (error) {
    logger.warn(`⚠️  Could not fetch student data`, { error: error.message });
  }

  // Step 4: Call AI service for prediction
  let aiPrediction = null;
  try {
    aiPrediction = await aiService.predictMalnutritionStatus(
      studentAge,
      parseFloat(studentBmi.toFixed(2)),
      caloriesPerServing || 1800,
      proteinPerServing || 50
    );
    logger.debug(`🤖 AI Prediction: ${aiPrediction.status} (${(aiPrediction.confidence * 100).toFixed(0)}%)`);
  } catch (error) {
    logger.error(`❌ AI prediction failed:`, { error: error.message });
  }

  // Step 5: Insert health status with AI prediction
  let healthStatus = null;
  try {
    healthStatus = await healthStatusModel.createHealthStatus({
      student_id,
      bmi: parseFloat(studentBmi.toFixed(2)),
      calories: parseFloat(caloriesPerServing.toFixed(2)),
      protein: parseFloat(proteinPerServing.toFixed(2)),
      status: aiPrediction?.status || 'Unknown',
    });
    logger.debug(`✅ Health status created:`, { id: healthStatus[0]?.id });
  } catch (error) {
    logger.warn(`⚠️  Could not create health status`, { error: error.message });
  }

  // Step 6: Auto-generate diet plan based on AI status
  let dietPlan = null;
  if (aiPrediction?.status) {
    try {
      dietPlan = await dietService.upsertDietPlan(student_id, aiPrediction.status);
      logger.debug(`✅ Diet plan auto-generated: ${aiPrediction.status}`);
    } catch (error) {
      logger.warn(`⚠️  Could not auto-generate diet plan`, { error: error.message });
    }
  }

  // Return complete flow response
  res.status(HTTP_STATUS.CREATED).json(
    successResponse(
      {
        food_log: foodLog,
        health_status: healthStatus || null,
        ai_prediction: aiPrediction,
        diet_plan: dietPlan,
        flow_status: 'Complete',
      },
      'Food log processed - AI prediction & diet plan updated',
      HTTP_STATUS.CREATED
    )
  );
});

/**
 * GET /api/food-log
 * Get all food logs with pagination
 */
export const getAllFoodLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const result = await foodLogsModel.getAllFoodLogs(
    parseInt(page, 10),
    parseInt(limit, 10)
  );
  console.log(result);
  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Food logs retrieved', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/food-log/:studentId
 * Get food logs for a specific student
 */
export const getFoodLogsByStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { limit = 50 } = req.query;

  const result = await foodLogsModel.getFoodLogsByStudentId(
    parseInt(studentId, 10),
    parseInt(limit, 10)
  );

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Student food logs retrieved', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/health
 * Get all health status records
 */
export const getAllHealthStatus = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const result = await healthStatusModel.getAllHealthStatus(
    parseInt(page, 10),
    parseInt(limit, 10)
  );
  console.log(result);
  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Health status retrieved', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/health/:studentId
 * Get health status for a specific student with AI insights
 */
export const getHealthStatusByStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const result = await healthStatusModel.getHealthStatusByStudentId(
    parseInt(studentId, 10)
  );

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Student health status retrieved', HTTP_STATUS.OK)
  );
});

/**
 * POST /api/health
 * Create a new health status record with AI prediction
 */
export const createHealthStatus = asyncHandler(async (req, res) => {
  const { student_id, bmi, calories, protein, status } = req.body;

  // Get student data to fetch age
  let studentAge = 12; // default
  try {
    const student = await studentModel.getStudentById(student_id);
    if (student) {
      studentAge = student.age || 12;
    }
  } catch (error) {
    logger.warn(`Could not fetch student age for ID ${student_id}`, { error: error.message });
  }

  // Get AI prediction for this data
  let aiPrediction = null;
  try {
    aiPrediction = await aiService.predictMalnutritionStatus(
      studentAge,
      bmi,
      calories || 1800,
      protein || 50
    );
  } catch (error) {
    logger.warn('AI prediction failed, using provided status', { error: error.message });
  }

  const result = await healthStatusModel.createHealthStatus({
    student_id,
    bmi,
    calories,
    protein,
    status: aiPrediction?.status || status || 'Unknown',
  });

  res.status(HTTP_STATUS.CREATED).json(
    successResponse(
      {
        ...result,
        ai_prediction: aiPrediction,
      },
      'Health status created successfully with AI analysis',
      HTTP_STATUS.CREATED
    )
  );
});

/**
 * GET /api/diet-plan
 * Get all diet plans
 */
export const getAllDietPlans = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const result = await dietPlanModel.getAllDietPlans(
    parseInt(page, 10),
    parseInt(limit, 10)
  );

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Diet plans retrieved', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/diet-plan/:studentId
 * Get diet plan for a specific student
 */
export const getDietPlanByStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const result = await dietPlanModel.getDietPlanByStudentId(
    parseInt(studentId, 10)
  );

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Student diet plan retrieved', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/data/ai-diet-recommendations/:studentId
 * Get AI diet recommendations for a student based on latest AI prediction
 */
export const getAIDietRecommendations = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const prediction = await healthStatusModel.getCompleteAIPrediction(
    parseInt(studentId, 10)
  );

  if (!prediction || !prediction.diet_plan) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      successResponse(null, 'No AI diet recommendations found for this student', HTTP_STATUS.NOT_FOUND)
    );
  }

  res.status(HTTP_STATUS.OK).json(
    successResponse({
      student_id: prediction.student_id,
      nutrition_status: prediction.status,
      confidence: prediction.confidence,
      reason: prediction.reason,
      required_calories: prediction.required_calories,
      avg_weekly_calories: prediction.avg_weekly_calories,
      calorie_deficit: (prediction.required_calories || 0) - (prediction.avg_weekly_calories || 0),
      diet_plan: prediction.diet_plan,
      analysis: prediction.analysis,
      created_at: prediction.created_at
    }, 'AI diet recommendations retrieved', HTTP_STATUS.OK)
  );
});

export default {
  getAllFood,
  getFoodByItem,
  createFoodLog,
  getAllFoodLogs,
  getFoodLogsByStudent,
  getAllHealthStatus,
  getHealthStatusByStudent,
  createHealthStatus,
  getAllDietPlans,
  getDietPlanByStudent,
  getAIDietRecommendations,
};
