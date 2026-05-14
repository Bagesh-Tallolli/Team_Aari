import express from 'express';
import * as foodLogController from '../controllers/foodLogController.js';
import { validate, foodLogSchemas } from '../middlewares/validationMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Food Log Routes
 */

/**
 * POST /api/food-log
 * Create food log entry
 * Triggers AI analysis and alert generation
 * 
 * Body: { student_id, food_item, served_grams, [protein, calories, carbs, fats] }
 * Response: { success, data: { log, analysis, bmi_record, alert } }
 */
router.post(
  '/',
  authMiddleware,
  validate(foodLogSchemas.createLog, 'body'),
  foodLogController.createFoodLog
);

/**
 * GET /api/food-log/student/:id
 * Get food log history for student
 * 
 * Query: { days }
 * Response: { success, data: { logs, summary, bmi_trend } }
 */
router.get(
  '/student/:id',
  authMiddleware,
  foodLogController.getStudentFoodHistory
);

export default router;
