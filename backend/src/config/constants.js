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

// School Meal Norms (PM POSHAN Statutory Guidelines)
export const PM_POSHAN_TARGETS = {
  PRIMARY: { calories: 450, protein: 12.0 },
  UPPER_PRIMARY: { calories: 700, protein: 20.0 },
};

// Full-Day Reference Nutrition Targets (ICMR-NIN 2020 RDA)
export const NUTRITION_TARGETS = {
  PRIMARY_DAILY_CALORIES: 1500,
  UPPER_PRIMARY_DAILY_CALORIES: 2200,
  PROTEIN_GRAMS: 32,
  CALORIES: 1800,
  CARBS_GRAMS: 250,
  FATS_GRAMS: 45,
};

// Alert Thresholds (Evaluated against school-meal targets, not 24h intake)
export const ALERT_THRESHOLDS = {
  // School-meal deficit threshold
  SCHOOL_MEAL_CALORIE_DEFICIT_THRESHOLD: 200, // Deficit > 200 kcal against PM POSHAN target is concerning
  SCHOOL_MEAL_PROTEIN_DEFICIT_THRESHOLD: 6,   // Deficit > 6g protein is concerning

  // BMI based
  BMI_UNDERWEIGHT_THRESHOLD: 18.5,
  BMI_OBESE_THRESHOLD: 30,

  // Nutrition based
  CALORIE_DEFICIT_THRESHOLD: 1500, // Less than this is critical
  CALORIE_EXCESS_THRESHOLD: 2500,  // More than this is concerning
  PROTEIN_DEFICIT_THRESHOLD: 40,   // Less than this is concerning
};
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
