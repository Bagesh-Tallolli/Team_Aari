import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

export const createFoodDistribution = async (studentId, data) => {
  try {
    const {
      food_item,
      grams_served,
      calories_served,
      status = 'success',
    } = data;

    // Create table if not exists (for sql.js simplicity)
    await query(`
      CREATE TABLE IF NOT EXISTS food_distributions (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        food_item VARCHAR(100) NOT NULL,
        grams_served DECIMAL(6, 2),
        calories_served DECIMAL(6, 2),
        distribution_date DATE DEFAULT CURRENT_DATE,
        distribution_time TIME DEFAULT CURRENT_TIME,
        status VARCHAR(50) DEFAULT 'success',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await query(
      `INSERT INTO food_distributions 
       (student_id, food_item, grams_served, calories_served, status, distribution_date, distribution_time, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, CURRENT_TIME, CURRENT_TIMESTAMP)
       RETURNING *`,
      [studentId, food_item, grams_served, calories_served, status]
    );

    return result.rows[0];
  } catch (error) {
    throw new AppError('Failed to create food distribution log', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const getRecentDistributions = async (limit = 10) => {
  try {
    // Ensure table exists
    await query(`
      CREATE TABLE IF NOT EXISTS food_distributions (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        food_item VARCHAR(100) NOT NULL,
        grams_served DECIMAL(6, 2),
        calories_served DECIMAL(6, 2),
        distribution_date DATE DEFAULT CURRENT_DATE,
        distribution_time TIME DEFAULT CURRENT_TIME,
        status VARCHAR(50) DEFAULT 'success',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await query(
      `SELECT fd.*, s.name as student_name 
       FROM food_distributions fd
       JOIN students s ON fd.student_id = s.id
       ORDER BY fd.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  } catch (error) {
    return [];
  }
};

export default {
  createFoodDistribution,
  getRecentDistributions
};
