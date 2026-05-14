import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Food Nutrition Model - Database queries for food_nutrition table
 * Actual schema: food_item, calories_per_100g, protein_per_100g
 */

export const getAllFoodItems = async () => {
  try {
    const result = await query(
      'SELECT * FROM food_nutrition ORDER BY food_item ASC'
    );
    return result.rows;
  } catch (error) {
    throw new AppError('Failed to fetch food items', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const getFoodByItem = async (foodItem) => {
  try {
    const result = await query(
      'SELECT * FROM food_nutrition WHERE food_item = $1',
      [foodItem]
    );

    if (result.rows.length === 0) {
      throw new AppError('Food item not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch food item', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const createFoodItem = async (foodData) => {
  try {
    const { food_item, calories_per_100g, protein_per_100g } = foodData;

    const result = await query(
      `INSERT INTO food_nutrition (food_item, calories_per_100g, protein_per_100g)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [food_item, calories_per_100g, protein_per_100g]
    );

    return result.rows[0];
  } catch (error) {
    throw new AppError('Failed to create food item', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const updateFoodItem = async (foodItem, foodData) => {
  try {
    const { calories_per_100g, protein_per_100g } = foodData;

    const result = await query(
      `UPDATE food_nutrition 
       SET calories_per_100g = COALESCE($1, calories_per_100g),
           protein_per_100g = COALESCE($2, protein_per_100g)
       WHERE food_item = $3
       RETURNING *`,
      [calories_per_100g, protein_per_100g, foodItem]
    );

    if (result.rows.length === 0) {
      throw new AppError('Food item not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update food item', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  getAllFoodItems,
  getFoodByItem,
  createFoodItem,
  updateFoodItem,
};
