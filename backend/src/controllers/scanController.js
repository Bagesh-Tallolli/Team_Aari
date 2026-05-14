import * as scanService from '../services/scanService.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';
import { HARDWARE_MODE } from '../config/env.js';

/**
 * Scan Controller
 * Handles RFID scan processing and food serving decisions
 */

/**
 * POST /api/scan
 * Process RFID scan - identifies student and determines serving size
 * 
 * Fast response endpoint for machine integration
 * Returns: student_id, name, bmi, grams (for rice/main dish)
 * 
 * In HARDWARE_MODE: returns lightweight response only
 * Normal mode: includes AI predictions and detailed analytics
 * 
 * @body { rfid_card_id: string }
 * @returns { success, student_id, name, bmi, grams, message }
 */
export const processScan = asyncHandler(async (req, res) => {
  const { rfid_card_id } = req.body;

  logger.debug(`🔍 RFID scan initiated: ${rfid_card_id} [HARDWARE_MODE: ${HARDWARE_MODE}]`);

  const result = await scanService.processRfidScan(rfid_card_id);

  // In HARDWARE_MODE, return simplified response for ESP32
  if (HARDWARE_MODE) {
    const hardwareResponse = {
      success: true,
      student_id: result.student_id,
      name: result.name,
      grams: result.grams,
      message: 'Dispense food',
    };
    logger.debug(`✅ Scan processed (HARDWARE_MODE): ${result.name} - ${result.grams}g`);
    return res.status(HTTP_STATUS.OK).json(hardwareResponse);
  }

  // Normal mode: comprehensive response for frontend
  logger.debug(`✅ Scan processed for student: ${result.name}`);

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Student scan processed successfully', HTTP_STATUS.OK)
  );
});

/**
 * POST /api/scan/detailed
 * Process RFID scan with detailed meal composition
 * 
 * Comprehensive response for dietary/nutritional data
 * Includes: rice, protein, vegetables with estimated nutrition
 * 
 * @body { rfid_card_id: string }
 * @returns { success, student, meal_composition, nutrition_estimate }
 */
export const processScanDetailed = asyncHandler(async (req, res) => {
  const { rfid_card_id } = req.body;

  logger.debug(`📊 Detailed scan initiated: ${rfid_card_id}`);

  const result = await scanService.processRfidScanDetailed(rfid_card_id);

  logger.debug(`✅ Detailed scan processed for student: ${result.student.name}`);

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Detailed scan processed successfully', HTTP_STATUS.OK)
  );
});

/**
 * POST /api/scan/legacy
 * Legacy endpoint for student_id based scan
 * Kept for backward compatibility
 * 
 * @body { student_id: number }
 * @returns { success, data: { student_id, meal_type, items } }
 */
export const processRfidScan = asyncHandler(async (req, res) => {
  const { student_id } = req.body;

  logger.warn(`⚠️  Legacy scan endpoint used for student_id: ${student_id}`);

  if (!student_id) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'student_id is required',
      statusCode: HTTP_STATUS.BAD_REQUEST,
    });
  }

  const result = await scanService.processRfidScanLegacy(student_id);

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'RFID scan successful', HTTP_STATUS.OK)
  );
});

export default {
  processScan,
  processScanDetailed,
  processRfidScan,
};
