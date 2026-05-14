import express from 'express';
import * as aiController from '../controllers/aiController.js';

const router = express.Router();

/**
 * AI Service Routes
 */

/**
 * POST /api/ai/predict
 * Predict malnutrition status using ML model
 */
router.post('/predict', aiController.predictMalnutritionStatus);

/**
 * POST /api/ai/analyze
 * Comprehensive student nutrition analysis
 */
router.post('/analyze', aiController.analyzeStudent);

// Trigger batch predictions for all students
router.post('/batch', aiController.runBatchPredictions);

export default router;
