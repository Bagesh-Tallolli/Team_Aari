import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Health Status Model - Database queries for health_status table
 * Actual schema: id, student_id, bmi, calories, protein, status
 */

export const getAllHealthStatus = async (page = 1, limit = 20) => {
  try {
    // Get total count
    const countResult = await query('SELECT COUNT(*) as total FROM health_status');
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT * FROM health_status 
       ORDER BY id DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      health_status: result.rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw new AppError('Failed to fetch health status', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const getHealthStatusByStudentId = async (studentId) => {
  try {
    const result = await query(
      'SELECT * FROM health_status WHERE student_id = $1',
      [studentId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Health status not found for student', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch health status', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const getHealthStatusById = async (healthStatusId) => {
  try {
    const result = await query(
      'SELECT * FROM health_status WHERE id = $1',
      [healthStatusId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Health status not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch health status', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const createHealthStatus = async (healthData) => {
  try {
    const { student_id, bmi, calories, protein, status } = healthData;

    const result = await query(
      `INSERT INTO health_status (student_id, bmi, calories, protein, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [student_id, bmi, calories, protein, status]
    );

    return result.rows[0];
  } catch (error) {
    throw new AppError('Failed to create health status', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const updateHealthStatus = async (healthStatusId, healthData) => {
  try {
    const { student_id, bmi, calories, protein, status } = healthData;

    const result = await query(
      `UPDATE health_status 
       SET student_id = COALESCE($1, student_id),
           bmi = COALESCE($2, bmi),
           calories = COALESCE($3, calories),
           protein = COALESCE($4, protein),
           status = COALESCE($5, status)
       WHERE id = $6
       RETURNING *`,
      [student_id, bmi, calories, protein, status, healthStatusId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Health status not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update health status', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export const deleteHealthStatus = async (healthStatusId) => {
  try {
    const result = await query(
      'DELETE FROM health_status WHERE id = $1 RETURNING *',
      [healthStatusId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Health status not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to delete health status', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Store AI prediction result with complete data
 * @param {number} studentId - Student ID
 * @param {object} prediction - Complete AI prediction object
 * @returns {Promise<object>} Stored health status with prediction
 */
export const storeAIPrediction = async (studentId, prediction) => {
  try {
    const {
      status,
      confidence,
      bmi,
      calories,
      required_calories,
      reason,
      diet_plan,
      analysis,
      probabilities
    } = prediction;

    const result = await query(
      `INSERT INTO health_status 
       (student_id, bmi, avg_weekly_calories, required_calories, status, reason, diet_plan, ai_prediction, confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, student_id, status, confidence, created_at, diet_plan, reason`,
      [
        studentId,
        bmi || null,
        calories || null,
        required_calories || null,
        status || 'Unknown',
        reason || '',
        diet_plan ? JSON.stringify(diet_plan) : null,
        JSON.stringify({
          reason,
          diet_plan,
          analysis,
          probabilities,
          status,
          confidence,
          timestamp: new Date().toISOString()
        }),
        confidence || 0
      ]
    );

    if (result.rows.length === 0) {
      throw new AppError('Failed to store AI prediction', HTTP_STATUS.INTERNAL_ERROR);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to store AI prediction', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get latest health status for a student
 * @param {number} studentId - Student ID
 * @returns {Promise<object|null>} Latest health status record
 */
export const getLatestHealthStatus = async (studentId) => {
  try {
    const result = await query(
      `SELECT * FROM health_status 
       WHERE student_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [studentId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    throw new AppError('Failed to retrieve health status', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get at-risk students summary
 * @returns {Promise<array>} List of at-risk students
 */
export const getAtRiskStudents = async () => {
  try {
    const result = await query(
      `SELECT DISTINCT ON (s.id)
         s.id,
         s.name,
         s.age,
         s.gender,
         s.current_bmi,
         h.status,
         h.confidence,
         h.created_at
       FROM students s
       LEFT JOIN health_status h ON s.id = h.student_id
       WHERE h.status = 'At Risk' OR h.status = 'Underweight'
       ORDER BY s.id, h.created_at DESC`
    );

    return result.rows;
  } catch (error) {
    throw new AppError('Failed to retrieve at-risk students', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Count students by health status
 * @returns {Promise<object>} Count by status
 */
export const getHealthStatusCounts = async () => {
  try {
    const result = await query(
      `SELECT 
         status, 
         COUNT(*) as count
       FROM (
         SELECT DISTINCT ON (student_id) status 
         FROM health_status 
         ORDER BY student_id, created_at DESC
       ) h
       GROUP BY status`
    );

    const counts = {
      healthy: 0,
      at_risk: 0,
      underweight: 0,
      unknown: 0
    };

    result.rows.forEach(row => {
      if (row.status === 'Healthy') counts.healthy = parseInt(row.count);
      else if (row.status === 'At Risk') counts.at_risk = parseInt(row.count);
      else if (row.status === 'Underweight') counts.underweight = parseInt(row.count);
      else counts.unknown = parseInt(row.count);
    });

    return counts;
  } catch (error) {
    throw new AppError('Failed to count health statuses', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get latest diet plan for a student
 * @param {number} studentId - Student ID
 * @returns {Promise<object|null>} Latest diet plan or null
 */
export const getDietPlanForStudent = async (studentId) => {
  try {
    const result = await query(
      `SELECT id, student_id, diet_plan, reason, status, confidence, created_at 
       FROM health_status 
       WHERE student_id = $1 AND diet_plan IS NOT NULL
       ORDER BY created_at DESC 
       LIMIT 1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    throw new AppError('Failed to fetch diet plan', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get complete AI prediction with diet plan
 * @param {number} studentId - Student ID
 * @returns {Promise<object>} Complete prediction including diet plan and analysis
 */
export const getCompleteAIPrediction = async (studentId) => {
  try {
    const result = await query(
      `SELECT id, student_id, status, confidence, bmi, avg_weekly_calories, required_calories, 
              reason, diet_plan, ai_prediction, created_at 
       FROM health_status 
       WHERE student_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const record = result.rows[0];
    
    // Parse ai_prediction if it's a string
    let aiPrediction = record.ai_prediction;
    if (typeof aiPrediction === 'string') {
      try {
        aiPrediction = JSON.parse(aiPrediction);
      } catch (e) {
        aiPrediction = null;
      }
    }

    return {
      id: record.id,
      student_id: record.student_id,
      status: record.status,
      confidence: record.confidence,
      bmi: record.bmi,
      avg_weekly_calories: record.avg_weekly_calories,
      required_calories: record.required_calories,
      reason: record.reason,
      diet_plan: record.diet_plan,
      analysis: aiPrediction?.analysis,
      probabilities: aiPrediction?.probabilities,
      created_at: record.created_at
    };
  } catch (error) {
    throw new AppError('Failed to fetch complete AI prediction', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  getAllHealthStatus,
  getHealthStatusByStudentId,
  getHealthStatusById,
  createHealthStatus,
  updateHealthStatus,
  deleteHealthStatus,
  storeAIPrediction,
  getLatestHealthStatus,
  getAtRiskStudents,
  getHealthStatusCounts,
  getDietPlanForStudent,
  getCompleteAIPrediction,
};
