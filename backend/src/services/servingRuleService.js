/**
 * Serving Rules Service
 * Determines rice/food quantities based on student profile
 * 
 * Rules are based on age, BMI, and nutritional requirements
 */

import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Get rice serving size in grams based on student age
 * 
 * Rules:
 * - age <= 8 → 100g
 * - age <= 12 → 150g
 * - age > 12 → 150g
 * 
 * @param {number} age - Student age in years
 * @returns {number} Rice serving in grams
 */
export const getRiceGrams = (age) => {
  try {
    if (!age || age < 0) {
      throw new AppError('Invalid age provided', HTTP_STATUS.BAD_REQUEST);
    }

    if (age <= 8) {
      return 100; // Younger children: 100g
    } else if (age <= 12) {
      return 150; // Middle age: 150g
    } else {
      return 150; // Older students: 150g
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to calculate serving size', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get protein side dish serving based on risk level and age
 * 
 * @param {string} riskLevel - Student risk level (healthy, at_risk, critical)
 * @param {number} age - Student age
 * @returns {number} Protein serving in grams
 */
export const getProteinGrams = (riskLevel, age) => {
  try {
    // Base protein requirements
    let baseProtein = age <= 8 ? 30 : age <= 12 ? 40 : 50;

    // Adjust for risk level
    switch (riskLevel?.toLowerCase()) {
      case 'critical':
        return baseProtein * 1.5; // Extra protein for malnourished
      case 'at_risk':
        return baseProtein * 1.25; // Moderate increase
      case 'healthy':
      default:
        return baseProtein; // Standard serving
    }
  } catch (error) {
    throw new AppError('Failed to calculate protein serving', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get vegetables/side dish serving based on age and BMI
 * 
 * @param {number} age - Student age
 * @param {number} bmi - Student BMI
 * @returns {number} Vegetables serving in grams
 */
export const getVegetablesGrams = (age, bmi) => {
  try {
    // Standard vegetable serving: 80-100g
    if (age <= 8) {
      return 80;
    } else if (age <= 12) {
      return 100;
    } else {
      return 120; // Slightly more for older students
    }
  } catch (error) {
    throw new AppError('Failed to calculate vegetable serving', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get complete meal composition
 * 
 * @param {object} student - Student object { age, bmi, risk_level }
 * @returns {object} Complete meal breakdown
 */
export const getMealComposition = (student) => {
  try {
    if (!student || !student.age) {
      throw new AppError('Invalid student data', HTTP_STATUS.BAD_REQUEST);
    }

    const rice = getRiceGrams(student.age);
    const protein = getProteinGrams(student.risk_level, student.age);
    const vegetables = getVegetablesGrams(student.age, student.current_bmi);
    const totalGrams = rice + protein + vegetables;

    return {
      rice: {
        grams: rice,
        item: 'Rice/Wheat',
      },
      protein: {
        grams: Math.round(protein),
        item: 'Dal/Paneer/Egg',
      },
      vegetables: {
        grams: vegetables,
        item: 'Mixed Vegetables',
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

/**
 * Get nutritional info for calculated serving
 * 
 * @param {object} student - Student object
 * @returns {object} Estimated nutritional values
 */
export const getEstimatedNutrition = (student) => {
  try {
    const meal = getMealComposition(student);
    const riceGrams = meal.rice.grams;
    const proteinGrams = meal.protein.grams;
    const vegGrams = meal.vegetables.grams;

    // Approximate nutritional values per 100g
    const nutritionPer100 = {
      rice: { cal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
      dal: { cal: 120, protein: 8, carbs: 20, fat: 0.5 },
      vegetables: { cal: 25, protein: 1.5, carbs: 4, fat: 0.2 },
    };

    const total = {
      calories:
        (nutritionPer100.rice.cal * riceGrams) / 100 +
        (nutritionPer100.dal.protein * proteinGrams) / 100 +
        (nutritionPer100.vegetables.cal * vegGrams) / 100,
      protein:
        (nutritionPer100.rice.protein * riceGrams) / 100 +
        (nutritionPer100.dal.protein * proteinGrams) / 100 +
        (nutritionPer100.vegetables.protein * vegGrams) / 100,
      carbs:
        (nutritionPer100.rice.carbs * riceGrams) / 100 +
        (nutritionPer100.dal.carbs * proteinGrams) / 100 +
        (nutritionPer100.vegetables.carbs * vegGrams) / 100,
      fat:
        (nutritionPer100.rice.fat * riceGrams) / 100 +
        (nutritionPer100.dal.fat * proteinGrams) / 100 +
        (nutritionPer100.vegetables.fat * vegGrams) / 100,
    };

    return {
      estimated_calories: Math.round(total.calories),
      estimated_protein_g: Math.round(total.protein * 10) / 10,
      estimated_carbs_g: Math.round(total.carbs * 10) / 10,
      estimated_fat_g: Math.round(total.fat * 10) / 10,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to calculate nutrition', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  getRiceGrams,
  getProteinGrams,
  getVegetablesGrams,
  getMealComposition,
  getEstimatedNutrition,
};
