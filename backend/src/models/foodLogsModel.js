import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Food Logs Model - Database queries for food_logs table (PostgreSQL)
 * Schema columns: id, student_id, food_item, served_grams, estimated_calories, protein, carbs, fats, logged_at, created_at
 */

export const getAllFoodLogs = async (page = 1, limit = 20) => {
  try {
    // Get total count
    const countResult = await query('SELECT COUNT(*) as total FROM food_logs');
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT * FROM food_logs 
       ORDER BY logged_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      food_logs: result.rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw new AppError('Failed to fetch food logs', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const getFoodLogsByStudentId = async (studentId, limit = 50) => {
  try {
    const result = await query(
      `SELECT * FROM food_logs 
       WHERE student_id = $1 
       ORDER BY logged_at DESC 
       LIMIT $2`,
      [studentId, limit]
    );

    return result.rows;
  } catch (error) {
    throw new AppError('Failed to fetch student food logs', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const getFoodLogById = async (foodLogId) => {
  try {
    const result = await query(
      'SELECT * FROM food_logs WHERE id = $1',
      [foodLogId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Food log not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch food log', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const createFoodLog = async (foodLogData) => {
  try {
    const { student_id, food_item, served_grams, estimated_calories, protein, carbs, fats } = foodLogData;

    const result = await query(
      `INSERT INTO food_logs (student_id, food_item, served_grams, estimated_calories, protein, carbs, fats, logged_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [student_id, food_item, served_grams, estimated_calories, protein, carbs, fats]
    );

    return result.rows[0];
  } catch (error) {
    throw new AppError('Failed to create food log', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const updateFoodLog = async (foodLogId, foodLogData) => {
  try {
    const { student_id, food_item, served_grams, estimated_calories, protein, carbs, fats } = foodLogData;

    const result = await query(
      `UPDATE food_logs 
       SET student_id = COALESCE($1, student_id),
           food_item = COALESCE($2, food_item),
           served_grams = COALESCE($3, served_grams),
           estimated_calories = COALESCE($4, estimated_calories),
           protein = COALESCE($5, protein),
           carbs = COALESCE($6, carbs),
           fats = COALESCE($7, fats)
       WHERE id = $8
       RETURNING *`,
      [student_id, food_item, served_grams, estimated_calories, protein, carbs, fats, foodLogId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Food log not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update food log', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const deleteFoodLog = async (foodLogId) => {
  try {
    const result = await query(
      'DELETE FROM food_logs WHERE id = $1 RETURNING *',
      [foodLogId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Food log not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to delete food log', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  getAllFoodLogs,
  getFoodLogsByStudentId,
  getFoodLogById,
  createFoodLog,
  updateFoodLog,
  deleteFoodLog,
};
