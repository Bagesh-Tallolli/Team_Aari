/**
 * Serving Rules & Nutrition Allocation Service
 * Determines planned portions and nutrition benchmarks according to:
 * 1. PM POSHAN (Mid-Day Meal) Mandated Norms:
 *    - Primary (Class I-V, age <= 10): 100g grain allocation -> 450 kcal, 12g protein
 *    - Upper Primary (Class VI-VIII, age > 10): 150g grain allocation -> 700 kcal, 20g protein
 * 2. ICMR - NIN 2020 RDA for full-day energy and protein requirements
 * 3. Verified nutrient calculations based strictly on actual measured weight
 */

import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import {
  getSchoolMealTarget,
  getFullDayRequirement,
  calculateServedNutrients,
  VERIFIED_FOOD_COMPOSITION,
} from '../config/nutritionStandards.js';

/**
 * Get grain (rice) portion allocation in grams based on PM POSHAN school grade / age
 * @param {number} age - Student age in years
 * @returns {number} Recommended rice allocation in grams
 */
export const getRiceGrams = (age) => {
  try {
    const numericAge = Number(age);
    if (!numericAge || numericAge < 0) {
      throw new AppError('Invalid age provided', HTTP_STATUS.BAD_REQUEST);
    }

    if (numericAge <= 10) {
      return 100; // Primary: 100g rice allocation
    } else if (numericAge <= 14) {
      return 150; // Upper Primary: 150g rice allocation
    } else {
      return 150; // Senior / adolescent allocation
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to calculate serving size', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get planned dal / protein portion based on school category
 * @param {number} age - Student age
 * @returns {number} Dal portion in grams
 */
export const getProteinGrams = (riskLevel, age) => {
  try {
    const numericAge = Number(age) || 10;
    // PM POSHAN standard pulses: 20g raw (~60g cooked) primary, 30g raw (~90g cooked) upper primary
    const baseGrams = numericAge <= 10 ? 60 : 90;

    switch (riskLevel?.toLowerCase()) {
      case 'critical':
        return Math.round(baseGrams * 1.3);
      case 'at_risk':
        return Math.round(baseGrams * 1.15);
      case 'healthy':
      default:
        return baseGrams;
    }
  } catch (error) {
    throw new AppError('Failed to calculate protein serving', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get planned vegetable portion based on school category
 * @param {number} age - Student age
 * @returns {number} Vegetable portion in grams
 */
export const getVegetablesGrams = (age) => {
  try {
    const numericAge = Number(age) || 10;
    // PM POSHAN vegetables: 50g primary, 75g upper primary
    return numericAge <= 10 ? 50 : 75;
  } catch (error) {
    throw new AppError('Failed to calculate vegetable serving', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Calculate nutrients from actual measured grams of a served food item
 * @param {string} foodItem - Name of item (e.g. 'rice', 'dal', 'vegetables')
 * @param {number} measuredGrams - Measured weight from hardware scale
 * @returns {object} Nutrients (calories, protein, carbs, fats)
 */
export const calculateMeasuredNutrients = (foodItem, measuredGrams) => {
  return calculateServedNutrients(foodItem, measuredGrams);
};

/**
 * Get nutritional benchmarks for a student
 * Returns separate full-day requirement and school-meal target
 * 
 * @param {object} student - { age, gender }
 * @returns {object} { school_meal_target, full_day_requirement }
 */
export const getStudentNutritionBenchmarks = (student) => {
  const age = student.age || 10;
  const gender = student.gender || 'Male';

  return {
    school_meal_target: getSchoolMealTarget(age),
    full_day_requirement: getFullDayRequirement(age, gender),
  };
};

/**
 * Get planned complete meal allocation guideline
 * @param {object} student - Student profile
 * @returns {object} Planned portions breakdown
 */
export const getMealComposition = (student) => {
  try {
    if (!student || !student.age) {
      throw new AppError('Invalid student data', HTTP_STATUS.BAD_REQUEST);
    }

    const rice = getRiceGrams(student.age);
    const protein = getProteinGrams(student.risk_level, student.age);
    const vegetables = getVegetablesGrams(student.age);
    const totalGrams = rice + protein + vegetables;

    return {
      rice: {
        grams: rice,
        item: 'Cooked Rice',
      },
      protein: {
        grams: protein,
        item: 'Dal / Sambar',
      },
      vegetables: {
        grams: vegetables,
        item: 'Cooked Mixed Vegetables',
      },
      total: totalGrams,
      breakdown: {
        rice_percent: Math.round((rice / totalGrams) * 100),
        protein_percent: Math.round((protein / totalGrams) * 100),
        vegetables_percent: Math.round((vegetables / totalGrams) * 100),
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to calculate meal composition', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  getRiceGrams,
  getProteinGrams,
  getVegetablesGrams,
  calculateMeasuredNutrients,
  getStudentNutritionBenchmarks,
  getMealComposition,
};
