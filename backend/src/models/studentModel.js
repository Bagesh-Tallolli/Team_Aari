import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Student Model - Database queries for student management
 * All queries are parameterized to prevent SQL injection (PostgreSQL)
 */

/**
 * Get all students with pagination
 * @param {number} page - Page number (default 1)
 * @param {number} limit - Items per page (default 20)
 * @param {string} search - Search by name or email
 * @param {string} riskLevel - Filter by risk level (healthy, at_risk, critical)
 * @returns {Promise<object>} { students, total, page, limit }
 */
export const getAllStudents = async (page = 1, limit = 20, search = null, riskLevel = null) => {
  try {
    let whereConditions = [];
    let params = [];

    // Search filter
    if (search) {
      whereConditions.push(`(name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 2})`);
      params.push(`%${search}%`);
      params.push(`%${search}%`);
    }

    // Risk level filter
    if (riskLevel) {
      whereConditions.push(`risk_level = $${params.length + 1}`);
      params.push(riskLevel);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM students ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const offset = (page - 1) * limit;
    const countParams = [...params, limit, offset];

    const result = await query(
      `SELECT * FROM students ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      countParams
    );

    return {
      students: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw new AppError('Failed to fetch students', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Create a new student
 * @param {object} data - { name, age, gender, height, weight, rfid_card_id, email }
 * @returns {Promise<object>} Created student with computed BMI
 */
export const createStudent = async (data) => {
  try {
    const { name, age, gender, height, weight, rfid_card_id, email } = data;

    // Check for duplicate RFID card
    if (rfid_card_id) {
      const rfidCheck = await query(
        'SELECT id FROM students WHERE rfid_card_id = $1',
        [rfid_card_id]
      );
      if (rfidCheck.rows.length > 0) {
        throw new AppError('RFID card already registered', HTTP_STATUS.CONFLICT);
      }
    }

    // Compute BMI: weight (kg) / (height (cm) / 100) ^ 2
    const heightInMeters = height / 100;
    const bmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(2));

    // Insert student
    const result = await query(
      `INSERT INTO students (name, age, gender, height, weight, current_bmi, rfid_card_id, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, age, gender, height, weight, bmi, rfid_card_id || null, email || null]
    );

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to create student', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get student by ID
 * @param {number} studentId - Student ID
 * @returns {Promise<object>} Student object
 */
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

/**
 * Check if student exists
 * @param {number} studentId - Student ID
 * @returns {Promise<boolean>} True if student exists
 */
export const studentExists = async (studentId) => {
  try {
    const result = await query(
      'SELECT id FROM students WHERE id = $1',
      [studentId]
    );
    return result.rows.length > 0;
  } catch (error) {
    return false;
  }
};

/**
 * Update student risk level and BMI
 * @param {number} studentId - Student ID
 * @param {object} data - { current_bmi, risk_level }
 * @returns {Promise<object>} Updated student
 */
export const updateStudent = async (studentId, data) => {
  try {
    const { current_bmi, risk_level } = data;

    await query(
      `UPDATE students 
       SET current_bmi = COALESCE($1, current_bmi),
           risk_level = COALESCE($2, risk_level),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [current_bmi || null, risk_level || null, studentId]
    );

    // Fetch the updated student
    const result = await query(
      `SELECT * FROM students WHERE id = $1`,
      [studentId]
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

/**
 * Get students at risk
 * @param {string} riskLevel - at_risk or critical
 * @returns {Promise<array>} Array of at-risk students
 */
export const getAtRiskStudents = async (riskLevel = 'at_risk') => {
  try {
    const result = await query(
      `SELECT * FROM students 
       WHERE risk_level IN ($1, $2)
       ORDER BY current_bmi DESC`,
      [riskLevel, 'critical']
    );

    return result.rows;
  } catch (error) {
    throw new AppError('Failed to fetch at-risk students', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  getAllStudents,
  createStudent,
  getStudentById,
  studentExists,
  updateStudent,
  getAtRiskStudents,
};
