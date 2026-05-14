import express from 'express';
import * as studentController from '../controllers/studentController.js';
import { validate, studentSchemas } from '../middlewares/validationMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Student Routes
 */

/**
 * POST /api/students/register
 * Register a new student with RFID card
 * 
 * Body: { name, age, gender, height, weight, rfid_card_id, email? }
 * Response: { success, data: { student }, message }
 */
router.post(
  '/register',
  validate(studentSchemas.register, 'body'),
  studentController.registerStudent
);

/**
 * GET /api/students
 * List all students with pagination and filtering
 * 
 * Query: { page, limit, search, riskLevel }
 * Response: { success, data: { students, total, page, limit } }
 */
router.get(
  '/',
  authMiddleware,
  studentController.listStudents
);

/**
 * GET /api/students/at-risk
 * Get all at-risk students
 * 
 * Response: { success, data: [] }
 */
router.get(
  '/at-risk',
  authMiddleware,
  studentController.getAtRiskStudents
);

/**
 * GET /api/students/:id/details
 * Get comprehensive student profile with AI predictions and diet recommendations
 * 
 * Params: { id }
 * Response: { success, data: { student, nutrition_analytics, ai_analysis, food_history } }
 */
router.get(
  '/:id/details',
  authMiddleware,
  studentController.getStudentDetails
);

/**
 * GET /api/students/:id
 * Get complete student profile with diet, logs, BMI history
 * 
 * Params: { id }
 * Response: { success, data: { student, diet_plan, food_logs, bmi_history } }
 */
router.get(
  '/:id',
  authMiddleware,
  studentController.getStudentProfile
);

export default router;
