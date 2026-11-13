import express from 'express';
import * as weeklyController from '../controllers/weeklyNutritionAnalysisController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Phase 6: Weekly Nutrition Analysis Routes
 * Prefix: /api/weekly-analysis
 */

// Retrieve specific report by ID
router.get(
  '/:reportId(\\d+)',
  authMiddleware,
  weeklyController.getReportById
);

// Retrieve trends for a specific report
router.get(
  '/:reportId(\\d+)/trends',
  authMiddleware,
  weeklyController.getReportTrends
);

// Student-specific shortcut routes
router.get(
  '/student/:id',
  authMiddleware,
  weeklyController.getWeeklyAnalysis
);

router.post(
  '/student/:id/generate',
  authMiddleware,
  weeklyController.generateWeeklyAnalysis
);

export default router;

