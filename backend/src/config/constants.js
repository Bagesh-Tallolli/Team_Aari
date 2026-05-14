/**
 * Application Constants
 * Centralized configuration for business logic and validation rules
 */

// Risk Levels
export const RISK_LEVELS = {
  HEALTHY: 'healthy',
  AT_RISK: 'at_risk',
  CRITICAL: 'critical',
};

// BMI Categories
export const BMI_CATEGORIES = {
  UNDERWEIGHT: 'underweight',
  NORMAL: 'normal',
  OVERWEIGHT: 'overweight',
  OBESE: 'obese',
};

// Daily Nutrition Targets (per student)
export const NUTRITION_TARGETS = {
  PROTEIN_GRAMS: 50,
  CALORIES: 2000,
  CARBS_GRAMS: 300,
  FATS_GRAMS: 65,
};

// BMI Thresholds for Risk Detection
export const BMI_THRESHOLDS = {
  UNDERWEIGHT: 18.5,
  NORMAL_MAX: 24.9,
  OVERWEIGHT_MAX: 29.9,
  OBESE_MIN: 30,
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Default Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// JWT
export const JWT = {
  ALGORITHM: 'HS256',
  REFRESH_EXPIRY: '30d',
};

// Alert Thresholds
export const ALERT_THRESHOLDS = {
  // BMI based
  BMI_UNDERWEIGHT_THRESHOLD: 18.5,
  BMI_OBESE_THRESHOLD: 30,
  
  // Nutrition based
  CALORIE_DEFICIT_THRESHOLD: 1500, // Less than this is critical
  CALORIE_EXCESS_THRESHOLD: 2500,  // More than this is concerning
  PROTEIN_DEFICIT_THRESHOLD: 40,   // Less than this is concerning
};

// Common Error Messages
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'Unauthorized access',
  STUDENT_NOT_FOUND: 'Student not found',
  DIET_PLAN_NOT_FOUND: 'Diet plan not found',
  FOOD_LOG_NOT_FOUND: 'Food log not found',
  ALERT_NOT_FOUND: 'Alert not found',
  INVALID_INPUT: 'Invalid input data',
  DATABASE_ERROR: 'Database error occurred',
  AI_SERVICE_ERROR: 'AI service is unavailable',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  SCAN_SUCCESS: 'Scan processed successfully',
  LOG_CREATED: 'Food log created successfully',
  STUDENT_RETRIEVED: 'Student data retrieved',
  DASHBOARD_RETRIEVED: 'Dashboard data retrieved',
  ALERTS_RETRIEVED: 'Alerts retrieved',
};
