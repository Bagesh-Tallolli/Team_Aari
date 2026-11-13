import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Diet Plan Model - Unified queries for diet plan items
 * Aligns schema definition (diet_plan_items) with legacy table (diet_plan).
 * Schema columns: id, student_id, meal_type, food_item, required_grams
 */

export const getAllDietPlans = async (page = 1, limit = 20) => {
  try {
    const offset = (page - 1) * limit;

    // Check count in diet_plan_items first, fallback to diet_plan
    let total = 0;
    let tableName = 'diet_plan_items';
    try {
      const countResult = await query('SELECT COUNT(*) as total FROM diet_plan_items');
      total = parseInt(countResult.rows[0].total, 10);
      if (total === 0) {
        // Check if legacy table has rows
        const legCount = await query('SELECT COUNT(*) as total FROM diet_plan');
        const legTotal = parseInt(legCount.rows[0].total, 10);
        if (legTotal > 0) {
          total = legTotal;
          tableName = 'diet_plan';
        }
      }
    } catch {
      const legCount = await query('SELECT COUNT(*) as total FROM diet_plan');
      total = parseInt(legCount.rows[0].total, 10);
      tableName = 'diet_plan';
    }

    const result = await query(
      `SELECT * FROM ${tableName} 
       ORDER BY id DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      diet_plans: result.rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };
  } catch (error) {
    throw new AppError('Failed to fetch diet plans', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const getDietPlanByStudentId = async (studentId) => {
  try {
    // Try diet_plan_items first
    let result;
    try {
      result = await query(
        `SELECT * FROM diet_plan_items 
         WHERE student_id = $1 
         ORDER BY meal_type ASC`,
        [studentId]
      );
      if (result.rows.length === 0) {
        // Check legacy diet_plan table
        const legResult = await query(
          `SELECT * FROM diet_plan 
           WHERE student_id = $1 
           ORDER BY meal_type ASC`,
          [studentId]
        );
        if (legResult.rows.length > 0) {
          result = legResult;
        }
      }
    } catch {
      result = await query(
        `SELECT * FROM diet_plan 
         WHERE student_id = $1 
         ORDER BY meal_type ASC`,
        [studentId]
      );
    }

    return result.rows;
  } catch (error) {
    throw new AppError('Failed to fetch diet plans', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const getDietPlanById = async (dietPlanId) => {
  try {
    let result;
    try {
      result = await query(
        'SELECT * FROM diet_plan_items WHERE id = $1',
        [dietPlanId]
      );
      if (result.rows.length === 0) {
        result = await query('SELECT * FROM diet_plan WHERE id = $1', [dietPlanId]);
      }
    } catch {
      result = await query('SELECT * FROM diet_plan WHERE id = $1', [dietPlanId]);
    }

    if (result.rows.length === 0) {
      throw new AppError('Diet plan not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch diet plan', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const createDietPlan = async (dietPlanData) => {
  try {
    const { student_id, meal_type, food_item, required_grams } = dietPlanData;

    // Try inserting into diet_plan_items first
    try {
      const result = await query(
        `INSERT INTO diet_plan_items (student_id, meal_type, food_item, required_grams, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [student_id, meal_type, food_item, required_grams]
      );
      // Synchronize to diet_plan if available
      try {
        await query(
          `INSERT INTO diet_plan (student_id, meal_type, food_item, required_grams)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [student_id, meal_type, food_item, required_grams]
        );
      } catch {
        // Ignore mirror error
      }
      return result.rows[0];
    } catch {
      // Fall back to diet_plan table
      const result = await query(
        `INSERT INTO diet_plan (student_id, meal_type, food_item, required_grams)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [student_id, meal_type, food_item, required_grams]
      );
      return result.rows[0];
    }
  } catch (error) {
    throw new AppError('Failed to create diet plan', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const updateDietPlan = async (dietPlanId, dietPlanData) => {
  try {
    const { student_id, meal_type, food_item, required_grams } = dietPlanData;

    let updatedRow = null;

    try {
      const result = await query(
        `UPDATE diet_plan_items 
         SET student_id = COALESCE($1, student_id),
             meal_type = COALESCE($2, meal_type),
             food_item = COALESCE($3, food_item),
             required_grams = COALESCE($4, required_grams),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [student_id, meal_type, food_item, required_grams, dietPlanId]
      );
      if (result.rows.length > 0) {
        updatedRow = result.rows[0];
      }
    } catch {
      // Ignore if table not present
    }

    try {
      const legResult = await query(
        `UPDATE diet_plan 
         SET student_id = COALESCE($1, student_id),
             meal_type = COALESCE($2, meal_type),
             food_item = COALESCE($3, food_item),
             required_grams = COALESCE($4, required_grams)
         WHERE id = $5
         RETURNING *`,
        [student_id, meal_type, food_item, required_grams, dietPlanId]
      );
      if (!updatedRow && legResult.rows.length > 0) {
        updatedRow = legResult.rows[0];
      }
    } catch {
      // Ignore
    }

    if (!updatedRow) {
      throw new AppError('Diet plan not found', HTTP_STATUS.NOT_FOUND);
    }

    return updatedRow;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update diet plan', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const deleteDietPlan = async (dietPlanId) => {
  try {
    let deletedRow = null;

    try {
      const result = await query(
        'DELETE FROM diet_plan_items WHERE id = $1 RETURNING *',
        [dietPlanId]
      );
      if (result.rows.length > 0) {
        deletedRow = result.rows[0];
      }
    } catch {
      // Ignore
    }

    try {
      const legResult = await query(
        'DELETE FROM diet_plan WHERE id = $1 RETURNING *',
        [dietPlanId]
      );
      if (!deletedRow && legResult.rows.length > 0) {
        deletedRow = legResult.rows[0];
      }
    } catch {
      // Ignore
    }

    if (!deletedRow) {
      throw new AppError('Diet plan not found', HTTP_STATUS.NOT_FOUND);
    }

    return deletedRow;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to delete diet plan', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  getAllDietPlans,
  getDietPlanByStudentId,
  getDietPlanById,
  createDietPlan,
  updateDietPlan,
  deleteDietPlan,
};
