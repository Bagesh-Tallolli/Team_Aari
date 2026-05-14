import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Students Model - Database queries for students table
 * Actual schema: id, name, age, gender, height, weight
 */

export const getAllStudents = async (page = 1, limit = 20, search = null) => {
  try {
    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = 'WHERE name ILIKE $1';
      params.push(`%${search}%`);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM students ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const offset = (page - 1) * limit;
    const limit_param = params.length + 1;
    const offset_param = params.length + 2;

    const result = await query(
      `SELECT * FROM students ${whereClause} 
       ORDER BY id ASC 
       LIMIT $${limit_param} OFFSET $${offset_param}`,
      [...params, limit, offset]
    );

    return {
      students: result.rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw new AppError('Failed to fetch students', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const getStudentById = async (studentId) => {
  try {
    const result = await query(
      'SELECT * FROM students WHERE id = $1',
      [studentId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Student not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch student', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const createStudent = async (studentData) => {
  try {
    const { name, age, gender, height, weight } = studentData;

    const result = await query(
      `INSERT INTO students (name, age, gender, height, weight)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, age, gender, height, weight]
    );

    return result.rows[0];
  } catch (error) {
    throw new AppError('Failed to create student', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const updateStudent = async (studentId, studentData) => {
  try {
    const { name, age, gender, height, weight } = studentData;

    const result = await query(
      `UPDATE students 
       SET name = COALESCE($1, name), 
           age = COALESCE($2, age), 
           gender = COALESCE($3, gender), 
           height = COALESCE($4, height), 
           weight = COALESCE($5, weight)
       WHERE id = $6
       RETURNING *`,
      [name, age, gender, height, weight, studentId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Student not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update student', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
};
