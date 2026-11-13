import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';
import parentDeliveryModel from './parentDeliveryModel.js';

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
      whereConditions.push(`(name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 2} OR rfid_card_id ILIKE $${params.length + 3})`);
      params.push(`%${search}%`);
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
    const {
      name,
      age,
      gender,
      height,
      weight,
      rfid_card_id,
      email,
      parent_name,
      parent_email,
      parent_phone,
      parent_report_consent,
      admission_number,
      dob,
      class_grade,
      section,
      academic_year,
      school_name,
    } = data;

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

    // Validate email format if provided
    if (parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent_email)) {
      throw new AppError('Invalid parent email format', HTTP_STATUS.BAD_REQUEST);
    }

    // Compute BMI: weight (kg) / (height (cm) / 100) ^ 2
    const heightInMeters = height / 100;
    const bmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(2));

    // Insert student
    const result = await query(
      `INSERT INTO students (
         name, age, gender, height, weight, current_bmi, rfid_card_id, email,
         parent_name, parent_email, parent_phone, parent_email_verified, parent_report_consent,
         admission_number, dob, class_grade, section, academic_year, school_name
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        name,
        age,
        gender,
        height,
        weight,
        bmi,
        rfid_card_id || null,
        email || null,
        parent_name || null,
        parent_email || null,
        parent_phone || null,
        Boolean(parent_report_consent),
        admission_number || null,
        dob || null,
        class_grade || null,
        section || null,
        academic_year || null,
        school_name || null,
      ]
    );

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error creating student in studentModel:', error);
    if (error.code === '23505') {
      if (error.detail?.includes('rfid_card_id')) {
        throw new AppError('RFID card already registered to another student', HTTP_STATUS.CONFLICT);
      }
      if (error.detail?.includes('email')) {
        throw new AppError('Email address already in use', HTTP_STATUS.CONFLICT);
      }
      throw new AppError('A student with this information already exists', HTTP_STATUS.CONFLICT);
    }
    throw new AppError(error.message || 'Failed to create student', HTTP_STATUS.INTERNAL_ERROR);
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

/**
 * Delete a student by ID
 * @param {number} studentId - Student ID
 * @returns {Promise<object>} Deleted student
 */
export const deleteStudent = async (studentId) => {
  try {
    const result = await query(
      'DELETE FROM students WHERE id = $1 RETURNING *',
      [studentId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Student not found', HTTP_STATUS.NOT_FOUND);
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to delete student', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get student parent contact details
 * @param {number} studentId - Student ID
 * @returns {Promise<object>} Parent contact details
 */
export const getParentContact = async (studentId) => {
  try {
    const result = await query(
      `SELECT id, name, age, gender,
              parent_name, parent_email, parent_phone,
              parent_email_verified, parent_report_consent,
              consent_recorded_at, consent_recorded_by, consent_source, consent_withdrawn_at,
              auto_weekly_report_enabled
       FROM students
       WHERE id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Student not found', HTTP_STATUS.NOT_FOUND);
    }

    const row = result.rows[0];
    return {
      student_id: row.id,
      student_name: row.name,
      parent_name: row.parent_name || null,
      parent_email: row.parent_email || null,
      parent_phone: row.parent_phone || null,
      parent_email_verified: Boolean(row.parent_email_verified),
      parent_report_consent: Boolean(row.parent_report_consent),
      consent_recorded_at: row.consent_recorded_at || null,
      consent_recorded_by: row.consent_recorded_by || null,
      consent_source: row.consent_source || null,
      consent_withdrawn_at: row.consent_withdrawn_at || null,
      auto_weekly_report_enabled: Boolean(row.auto_weekly_report_enabled),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch parent contact', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Update student parent contact details with consent auditing and auto verification reset
 * @param {number} studentId - Student ID
 * @param {object} contactData
 * @param {object} [userContext] - { id, name }
 * @returns {Promise<object>} Updated parent contact details
 */
export const updateParentContact = async (studentId, contactData, userContext = null) => {
  try {
    const {
      parent_name,
      parent_email,
      parent_phone,
      parent_email_verified,
      parent_report_consent,
      consent_source = 'DIRECT_PORTAL',
      auto_weekly_report_enabled,
    } = contactData;

    // Fetch existing student record
    const existing = await query(
      'SELECT id, parent_email, parent_email_verified, parent_report_consent FROM students WHERE id = $1',
      [studentId]
    );

    if (existing.rows.length === 0) {
      throw new AppError('Student not found', HTTP_STATUS.NOT_FOUND);
    }

    const current = existing.rows[0];

    // Validate email format if provided
    if (parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent_email)) {
      throw new AppError('Invalid parent email format', HTTP_STATUS.BAD_REQUEST);
    }

    // SECURITY: If email address changed, reset verification status to false and invalidate previous tokens
    let finalVerified = parent_email_verified !== undefined ? parent_email_verified : current.parent_email_verified;
    if (parent_email !== undefined && parent_email !== current.parent_email) {
      finalVerified = false;
      try {
        await parentDeliveryModel.invalidateStudentTokens(studentId);
      } catch (tokErr) {
        logger.warn(`Could not invalidate previous tokens: ${tokErr.message}`);
      }
    }

    // Consent audit tracking: Do not allow silent consent grants without valid source
    let consentRecordedAt = null;
    let consentWithdrawnAt = null;
    let consentRecordedBy = userContext?.name || 'Authorized Staff';

    const consentStatusChanged = parent_report_consent !== undefined && Boolean(parent_report_consent) !== Boolean(current.parent_report_consent);

    if (consentStatusChanged) {
      if (parent_report_consent) {
        const sourceMethod = String(consent_source || '').trim();
        if (!sourceMethod) {
          throw new AppError('Cannot grant consent without specifying a valid consent source (e.g., ANNUAL_MEETING_FORM, WRITTEN_FORM, PORTAL_OPT_IN)', HTTP_STATUS.BAD_REQUEST);
        }
        consentRecordedAt = new Date();
      } else {
        consentWithdrawnAt = new Date();
      }
    }

    const result = await query(
      `UPDATE students
       SET parent_name = COALESCE($1, parent_name),
           parent_email = COALESCE($2, parent_email),
           parent_phone = COALESCE($3, parent_phone),
           parent_email_verified = COALESCE($4, parent_email_verified),
           parent_report_consent = COALESCE($5, parent_report_consent),
           consent_recorded_at = CASE WHEN $6::timestamp IS NOT NULL THEN $6::timestamp ELSE consent_recorded_at END,
           consent_withdrawn_at = CASE WHEN $7::timestamp IS NOT NULL THEN $7::timestamp ELSE consent_withdrawn_at END,
           consent_recorded_by = CASE WHEN $8::varchar IS NOT NULL THEN $8::varchar ELSE consent_recorded_by END,
           consent_source = CASE WHEN $9::varchar IS NOT NULL THEN $9::varchar ELSE consent_source END,
           auto_weekly_report_enabled = COALESCE($10, auto_weekly_report_enabled),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING id, name, parent_name, parent_email, parent_phone, parent_email_verified,
                 parent_report_consent, consent_recorded_at, consent_withdrawn_at, auto_weekly_report_enabled`,
      [
        parent_name !== undefined ? parent_name : null,
        parent_email !== undefined ? parent_email : null,
        parent_phone !== undefined ? parent_phone : null,
        finalVerified !== undefined ? finalVerified : null,
        parent_report_consent !== undefined ? parent_report_consent : null,
        consentRecordedAt,
        consentWithdrawnAt,
        consentRecordedBy,
        consent_source,
        auto_weekly_report_enabled !== undefined ? auto_weekly_report_enabled : null,
        studentId,
      ]
    );

    const row = result.rows[0];

    // Log consent history entry if consent status changed
    if (consentStatusChanged) {
      try {
        await query(
          `INSERT INTO parent_consent_history (
             student_id, consent_status, action, recorded_by_user_id, recorded_by_name, source_method, timestamp
           ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [
            studentId,
            Boolean(parent_report_consent),
            parent_report_consent ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN',
            userContext?.id || null,
            consentRecordedBy,
            consent_source,
          ]
        );
      } catch (histErr) {
        logger.warn(`Could not log consent history: ${histErr.message}`);
      }
    }

    return {
      student_id: row.id,
      student_name: row.name,
      parent_name: row.parent_name,
      parent_email: row.parent_email,
      parent_phone: row.parent_phone,
      parent_email_verified: Boolean(row.parent_email_verified),
      parent_report_consent: Boolean(row.parent_report_consent),
      consent_recorded_at: row.consent_recorded_at,
      consent_withdrawn_at: row.consent_withdrawn_at,
      auto_weekly_report_enabled: Boolean(row.auto_weekly_report_enabled),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update parent contact', HTTP_STATUS.INTERNAL_ERROR);
  }
};

export default {
  getAllStudents,
  createStudent,
  getStudentById,
  studentExists,
  updateStudent,
  deleteStudent,
  getAtRiskStudents,
  getParentContact,
  updateParentContact,
};
