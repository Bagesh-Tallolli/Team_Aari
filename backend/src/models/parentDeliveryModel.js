import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';

/**
 * Parent Delivery Model (Phase 7)
 * Handles PostgreSQL operations for parent report deliveries,
 * tracking delivery status, provider message IDs, attempt counts, and timestamps.
 */

let schemaInitialized = false;

/**
 * Ensure student parent columns and parent_report_deliveries table exist in PostgreSQL
 */
export const ensureParentDeliverySchema = async () => {
  if (schemaInitialized) return;
  try {
    // 1. Non-destructive migration for student parent fields & consent audit
    await query(`
      ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name VARCHAR(150);
      ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email VARCHAR(150);
      ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50);
      ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email_verified BOOLEAN DEFAULT false;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_report_consent BOOLEAN DEFAULT false;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS consent_recorded_at TIMESTAMP;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS consent_recorded_by VARCHAR(100);
      ALTER TABLE students ADD COLUMN IF NOT EXISTS consent_source VARCHAR(100);
      ALTER TABLE students ADD COLUMN IF NOT EXISTS consent_withdrawn_at TIMESTAMP;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS auto_weekly_report_enabled BOOLEAN DEFAULT false;
    `);

    // 2. Non-destructive creation of parent_report_deliveries table
    await query(`
      CREATE TABLE IF NOT EXISTS parent_report_deliveries (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        weekly_report_id INTEGER REFERENCES weekly_nutrition_reports(id) ON DELETE SET NULL,
        parent_email VARCHAR(150) NOT NULL,
        delivery_status VARCHAR(50) NOT NULL DEFAULT 'Queued',
        provider_message_id VARCHAR(255),
        attempt_count INTEGER DEFAULT 1,
        last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP,
        failure_reason TEXT,
        email_subject VARCHAR(255),
        pdf_path VARCHAR(255),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_parent_deliveries_student ON parent_report_deliveries(student_id);
      CREATE INDEX IF NOT EXISTS idx_parent_deliveries_weekly_report ON parent_report_deliveries(weekly_report_id);
      CREATE INDEX IF NOT EXISTS idx_parent_deliveries_status ON parent_report_deliveries(delivery_status);

      DROP INDEX IF EXISTS uq_parent_delivery_active_dispatch;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_parent_delivery_active_dispatch
      ON parent_report_deliveries (student_id, weekly_report_id)
      WHERE delivery_status IN ('Sent', 'Queued') 
        AND (metadata->>'force_resend' IS NULL OR metadata->>'force_resend' = 'false');

      -- Concurrency lock: strictly only 1 in-flight (Queued) dispatch allowed per student & report at a time
      -- Applies equally to normal dispatches AND force-resends to prevent simultaneous duplicate dispatches
      DROP INDEX IF EXISTS uq_parent_delivery_in_flight;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_parent_delivery_in_flight
      ON parent_report_deliveries (student_id, weekly_report_id)
      WHERE delivery_status = 'Queued';
    `);

    // 3. Email verification tokens table
    await query(`
      CREATE TABLE IF NOT EXISTS parent_email_verification_tokens (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        parent_email VARCHAR(150) NOT NULL,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        otp_code_hash VARCHAR(64) NOT NULL,
        failed_attempts INTEGER DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE parent_email_verification_tokens ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_parent_tokens_student ON parent_email_verification_tokens(student_id);
      CREATE INDEX IF NOT EXISTS idx_parent_tokens_hash ON parent_email_verification_tokens(token_hash);
    `);

    // 4. Parent consent history table
    await query(`
      CREATE TABLE IF NOT EXISTS parent_consent_history (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        consent_status BOOLEAN NOT NULL,
        action VARCHAR(50) NOT NULL,
        recorded_by_user_id INTEGER,
        recorded_by_name VARCHAR(100),
        source_method VARCHAR(100) NOT NULL,
        notes TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_parent_consent_student ON parent_consent_history(student_id);
    `);

    schemaInitialized = true;
    logger.debug('✓ parent_report_deliveries schema and student parent columns verified');
  } catch (err) {
    logger.warn(`⚠️ ensureParentDeliverySchema error (may already exist): ${err.message}`);
  }
};

/**
 * Record a new delivery attempt
 * 
 * @param {object} params
 * @returns {Promise<object>}
 */
export const createDeliveryRecord = async ({
  student_id,
  weekly_report_id = null,
  parent_email,
  delivery_status = 'Queued',
  email_subject = null,
  pdf_path = null,
  metadata = null,
}) => {
  await ensureParentDeliverySchema();
  try {
    const result = await query(
      `INSERT INTO parent_report_deliveries (
         student_id, weekly_report_id, parent_email, delivery_status,
         email_subject, pdf_path, metadata, attempt_count, last_attempt_at,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        student_id,
        weekly_report_id,
        parent_email,
        delivery_status,
        email_subject,
        pdf_path,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('❌ Failed to create parent report delivery record:', error.message);
    throw new AppError('Failed to record delivery attempt', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Update delivery status
 * 
 * @param {number} deliveryId
 * @param {object} updates
 * @returns {Promise<object>}
 */
export const updateDeliveryStatus = async (deliveryId, {
  delivery_status,
  provider_message_id = null,
  failure_reason = null,
  sent_at = null,
  attempt_count = null,
}) => {
  await ensureParentDeliverySchema();
  try {
    let sql = `
      UPDATE parent_report_deliveries
      SET delivery_status = $1,
          updated_at = CURRENT_TIMESTAMP
    `;
    const params = [delivery_status];
    let idx = 2;

    if (provider_message_id !== null) {
      sql += `, provider_message_id = $${idx++}`;
      params.push(provider_message_id);
    }
    if (failure_reason !== null) {
      sql += `, failure_reason = $${idx++}`;
      params.push(failure_reason);
    }
    if (sent_at !== null) {
      sql += `, sent_at = $${idx++}`;
      params.push(sent_at);
    }
    if (attempt_count !== null) {
      sql += `, attempt_count = $${idx++}`;
      params.push(attempt_count);
    }

    sql += `, last_attempt_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`;
    params.push(deliveryId);

    const result = await query(sql, params);
    if (result.rows.length === 0) {
      throw new AppError('Delivery record not found', HTTP_STATUS.NOT_FOUND);
    }
    return result.rows[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('❌ Failed to update delivery status:', error.message);
    throw new AppError('Failed to update delivery status', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get delivery record by ID
 * 
 * @param {number} deliveryId
 * @returns {Promise<object|null>}
 */
export const getDeliveryById = async (deliveryId) => {
  await ensureParentDeliverySchema();
  try {
    const result = await query(
      `SELECT d.*, s.name as student_name, s.age as student_age
       FROM parent_report_deliveries d
       JOIN students s ON d.student_id = s.id
       WHERE d.id = $1
       LIMIT 1`,
      [deliveryId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('❌ Failed to fetch delivery record by ID:', error.message);
    throw new AppError('Failed to fetch delivery record', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Get delivery history for a student
 * 
 * @param {number} studentId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export const getDeliveriesByStudent = async (studentId, limit = 20) => {
  await ensureParentDeliverySchema();
  try {
    const result = await query(
      `SELECT d.*, r.report_period_start, r.report_period_end
       FROM parent_report_deliveries d
       LEFT JOIN weekly_nutrition_reports r ON d.weekly_report_id = r.id
       WHERE d.student_id = $1
       ORDER BY d.created_at DESC
       LIMIT $2`,
      [studentId, limit]
    );
    return result.rows;
  } catch (error) {
    logger.error('❌ Failed to fetch deliveries by student:', error.message);
    throw new AppError('Failed to fetch delivery history', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Check if a report was already successfully sent to parent (idempotency check)
 * 
 * @param {number} studentId
 * @param {number} weeklyReportId
 * @returns {Promise<object|null>}
 */
export const checkSuccessfulDelivery = async (studentId, weeklyReportId) => {
  await ensureParentDeliverySchema();
  try {
    const result = await query(
      `SELECT * FROM parent_report_deliveries
       WHERE student_id = $1
         AND weekly_report_id = $2
         AND delivery_status = 'Sent'
       ORDER BY sent_at DESC
       LIMIT 1`,
      [studentId, weeklyReportId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('❌ Failed to check existing delivery:', error.message);
    return null;
  }
};

/**
 * Create verification token & OTP record
 */
export const createVerificationToken = async ({
  student_id,
  parent_email,
  token_hash,
  otp_code_hash,
  expires_at,
}) => {
  await ensureParentDeliverySchema();
  try {
    const result = await query(
      `INSERT INTO parent_email_verification_tokens (
         student_id, parent_email, token_hash, otp_code_hash, expires_at, created_at
       ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, student_id, parent_email, expires_at, created_at`,
      [student_id, parent_email, token_hash, otp_code_hash, expires_at]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('❌ Failed to create email verification token:', error.message);
    throw new AppError('Failed to create verification token', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Find valid verification token
 */
export const findVerificationToken = async (tokenHash) => {
  await ensureParentDeliverySchema();
  try {
    const result = await query(
      `SELECT * FROM parent_email_verification_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1`,
      [tokenHash]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('❌ Failed to find verification token:', error.message);
    return null;
  }
};

/**
 * Find valid OTP for student (checks expiry, used_at, and max failed attempts)
 */
export const findVerificationOtp = async (studentId, otpHash) => {
  await ensureParentDeliverySchema();
  try {
    const result = await query(
      `SELECT * FROM parent_email_verification_tokens
       WHERE student_id = $1
         AND otp_code_hash = $2
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
         AND COALESCE(failed_attempts, 0) < 5
       ORDER BY created_at DESC
       LIMIT 1`,
      [studentId, otpHash]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('❌ Failed to find verification OTP:', error.message);
    return null;
  }
};

/**
 * Find active unexpired, unused token for a student
 */
export const findActiveTokenByStudent = async (studentId) => {
  await ensureParentDeliverySchema();
  try {
    const result = await query(
      `SELECT * FROM parent_email_verification_tokens
       WHERE student_id = $1
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC
       LIMIT 1`,
      [studentId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('❌ Failed to find active token by student:', error.message);
    return null;
  }
};

/**
 * Increment failed OTP attempts on a token and lock if threshold reached
 */
export const incrementTokenFailedAttempts = async (tokenId) => {
  await ensureParentDeliverySchema();
  try {
    const result = await query(
      `UPDATE parent_email_verification_tokens
       SET failed_attempts = COALESCE(failed_attempts, 0) + 1,
           used_at = CASE WHEN COALESCE(failed_attempts, 0) + 1 >= 5 THEN CURRENT_TIMESTAMP ELSE used_at END
       WHERE id = $1
       RETURNING failed_attempts, used_at`,
      [tokenId]
    );
    return result.rows[0] || { failed_attempts: 0, used_at: null };
  } catch (error) {
    logger.error('❌ Failed to increment token attempts:', error.message);
    return { failed_attempts: 0, used_at: null };
  }
};

/**
 * Invalidate all pending tokens for a student (e.g. upon email address change)
 */
export const invalidateStudentTokens = async (studentId) => {
  await ensureParentDeliverySchema();
  try {
    await query(
      `UPDATE parent_email_verification_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE student_id = $1 AND used_at IS NULL`,
      [studentId]
    );
    return true;
  } catch (error) {
    logger.error('❌ Failed to invalidate student tokens:', error.message);
    return false;
  }
};

/**
 * Rate limit query: Get recent verification requests in a time window
 */
export const getRecentTokenCount = async (studentId, windowMinutes = 60) => {
  await ensureParentDeliverySchema();
  try {
    const result = await query(
      `SELECT COUNT(*)::int AS count,
              MAX(created_at) AS last_created_at
       FROM parent_email_verification_tokens
       WHERE student_id = $1
         AND created_at >= (CURRENT_TIMESTAMP - ($2 || ' minutes')::interval)`,
      [studentId, windowMinutes]
    );
    return {
      count: result.rows[0]?.count || 0,
      lastCreatedAt: result.rows[0]?.last_created_at ? new Date(result.rows[0].last_created_at) : null,
    };
  } catch (error) {
    logger.error('❌ Failed to get recent token count:', error.message);
    return { count: 0, lastCreatedAt: null };
  }
};

/**
 * Mark token as used
 */
export const markTokenUsed = async (tokenId) => {
  await ensureParentDeliverySchema();
  try {
    await query(
      `UPDATE parent_email_verification_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [tokenId]
    );
    return true;
  } catch (error) {
    logger.error('❌ Failed to mark token used:', error.message);
    return false;
  }
};

/**
 * Log consent audit entry
 */
export const logConsentHistory = async ({
  student_id,
  consent_status,
  action,
  recorded_by_user_id = null,
  recorded_by_name = 'Staff',
  source_method = 'DIRECT_PORTAL',
  notes = null,
}) => {
  await ensureParentDeliverySchema();
  try {
    const result = await query(
      `INSERT INTO parent_consent_history (
         student_id, consent_status, action, recorded_by_user_id,
         recorded_by_name, source_method, notes, timestamp
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        student_id,
        Boolean(consent_status),
        action,
        recorded_by_user_id,
        recorded_by_name,
        source_method,
        notes,
      ]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('❌ Failed to log consent history:', error.message);
    return null;
  }
};

/**
 * Get consent audit history for a student
 */
export const getConsentHistory = async (studentId) => {
  await ensureParentDeliverySchema();
  try {
    const result = await query(
      `SELECT * FROM parent_consent_history
       WHERE student_id = $1
       ORDER BY timestamp DESC`,
      [studentId]
    );
    return result.rows;
  } catch (error) {
    logger.error('❌ Failed to fetch consent history:', error.message);
    return [];
  }
};

export default {
  ensureParentDeliverySchema,
  createDeliveryRecord,
  updateDeliveryStatus,
  getDeliveryById,
  getDeliveriesByStudent,
  checkSuccessfulDelivery,
  createVerificationToken,
  findVerificationToken,
  findVerificationOtp,
  findActiveTokenByStudent,
  incrementTokenFailedAttempts,
  invalidateStudentTokens,
  getRecentTokenCount,
  markTokenUsed,
  logConsentHistory,
  getConsentHistory,
};

