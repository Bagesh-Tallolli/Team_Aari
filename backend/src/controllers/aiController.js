import * as aiService from '../services/aiService.js';
import * as predictionService from '../services/predictionService.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * AI Integration Controller
 * Endpoints for calling AI service predictions
 */

/**
 * POST /api/ai/predict
 * Predict malnutrition status using ML model
 * 
 * Request: { age, bmi, calories, protein }
 * Response: { status, confidence, probabilities, riskLevel }
 */
export const predictMalnutritionStatus = asyncHandler(async (req, res) => {
  const { age, bmi, calories, protein } = req.body;

  const result = await aiService.predictMalnutritionStatus(age, bmi, calories, protein);
  console.log(result);
  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Malnutrition status predicted', HTTP_STATUS.OK)
  );
});

/**
 * POST /api/ai/analyze
 * Comprehensive nutrition analysis
 * Calculates BMI and gets AI prediction
 * 
 * Request: { student_id, age, height, weight, daily_calories, daily_protein }
 * Response: { bmi, status, confidence, riskLevel }
 */
export const analyzeStudent = asyncHandler(async (req, res) => {
  const { student_id, age, height, weight, daily_calories, daily_protein } = req.body;

  // Validate required fields
  if (!age || !height || !weight) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Missing required fields: age, height, weight',
      statusCode: HTTP_STATUS.BAD_REQUEST,
    });
  }
  console.log(result);
  // Calculate BMI
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);

  // Get AI prediction
  const result = await aiService.predictMalnutritionStatus(
    age,
    parseFloat(bmi.toFixed(2)),
    daily_calories || 1800,
    daily_protein || 50
  );

  res.status(HTTP_STATUS.OK).json(
    successResponse(
      {
        student_id,
        age,
        height,
        weight,
        bmi: parseFloat(bmi.toFixed(2)),
        status: result.status,
        confidence: result.confidence,
        riskLevel: result.riskLevel,
        probabilities: result.probabilities,
      },
      'Student analysis completed',
      HTTP_STATUS.OK
    )
  );
});

export default {
  predictMalnutritionStatus,
  analyzeStudent,
};

export const runBatchPredictions = asyncHandler(async (req, res) => {
  const results = await predictionService.getBatchPredictions();
  res.status(HTTP_STATUS.OK).json({ success: true, data: results, message: 'Batch predictions executed' });
});
