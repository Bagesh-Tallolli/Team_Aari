import Joi from 'joi';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';

/**
 * Validation Middleware Generator
 * Creates middleware that validates request body/params against Joi schema
 * 
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} target - What to validate: 'body', 'params', 'query'
 * @returns {Function} Express middleware
 * 
 * @example
 * const loginSchema = Joi.object({
 *   email: Joi.string().email().required(),
 *   password: Joi.string().min(6).required(),
 * });
 * router.post('/login', validate(loginSchema, 'body'), controller);
 */
export const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[target] || {};

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn(`Validation error on ${target}:`, errors);

      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Validation Error',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        errors,
      });
    }

    // Replace request data with validated value
    req[target] = value;
    next();
  };
};

/**
 * Validation Schemas
 */

// ============ AUTH SCHEMAS ============
export const authSchemas = {
  signup: Joi.object({
    email: Joi.string().email().lowercase().required().messages({
      'string.email': 'Email must be valid',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required',
    }),
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required',
    }),
    role: Joi.string().valid('admin', 'staff').optional().default('staff'),
  }),
  login: Joi.object({
    email: Joi.string().email().lowercase().required().messages({
      'string.email': 'Email must be valid',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required',
    }),
  }),
};

// ============ SCAN SCHEMAS ============
export const scanSchemas = {
  rfidScan: Joi.object({
    rfid_card_id: Joi.string().max(100).required().messages({
      'string.max': 'RFID card ID must not exceed 100 characters',
      'any.required': 'RFID card ID is required',
    }),
  }),
  studentIdScan: Joi.object({
    student_id: Joi.number().integer().positive().required().messages({
      'number.base': 'student_id must be a number',
      'any.required': 'student_id is required',
    }),
  }),
};

// ============ FOOD LOG SCHEMAS ============
export const foodLogSchemas = {
  createLog: Joi.object({
    student_id: Joi.number().integer().positive().required(),
    food_item: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Food item name must be at least 2 characters',
      'string.max': 'Food item name must not exceed 100 characters',
      'any.required': 'Food item is required',
    }),
    served_grams: Joi.number().positive().precision(2).required().messages({
      'number.base': 'served_grams must be a number',
      'number.positive': 'served_grams must be positive',
      'any.required': 'served_grams is required',
    }),
    protein: Joi.number().min(0),
    calories: Joi.number().min(0),
    carbs: Joi.number().min(0),
    fats: Joi.number().min(0),
  }),
};

// ============ STUDENT SCHEMAS ============
export const studentSchemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required',
    }),
    age: Joi.number().integer().min(5).max(20).required().messages({
      'number.base': 'Age must be a number',
      'number.min': 'Age must be at least 5',
      'number.max': 'Age must not exceed 20',
      'any.required': 'Age is required',
    }),
    gender: Joi.string().valid('Male', 'Female', 'Other').required().messages({
      'any.only': 'Gender must be Male, Female, or Other',
      'any.required': 'Gender is required',
    }),
    height: Joi.number().precision(2).min(80).max(200).required().messages({
      'number.base': 'Height must be a number (in cm)',
      'number.min': 'Height must be at least 80 cm',
      'number.max': 'Height must not exceed 200 cm',
      'any.required': 'Height is required',
    }),
    weight: Joi.number().precision(2).min(10).max(150).required().messages({
      'number.base': 'Weight must be a number (in kg)',
      'number.min': 'Weight must be at least 10 kg',
      'number.max': 'Weight must not exceed 150 kg',
      'any.required': 'Weight is required',
    }),
    rfid_card_id: Joi.string().max(100).required().messages({
      'string.max': 'RFID card ID must not exceed 100 characters',
      'any.required': 'RFID card ID is required',
    }),
    email: Joi.string().email().lowercase().optional().allow(null),
  }),
  getStudent: Joi.object({
    id: Joi.number().integer().positive().required().messages({
      'number.base': 'Student ID must be a number',
      'any.required': 'Student ID is required',
    }),
  }),
};

// ============ ALERT SCHEMAS ============
export const alertSchemas = {
  getAlerts: Joi.object({
    risk_level: Joi.string().valid('healthy', 'at_risk', 'critical'),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }),
};

// ============ DASHBOARD SCHEMAS ============
export const dashboardSchemas = {
  getDashboard: Joi.object({
    time_range: Joi.string().valid('today', 'week', 'month'),
  }),
};
