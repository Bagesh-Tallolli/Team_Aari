import * as studentService from '../services/studentService.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Student Controller
 * Handles student data retrieval and management
 */

/**
 * POST /api/students/register
 * Register a new student with RFID card integration
 * 
 * @body { name, age, gender, height, weight, rfid_card_id, email? }
 * @returns { success, student, message }
 */
export const registerStudent = asyncHandler(async (req, res) => {
  const { name, age, gender, height, weight, rfid_card_id, email } = req.body;

  const student = await studentService.registerStudent({
    name,
    age,
    gender,
    height,
    weight,
    rfid_card_id,
    email,
  });

  res.status(HTTP_STATUS.CREATED).json(
    successResponse(student, 'Student registered successfully', HTTP_STATUS.CREATED)
  );
});

/**
 * GET /api/students
 * List all students with pagination and filtering
 * 
 * @query { page, limit, search, riskLevel }
 * @returns { success, data: { students, total, page, limit }, message }
 */
export const listStudents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = null, riskLevel = null } = req.query;

  const result = await studentService.listStudents(
    parseInt(page, 10),
    parseInt(limit, 10),
    search,
    riskLevel
  );

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Students retrieved', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/students/:id
 * Get complete student profile with diet, food logs, BMI history
 * 
 * @params { id: student_id }
 * @returns { success, data: { student, diet_plan, food_logs, bmi_history }, message }
 */
export const getStudentProfile = asyncHandler(async (req, res) => {
  const { id: studentId } = req.params;

  const result = await studentService.getStudentProfile(parseInt(studentId, 10));

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Student profile retrieved', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/students/:id/details
 * Get comprehensive student profile with AI predictions and diet recommendations
 * Enhanced version with health_status (AI analysis)
 * 
 * @params { id: student_id }
 * @returns { success, data: { student, nutrition_analytics, ai_analysis, food_history }, message }
 */
export const getStudentDetails = asyncHandler(async (req, res) => {
  const { id: studentId } = req.params;

  const result = await studentService.getComprehensiveStudentProfile(parseInt(studentId, 10));

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Comprehensive student profile retrieved', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/students/at-risk
 * Get all students at risk
 * 
 * @returns { success, data: [], message }
 */
export const getAtRiskStudents = asyncHandler(async (req, res) => {
  const result = await studentService.getAtRiskStudents();

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'At-risk students retrieved', HTTP_STATUS.OK)
  );
});

export default {
  registerStudent,
  listStudents,
  getStudentProfile,
  getStudentDetails,
  getAtRiskStudents,
};
