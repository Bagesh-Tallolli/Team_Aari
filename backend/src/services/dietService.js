import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Diet Plan Service
 * Automatically generates personalized diet plans based on AI health status
 */

/**
 * Diet plan templates based on health status
 */
const DIET_TEMPLATES = {
  Healthy: [
    { food_item: 'rice', required_grams: 180 },
    { food_item: 'dal', required_grams: 60 },
  ],
  'At Risk': [
    { food_item: 'rice', required_grams: 200 },
    { food_item: 'dal', required_grams: 80 },
  ],
  Underweight: [
    { food_item: 'rice', required_grams: 250 },
    { food_item: 'egg', required_grams: 50 },
  ],
};

/**
 * Upsert diet plan - delete old lunch plan and create new one based on status
 * 
 * @param {number} studentId - Student ID
 * @param {string} status - Health status from AI (Healthy, At Risk, Underweight)
 * @returns {Promise<array>} Created diet plan records
 */
export const upsertDietPlan = async (studentId, status) => {
  try {
    // Validate status
    if (!DIET_TEMPLATES[status]) {
      throw new AppError(
        `Invalid health status: ${status}. Must be one of: ${Object.keys(DIET_TEMPLATES).join(', ')}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    logger.debug(`🍱 Upserting diet plan for student ${studentId} with status: ${status}`);

    // Step 1: Delete existing lunch diet plans for this student across both tables
    try {
      await db.query(`DELETE FROM diet_plan_items WHERE student_id = $1 AND meal_type = 'lunch'`, [studentId]);
    } catch {
      // Table may not exist yet
    }
    try {
      await db.query(`DELETE FROM diet_plan WHERE student_id = $1 AND meal_type = 'lunch'`, [studentId]);
    } catch {
      // Table may not exist yet
    }
    logger.debug(`🗑️  Deleted existing lunch diet plans for student ${studentId}`);

    // Step 2: Insert new diet plan rows based on status
    const template = DIET_TEMPLATES[status];
    const createdPlans = [];

    for (const item of template) {
      let createdRow = null;

      try {
        const result = await db.query(
          `INSERT INTO diet_plan_items (student_id, meal_type, food_item, required_grams, created_at, updated_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id, student_id, meal_type, food_item, required_grams`,
          [studentId, 'lunch', item.food_item, item.required_grams]
        );
        if (result.rows && result.rows.length > 0) {
          createdRow = result.rows[0];
        }
      } catch {
        // Fallback to diet_plan
      }

      try {
        const legResult = await db.query(
          `INSERT INTO diet_plan (student_id, meal_type, food_item, required_grams)
           VALUES ($1, $2, $3, $4)
           RETURNING id, student_id, meal_type, food_item, required_grams`,
          [studentId, 'lunch', item.food_item, item.required_grams]
        );
        if (!createdRow && legResult.rows && legResult.rows.length > 0) {
          createdRow = legResult.rows[0];
        }
      } catch {
        // Ignore mirror error
      }

      if (createdRow) {
        createdPlans.push(createdRow);
        logger.debug(`✅ Created diet plan: ${item.food_item} ${item.required_grams}g for student ${studentId}`);
      }
    }

    return createdPlans;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('❌ Diet plan upsert failed', { studentId, status, error: error.message });
    throw new AppError('Failed to upsert diet plan', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get diet plan for student
 * 
 * @param {number} studentId - Student ID
 * @param {string} mealType - Meal type (breakfast, lunch, dinner) - optional
 * @returns {Promise<array>} Diet plan records
 */
export const getDietPlanByStudent = async (studentId, mealType = null) => {
  try {
    let rows = [];

    // Try diet_plan_items first
    try {
      let query = `
        SELECT id, student_id, meal_type, food_item, required_grams
        FROM diet_plan_items
        WHERE student_id = $1
      `;
      const params = [studentId];
      if (mealType) {
        query += ` AND meal_type = $2`;
        params.push(mealType);
      }
      query += ` ORDER BY meal_type, food_item`;
      const result = await db.query(query, params);
      rows = result.rows || [];
    } catch {
      // Table may not exist yet
    }

    if (rows.length === 0) {
      // Fallback to legacy diet_plan
      try {
        let query = `
          SELECT id, student_id, meal_type, food_item, required_grams
          FROM diet_plan
          WHERE student_id = $1
        `;
        const params = [studentId];
        if (mealType) {
          query += ` AND meal_type = $2`;
          params.push(mealType);
        }
        query += ` ORDER BY meal_type, food_item`;
        const result = await db.query(query, params);
        rows = result.rows || [];
      } catch {
        // Table may not exist
      }
    }

    return rows;
  } catch (error) {
    logger.error('❌ Failed to fetch diet plan', { studentId, mealType, error: error.message });
    throw new AppError('Failed to fetch diet plan', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get lunch diet plan for scanning (RFID simulation)
 * 
 * @param {number} studentId - Student ID
 * @returns {Promise<object>} Lunch diet plan with food items
 */
export const getLunchDietPlan = async (studentId) => {
  try {
    const plans = await getDietPlanByStudent(studentId, 'lunch');
    
    if (!plans || plans.length === 0) {
      throw new AppError(
        `No lunch diet plan found for student ${studentId}. Please create health status first.`,
        HTTP_STATUS.NOT_FOUND
      );
    }

    return plans;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('❌ Failed to get lunch diet plan', { studentId, error: error.message });
    throw new AppError('Failed to get lunch diet plan', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  upsertDietPlan,
  getDietPlanByStudent,
  getLunchDietPlan,
};
