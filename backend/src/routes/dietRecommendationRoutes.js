import express from 'express';
import dietRecommendationController from '../controllers/dietRecommendationController.js';

const router = express.Router();

/**
 * Diet Recommendation Routes (Phase 5)
 * Personalized, age-appropriate dietary gap interventions
 */

// GET /api/diet-recommendations/:studentId
router.get('/:studentId', dietRecommendationController.getRecommendation);

// POST /api/diet-recommendations/:studentId/generate
router.post('/:studentId/generate', dietRecommendationController.generateRecommendation);

export default router;

