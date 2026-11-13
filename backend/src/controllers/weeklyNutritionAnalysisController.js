import weeklyNutritionAnalysisService from '../services/weeklyNutritionAnalysisService.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Weekly Nutrition Analysis Controller (Phase 6)
 * Handles endpoints for 7-day student-specific nutritional monitoring and reporting
 */

/**
 * GET /api/students/:id/weekly-analysis
 * Retrieve latest weekly report (generates or uses cached report)
 */
export const getWeeklyAnalysis = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id || req.params.studentId, 10);
  const options = {
    forceRefresh: req.query.forceRefresh === 'true',
    endDate: req.query.endDate,
  };

  const report = await weeklyNutritionAnalysisService.generateWeeklyAnalysis(studentId, options);

  res.status(HTTP_STATUS.OK).json(
    successResponse(report, 'Weekly nutrition analysis retrieved successfully', HTTP_STATUS.OK)
  );
});

/**
 * POST /api/students/:id/weekly-analysis/generate
 * Generate or refresh weekly analysis report
 */
export const generateWeeklyAnalysis = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id || req.params.studentId, 10);
  const options = {
    forceRefresh: true,
    endDate: req.body?.endDate,
  };

  const report = await weeklyNutritionAnalysisService.generateWeeklyAnalysis(studentId, options);

  res.status(HTTP_STATUS.OK).json(
    successResponse(report, 'Weekly nutrition report generated successfully', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/weekly-analysis/:reportId
 * Retrieve specific saved report by ID
 */
export const getReportById = asyncHandler(async (req, res) => {
  const reportId = parseInt(req.params.reportId, 10);
  const report = await weeklyNutritionAnalysisService.getWeeklyAnalysisById(reportId);

  res.status(HTTP_STATUS.OK).json(
    successResponse(report, 'Weekly nutrition report retrieved successfully', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/weekly-analysis/:reportId/trends
 * Retrieve week-over-week trend data for a report
 */
export const getReportTrends = asyncHandler(async (req, res) => {
  const reportId = parseInt(req.params.reportId, 10);
  const trends = await weeklyNutritionAnalysisService.getWeeklyTrends(reportId);

  res.status(HTTP_STATUS.OK).json(
    successResponse(trends, 'Weekly nutrition trends retrieved successfully', HTTP_STATUS.OK)
  );
});

export default {
  getWeeklyAnalysis,
  generateWeeklyAnalysis,
  getReportById,
  getReportTrends,
};

