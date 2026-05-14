import express from 'express';
import * as dataController from '../controllers/dataController.js';

const router = express.Router();

/**
 * Data Routes
 * Endpoints for fetching and managing nutrition data
 */

/**
 * STUDENTS ROUTES
 */

/**
 * GET /api/data/students
 * Fetch all students
 */
router.get('/students', dataController.getAllStudents);

/**
 * FOOD NUTRITION ROUTES
 */

/**
 * GET /api/data/food
 * Fetch all food nutrition items
 */
router.get('/food', dataController.getAllFood);

/**
 * GET /api/data/food/:foodItem
 * Fetch specific food item
 */
router.get('/food/:foodItem', dataController.getFoodByItem);

/**
 * FOOD LOGS ROUTES
 */

/**
 * GET /api/data/food-log
 * Get all food logs with pagination
 */
router.get('/food-log', dataController.getAllFoodLogs);

/**
 * GET /api/data/food-log/:studentId
 * Get food logs for a specific student
 */
router.get('/food-log/:studentId', dataController.getFoodLogsByStudent);

/**
 * POST /api/data/food-log
 * Create a new food log
 */
router.post('/food-log', dataController.createFoodLog);

/**
 * HEALTH STATUS ROUTES
 */

/**
 * GET /api/data/health
 * Get all health status records
 */
router.get('/health', dataController.getAllHealthStatus);

/**
 * GET /api/data/health/:studentId
 * Get health status for a specific student
 */
router.get('/health/:studentId', dataController.getHealthStatusByStudent);

/**
 * POST /api/data/health
 * Create a new health status record
 */
router.post('/health', dataController.createHealthStatus);

/**
 * DIET PLAN ROUTES
 */

/**
 * GET /api/data/diet-plan
 * Get all diet plans
 */
router.get('/diet-plan', dataController.getAllDietPlans);

/**
 * GET /api/data/diet-plan/:studentId
 * Get diet plan for a specific student
 */
router.get('/diet-plan/:studentId', dataController.getDietPlanByStudent);

/**
 * GET /api/data/ai-diet-recommendations/:studentId
 * Get AI diet recommendations for a student
 */
router.get('/ai-diet-recommendations/:studentId', dataController.getAIDietRecommendations);

export default router;
