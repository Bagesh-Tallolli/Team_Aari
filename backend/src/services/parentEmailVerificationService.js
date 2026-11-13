import crypto from 'node:crypto';
import env from '../config/env.js';
import studentModel from '../models/studentModel.js';
import parentDeliveryModel from '../models/parentDeliveryModel.js';
import emailService, { isValidEmail, escapeHtml } from './emailService.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';

/**
 * Hash helper for tokens and OTPs (Keyed HMAC-SHA256)
 * Uses a server-side secret key and optional student salt to prevent rainbow-table
 * precomputation attacks against low-entropy 6-digit OTPs.
 */
export const hashSecret = (secret, salt = '') => {
  const hmacKey = process.env.OTP_HMAC_SECRET || env.JWT_SECRET || 'pm_poshan_otp_hmac_secret_2026';
  const data = salt ? `${salt}:${String(secret).trim()}` : String(secret).trim();
  return crypto.createHmac('sha256', hmacKey).update(data).digest('hex');
};

/**
 * Generate a cryptographically secure random token (32 bytes hex)
 */
export const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate a 6-digit numeric OTP code
 */
export const generateNumericOtp = () => {
  return String(crypto.randomInt(100000, 999999));
};

/**
 * Initiate email verification workflow by sending an expiring token & OTP
 * 
 * @param {number} studentId
 * @param {object} [userContext]
 * @returns {Promise<object>}
 */
export const initiateEmailVerification = async (studentId, userContext = null) => {
  const sId = parseInt(studentId, 10);
  if (isNaN(sId)) {
    throw new AppError('Invalid Student ID format', HTTP_STATUS.BAD_REQUEST);
  }

  const student = await studentModel.getStudentById(sId);
  const parentEmail = student.parent_email;

  if (!parentEmail || !isValidEmail(parentEmail)) {
    throw new AppError('Cannot send verification: No valid parent email registered for this student.', HTTP_STATUS.BAD_REQUEST);
  }

  // Rate Limiting Check (Anti-Spam / Cooldown)
  const rateInfo = await parentDeliveryModel.getRecentTokenCount(sId, 60);
  if (rateInfo.lastCreatedAt && (Date.now() - rateInfo.lastCreatedAt.getTime()) < 60 * 1000) {
    const waitSec = Math.ceil((60 * 1000 - (Date.now() - rateInfo.lastCreatedAt.getTime())) / 1000);
    throw new AppError(`Rate limit reached: Please wait ${waitSec} seconds before requesting another verification email.`, HTTP_STATUS.TOO_MANY_REQUESTS);
  }
  if (rateInfo.count >= 5) {
    throw new AppError('Rate limit exceeded: Maximum 5 verification requests allowed per hour for this student.', HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  // Generate tokens
  const rawToken = generateSecureToken();
  const rawOtp = generateNumericOtp();

  const tokenHash = hashSecret(rawToken);
  const otpHash = hashSecret(rawOtp, sId);

  // Expiration: 24 hours for web link, 15 minutes for OTP
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Save to database
  await parentDeliveryModel.createVerificationToken({
    student_id: sId,
    parent_email: parentEmail,
    token_hash: tokenHash,
    otp_code_hash: otpHash,
    expires_at: expiresAt,
  });

  // Construct verification URL
  const backendBaseUrl = process.env.BACKEND_URL || 'http://localhost:5001';
  const verificationLink = `${backendBaseUrl}/api/parent-report-deliveries/verify-email?token=${rawToken}&studentId=${sId}`;

  // Prepare Verification Email
  const subject = `Verify Parent Email – PM POSHAN Mid-Day Meal Scheme – ${student.name}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e293b; margin-top: 0;">PM POSHAN — Parent Email Verification</h2>
      <p style="color: #475569; font-size: 14px;">
        Dear Parent/Guardian of <strong>${escapeHtml(student.name)}</strong>,
      </p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        The school administration has registered this email address to receive weekly nutrition and mid-day meal assurance reports for your child.
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="${verificationLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">
          Verify Email Address
        </a>
      </div>

      <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 12px; text-align: center; margin: 16px 0;">
        <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 4px;">Alternatively, provide this 6-Digit OTP code to school staff:</span>
        <strong style="font-size: 22px; letter-spacing: 4px; color: #0f172a;">${rawOtp}</strong>
        <span style="font-size: 11px; color: #94a3b8; display: block; margin-top: 4px;">OTP is valid for 15 minutes. Link valid for 24 hours.</span>
      </div>

      <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 20px;">
        If you did not request this or your child does not attend this school, please disregard this email.
      </p>
    </div>
  `;

  const text = `
PM POSHAN — Parent Email Verification
Student: ${student.name}

To verify your email address to receive weekly nutrition reports, click the link below:
${verificationLink}

Or use OTP Code: ${rawOtp} (valid for 15 minutes)
  `.trim();

  // Send email
  await emailService.sendEmail({
    to: parentEmail,
    subject,
    html,
    text,
  });

  logger.info(`📧 Parent verification email dispatched for student ID: ${sId} to ${parentEmail}`);

  // SECURITY: Never return raw token or OTP in API response
  return {
    success: true,
    student_id: sId,
    parent_email: parentEmail,
    message: 'Verification link and OTP code sent to parent email address.',
    expires_at: expiresAt.toISOString(),
  };
};

/**
 * Validate token preview without consuming it (safe for GET requests / email scanners)
 * 
 * @param {string} rawToken
 * @param {number} studentId
 * @returns {Promise<object>}
 */
export const validateEmailTokenPreview = async (rawToken, studentId) => {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new AppError('Verification token is missing or malformed', HTTP_STATUS.BAD_REQUEST);
  }

  const sId = parseInt(studentId, 10);
  if (isNaN(sId)) {
    throw new AppError('Invalid Student ID format', HTTP_STATUS.BAD_REQUEST);
  }

  const tokenHash = hashSecret(rawToken);
  const tokenRecord = await parentDeliveryModel.findVerificationToken(tokenHash);

  if (!tokenRecord) {
    throw new AppError('Verification token is invalid, expired, or has already been used.', HTTP_STATUS.BAD_REQUEST);
  }

  if (Number(tokenRecord.student_id) !== sId) {
    throw new AppError('Token does not match the specified student record.', HTTP_STATUS.FORBIDDEN);
  }

  const student = await studentModel.getStudentById(sId);

  return {
    isValid: true,
    student_id: sId,
    student_name: student.name,
    parent_email: tokenRecord.parent_email,
    expires_at: tokenRecord.expires_at,
  };
};

/**
 * Verify email using single-use web token (clicked from parent email)
 * 
 * @param {string} rawToken
 * @param {number} studentId
 * @returns {Promise<object>}
 */
export const verifyEmailWithToken = async (rawToken, studentId) => {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new AppError('Verification token is missing or malformed', HTTP_STATUS.BAD_REQUEST);
  }

  const sId = parseInt(studentId, 10);
  if (isNaN(sId)) {
    throw new AppError('Invalid Student ID format', HTTP_STATUS.BAD_REQUEST);
  }

  const tokenHash = hashSecret(rawToken);
  const tokenRecord = await parentDeliveryModel.findVerificationToken(tokenHash);

  if (!tokenRecord) {
    throw new AppError('Verification token is invalid, expired, or has already been used.', HTTP_STATUS.BAD_REQUEST);
  }

  if (Number(tokenRecord.student_id) !== sId) {
    throw new AppError('Token does not match the specified student record.', HTTP_STATUS.FORBIDDEN);
  }

  // Mark token used
  await parentDeliveryModel.markTokenUsed(tokenRecord.id);

  // Fetch current contact to preserve actual consent status in audit record
  const currentContact = await studentModel.getParentContact(sId);

  // Update student verification status
  await studentModel.updateParentContact(sId, {
    parent_email_verified: true,
  });

  // Log to audit history
  await parentDeliveryModel.logConsentHistory({
    student_id: sId,
    consent_status: Boolean(currentContact.parent_report_consent),
    action: 'EMAIL_VERIFIED_VIA_TOKEN',
    recorded_by_name: 'Parent (Self-Verified via Link)',
    source_method: 'VERIFIED_EMAIL_LINK',
    notes: `Verified email ${tokenRecord.parent_email} via token ID ${tokenRecord.id}`,
  });

  logger.info(`✅ Parent email successfully verified for student ID: ${sId}`);

  return {
    success: true,
    student_id: sId,
    parent_email: tokenRecord.parent_email,
    verified_at: new Date().toISOString(),
    message: 'Parent email address verified successfully.',
  };
};

/**
 * Verify email using 6-digit OTP code (submitted by staff or parent)
 * 
 * @param {number} studentId
 * @param {string} rawOtp
 * @param {object} [userContext]
 * @returns {Promise<object>}
 */
export const verifyEmailWithOtp = async (studentId, rawOtp, userContext = null) => {
  const sId = parseInt(studentId, 10);
  if (isNaN(sId)) {
    throw new AppError('Invalid Student ID format', HTTP_STATUS.BAD_REQUEST);
  }

  if (!rawOtp || String(rawOtp).trim().length !== 6) {
    throw new AppError('Please provide a valid 6-digit OTP code.', HTTP_STATUS.BAD_REQUEST);
  }

  // Rate Limiting & Brute-force protection: Check active token attempts
  const activeToken = await parentDeliveryModel.findActiveTokenByStudent(sId);
  if (!activeToken) {
    throw new AppError('No active verification request found. Please request a new OTP.', HTTP_STATUS.BAD_REQUEST);
  }
  if ((activeToken.failed_attempts || 0) >= 5) {
    throw new AppError('Too many failed OTP attempts. This verification token has been locked for security. Please request a new code.', HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  const otpHash = hashSecret(String(rawOtp).trim(), sId);
  const tokenRecord = await parentDeliveryModel.findVerificationOtp(sId, otpHash);

  if (!tokenRecord) {
    const updated = await parentDeliveryModel.incrementTokenFailedAttempts(activeToken.id);
    const attempts = updated.failed_attempts || 0;
    const remaining = Math.max(0, 5 - attempts);
    if (remaining === 0) {
      throw new AppError('Too many failed OTP attempts. This verification code has now been locked for security. Please request a new code.', HTTP_STATUS.TOO_MANY_REQUESTS);
    }
    throw new AppError(`Invalid OTP code. ${remaining} attempt(s) remaining before lock.`, HTTP_STATUS.BAD_REQUEST);
  }

  // Mark token used
  await parentDeliveryModel.markTokenUsed(tokenRecord.id);

  // Fetch current contact to preserve actual consent status in audit record
  const currentContact = await studentModel.getParentContact(sId);

  // Update student verification status
  await studentModel.updateParentContact(sId, {
    parent_email_verified: true,
  });

  // Log to audit history
  await parentDeliveryModel.logConsentHistory({
    student_id: sId,
    consent_status: Boolean(currentContact.parent_report_consent),
    action: 'EMAIL_VERIFIED_VIA_OTP',
    recorded_by_user_id: userContext?.id || null,
    recorded_by_name: userContext?.name || 'Authorized Staff',
    source_method: 'OTP_VERIFICATION',
    notes: `Verified email ${tokenRecord.parent_email} via OTP`,
  });

  logger.info(`✅ Parent email verified via OTP for student ID: ${sId}`);

  return {
    success: true,
    student_id: sId,
    parent_email: tokenRecord.parent_email,
    verified_at: new Date().toISOString(),
    message: 'Parent email address verified successfully via OTP.',
  };
};

export default {
  hashSecret,
  generateSecureToken,
  generateNumericOtp,
  initiateEmailVerification,
  validateEmailTokenPreview,
  verifyEmailWithToken,
  verifyEmailWithOtp,
};
