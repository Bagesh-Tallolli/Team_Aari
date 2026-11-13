import express from 'express';
import * as studentController from '../controllers/studentController.js';
import * as dietRecommendationController from '../controllers/dietRecommendationController.js';
import * as weeklyNutritionAnalysisController from '../controllers/weeklyNutritionAnalysisController.js';
import * as parentDeliveryController from '../controllers/parentReportDeliveryController.js';
import { validate, studentSchemas } from '../middlewares/validationMiddleware.js';
import { authMiddleware, authorizeRoles } from '../middlewares/authMiddleware.js';

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

/**
 * Interactive Malnutrition Risk & Clinical Prediction Routes
 * Takes new height, weight, and average weekly calories to predict malnutrition and clinical medical conditions
 */
router.post(
  '/predict-malnutrition',
  authMiddleware,
  studentController.predictMalnutrition
);

router.post(
  '/:id/predict-malnutrition',
  authMiddleware,
  studentController.predictMalnutrition
);

/**
 * Phase 5: Personalized Diet Recommendation Routes
 */
router.get(
  '/:id/diet-recommendation',
  authMiddleware,
  dietRecommendationController.getRecommendation
);

router.post(
  '/:id/diet-recommendation/generate',
  authMiddleware,
  dietRecommendationController.generateRecommendation
);

/**
 * Phase 6: Weekly AI-Based Nutrition Analysis Routes
 */
router.get(
  '/:id/weekly-analysis',
  authMiddleware,
  weeklyNutritionAnalysisController.getWeeklyAnalysis
);

router.post(
  '/:id/weekly-analysis/generate',
  authMiddleware,
  weeklyNutritionAnalysisController.generateWeeklyAnalysis
);

/**
 * Phase 7: Parent Weekly Nutrition Report & Email Delivery Routes
 */
router.get(
  '/:id/parent-contact',
  authMiddleware,
  parentDeliveryController.getParentContact
);

router.put(
  '/:id/parent-contact',
  authMiddleware,
  authorizeRoles('admin', 'staff'),
  validate(studentSchemas.updateParentContact, 'body'),
  parentDeliveryController.updateParentContact
);

router.post(
  '/:id/parent-contact/send-verification',
  authMiddleware,
  authorizeRoles('admin', 'staff'),
  parentDeliveryController.sendVerificationEmail
);

router.post(
  '/:id/parent-contact/verify-otp',
  authMiddleware,
  authorizeRoles('admin', 'staff'),
  parentDeliveryController.verifyOtp
);

router.post(
  '/:id/parent-contact/withdraw-consent',
  authMiddleware,
  authorizeRoles('admin', 'staff'),
  parentDeliveryController.withdrawConsent
);

router.get(
  '/:id/parent-contact/consent-history',
  authMiddleware,
  authorizeRoles('admin', 'staff'),
  parentDeliveryController.getConsentHistory
);

router.get(
  '/:id/weekly-report/preview',
  authMiddleware,
  authorizeRoles('admin', 'staff'),
  parentDeliveryController.previewWeeklyReport
);

router.post(
  '/:id/weekly-report/send',
  authMiddleware,
  authorizeRoles('admin', 'staff'),
  parentDeliveryController.sendWeeklyReport
);

router.get(
  '/:id/weekly-report/delivery-history',
  authMiddleware,
  authorizeRoles('admin', 'staff'),
  parentDeliveryController.getDeliveryHistory
);

router.get(
  '/:id/weekly-report/pdf',
  authMiddleware,
  authorizeRoles('admin', 'staff'),
  parentDeliveryController.downloadReportPdf
);

/**
 * Malnutrition Assessment PDF Report & Parent Email Delivery Routes
 */
router.post(
  '/:id/malnutrition-report/send',
  authMiddleware,
  parentDeliveryController.sendMalnutritionReportToParent
);

router.get(
  '/:id/malnutrition-report/pdf',
  authMiddleware,
  parentDeliveryController.downloadMalnutritionReportPdf
);

export default router;
