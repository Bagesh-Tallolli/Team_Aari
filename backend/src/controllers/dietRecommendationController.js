import dietRecommendationService from '../services/dietRecommendationService.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Diet Recommendation Controller (Phase 5)
 * Handles endpoints for personalized, age-appropriate dietary interventions
 */

/**
 * GET /api/students/:id/diet-recommendation
 * Retrieve the latest personalized diet recommendation plan for a student
 */
export const getRecommendation = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id || req.params.studentId, 10);
  const plan = await dietRecommendationService.getLatestRecommendation(studentId);

  res.status(HTTP_STATUS.OK).json(
    successResponse(plan, 'Personalized diet recommendation retrieved successfully', HTTP_STATUS.OK)
  );
});

/**
 * POST /api/students/:id/diet-recommendation/generate
 * Generate or refresh personalized diet recommendations based on latest verified school servings
 */
export const generateRecommendation = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id || req.params.studentId, 10);
  const options = {
    preference: req.body?.preference,
    forceRefresh: true,
  };

  const plan = await dietRecommendationService.generateDietRecommendation(studentId, options);

  res.status(HTTP_STATUS.OK).json(
    successResponse(plan, 'Personalized diet recommendation generated successfully', HTTP_STATUS.OK)
  );
});

export default {
  getRecommendation,
  generateRecommendation,
};

