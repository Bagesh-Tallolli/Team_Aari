import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Diet Plan Model - Database queries for diet_plan table
 * Actual schema: id, student_id, meal_type, food_item, required_grams
 */

export const getAllDietPlans = async (page = 1, limit = 20) => {
  try {
    // Get total count
    const countResult = await query('SELECT COUNT(*) as total FROM diet_plan');
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT * FROM diet_plan 
       ORDER BY id DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      diet_plans: result.rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw new AppError('Failed to fetch diet plans', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const getDietPlanByStudentId = async (studentId) => {
  try {
    const result = await query(
      `SELECT * FROM diet_plan 
       WHERE student_id = $1 
       ORDER BY meal_type ASC`,
      [studentId]
    );

    return result.rows;
  } catch (error) {
    throw new AppError('Failed to fetch diet plans', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const getDietPlanById = async (dietPlanId) => {
  try {
    const result = await query(
      'SELECT * FROM diet_plan WHERE id = $1',
      [dietPlanId]
    );

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

    const result = await query(
      `INSERT INTO diet_plan (student_id, meal_type, food_item, required_grams)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [student_id, meal_type, food_item, required_grams]
    );

    return result.rows[0];
  } catch (error) {
    throw new AppError('Failed to create diet plan', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const updateDietPlan = async (dietPlanId, dietPlanData) => {
  try {
    const { student_id, meal_type, food_item, required_grams } = dietPlanData;

    const result = await query(
      `UPDATE diet_plan 
       SET student_id = COALESCE($1, student_id),
           meal_type = COALESCE($2, meal_type),
           food_item = COALESCE($3, food_item),
           required_grams = COALESCE($4, required_grams)
       WHERE id = $5
       RETURNING *`,
      [student_id, meal_type, food_item, required_grams, dietPlanId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Diet plan not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update diet plan', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const deleteDietPlan = async (dietPlanId) => {
  try {
    const result = await query(
      'DELETE FROM diet_plan WHERE id = $1 RETURNING *',
      [dietPlanId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Diet plan not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
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
