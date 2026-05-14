import express from 'express';
import * as scanController from '../controllers/scanController.js';
import { validate, scanSchemas } from '../middlewares/validationMiddleware.js';

const router = express.Router();

/**
 * RFID Scan Routes
 * Handles RFID card scans for meal serving
 */

/**
 * POST /api/scan
 * Fast RFID scan endpoint - returns student & serving quantity
 * 
 * For machine integration - returns within <100ms
 * 
 * Body: { rfid_card_id: string }
 * Response: { success, student_id, name, bmi, grams }
 */
router.post(
  '/',
  validate(scanSchemas.rfidScan, 'body'),
  scanController.processScan
);

/**
 * POST /api/scan/detailed
 * Detailed RFID scan endpoint - returns complete meal composition
 * 
 * For nutrition/dietary analysis
 * Includes rice, protein, vegetables with nutrition estimates
 * 
 * Body: { rfid_card_id: string }
 * Response: { success, student, meal_composition, nutrition_estimate }
 */
router.post(
  '/detailed',
  validate(scanSchemas.rfidScan, 'body'),
  scanController.processScanDetailed
);

/**
 * POST /api/scan/legacy
 * Legacy endpoint for student_id based scan
 * Kept for backward compatibility
 * 
 * Body: { student_id: number }
 * Response: { success, data: { student_id, meal_type, items } }
 */
router.post(
  '/legacy',
  validate(scanSchemas.studentIdScan, 'body'),
  scanController.processRfidScan
);

export default router;
