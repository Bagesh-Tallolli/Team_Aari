import * as foodLogService from '../services/foodLogService.js';
import * as studentService from '../services/studentService.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Food Log Controller
 * Handles food logging and nutrition analysis
 */

/**
 * POST /api/food-log
 * Log food intake for a student
 * Triggers AI analysis and alert generation
 * 
 * @body { student_id, food_item, served_grams, protein, calories, carbs, fats }
 * @returns { success, data: { log, analysis, bmi_record, alert }, message }
 */
export const createFoodLog = asyncHandler(async (req, res) => {
  const { student_id, ...logData } = req.body;

  const result = await foodLogService.processNewFoodLog(student_id, logData);

  res.status(HTTP_STATUS.CREATED).json(
    successResponse(result.log, result.message, HTTP_STATUS.CREATED)
  );
});

/**
 * GET /api/food-log/student/:id
 * Get food log history for student
 * 
 * @params { id: student_id }
 * @query { days }
 * @returns { success, data: { logs, summary, bmi_trend }, message }
 */
export const getStudentFoodHistory = asyncHandler(async (req, res) => {
  const { id: studentId } = req.params;
  const { days = 7 } = req.query;

  const result = await foodLogService.getStudentFoodHistory(studentId, parseInt(days, 10));

  res.status(HTTP_STATUS.SUCCESS).json(
    successResponse(result, 'Food history retrieved', HTTP_STATUS.SUCCESS)
  );
});

export default {
  createFoodLog,
  getStudentFoodHistory,
};
