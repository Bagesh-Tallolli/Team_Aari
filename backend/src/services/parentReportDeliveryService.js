import studentModel from '../models/studentModel.js';
import parentDeliveryModel from '../models/parentDeliveryModel.js';
import weeklyNutritionAnalysisService from './weeklyNutritionAnalysisService.js';
import dietRecommendationService from './dietRecommendationService.js';
import pdfReportService from './pdfReportService.js';
import emailService, { isValidEmail } from './emailService.js';
import parentEmailVerificationService from './parentEmailVerificationService.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';

/**
 * ============================================================================
 * Parent Report Delivery Service (Phase 7)
 * ============================================================================
 * 
 * Orchestrates:
 * 1. Parent contact & verification checks
 * 2. Weekly report preview generation
 * 3. Idempotent email dispatch with attached signed PDF report
 * 4. Comprehensive audit delivery tracking in PostgreSQL
 */

/**
 * Get parent contact details & report readiness status for a student
 * 
 * @param {number} studentId
 * @returns {Promise<object>}
 */
export const getParentContact = async (studentId) => {
  const sId = parseInt(studentId, 10);
  if (isNaN(sId)) {
    throw new AppError('Invalid Student ID format', HTTP_STATUS.BAD_REQUEST);
  }

  await parentDeliveryModel.ensureParentDeliverySchema();
  return studentModel.getParentContact(sId);
};

/**
 * Update student parent contact and consent status
 * 
 * @param {number} studentId
 * @param {object} contactData
 * @returns {Promise<object>}
 */
export const updateParentContact = async (studentId, contactData) => {
  const sId = parseInt(studentId, 10);
  if (isNaN(sId)) {
    throw new AppError('Invalid Student ID format', HTTP_STATUS.BAD_REQUEST);
  }

  await parentDeliveryModel.ensureParentDeliverySchema();

  if (contactData.parent_email && !isValidEmail(contactData.parent_email)) {
    throw new AppError('Invalid parent email address format', HTTP_STATUS.BAD_REQUEST);
  }

  logger.info(`📝 Updating parent contact details for student ID: ${sId}`);
  return studentModel.updateParentContact(sId, contactData);
};

/**
 * Preview weekly report email and verify delivery prerequisites
 * 
 * @param {number} studentId
 * @returns {Promise<object>}
 */
export const previewWeeklyReportEmail = async (studentId) => {
  const sId = parseInt(studentId, 10);
  if (isNaN(sId)) {
    throw new AppError('Invalid Student ID format', HTTP_STATUS.BAD_REQUEST);
  }

  await parentDeliveryModel.ensureParentDeliverySchema();

  // 1. Fetch student and parent details
  const student = await studentModel.getStudentById(sId);
  const parentContact = await studentModel.getParentContact(sId);

  // 2. Fetch or generate Phase 6 weekly nutrition analysis
  const weeklyReport = await weeklyNutritionAnalysisService.getLatestWeeklyAnalysis(sId);

  // 3. Optional Phase 5 diet recommendations
  let dietPlan = null;
  try {
    dietPlan = await dietRecommendationService.getLatestRecommendation(sId);
  } catch (err) {
    logger.debug(`Diet plan note for preview: ${err.message}`);
  }

  // 4. Render HTML email template & plain text preview
  const emailContent = emailService.renderParentEmailTemplate(weeklyReport, dietPlan);

  // 5. Evaluate delivery readiness checks
  const hasParentEmail = Boolean(parentContact.parent_email && isValidEmail(parentContact.parent_email));
  const isEmailVerified = Boolean(parentContact.parent_email_verified);
  const hasConsent = Boolean(parentContact.parent_report_consent);
  const hasWeeklyReport = Boolean(weeklyReport && weeklyReport.daily_breakdown?.length > 0);

  const blockingReasons = [];
  if (!hasParentEmail) blockingReasons.push('Parent email address is missing or invalid.');
  if (!isEmailVerified) blockingReasons.push('Parent email address has not been verified.');
  if (!hasConsent) blockingReasons.push('Parent/guardian report delivery consent has not been recorded.');
  if (!hasWeeklyReport) blockingReasons.push('No weekly nutrition report is available for this student.');

  const isReadyToSend = blockingReasons.length === 0;

  return {
    student_id: sId,
    student_name: student.name,
    parent_contact: parentContact,
    readiness: {
      is_ready_to_send: isReadyToSend,
      checks: {
        has_parent_email: hasParentEmail,
        is_email_verified: isEmailVerified,
        has_consent: hasConsent,
        has_weekly_report: hasWeeklyReport,
      },
      blocking_reasons: blockingReasons,
    },
    email_preview: {
      to: parentContact.parent_email || null,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      pdf_attached: true,
      pdf_name: `Weekly_Nutrition_Report_${sId}_${weeklyReport.period?.end_date || 'current'}.pdf`,
    },
    weekly_report_summary: {
      report_id: weeklyReport.report_id,
      period: weeklyReport.period,
      avg_daily_calories: weeklyReport.school_meal_intake?.avg_daily_calories,
      avg_daily_protein: weeklyReport.school_meal_intake?.avg_daily_protein,
      target_fulfillment_pct: weeklyReport.pm_poshan_target?.calorie_fulfillment_pct,
    },
  };
};

/**
 * Send Weekly Nutrition Report to Parent via Email
 * 
 * @param {number} studentId
 * @param {object} options - { forceResend: boolean }
 * @returns {Promise<object>}
 */
export const sendWeeklyReportToParent = async (studentId, options = {}) => {
  const sId = parseInt(studentId, 10);
  if (isNaN(sId)) {
    throw new AppError('Invalid Student ID format', HTTP_STATUS.BAD_REQUEST);
  }

  await parentDeliveryModel.ensureParentDeliverySchema();

  // Step 1: Fetch student and verify existence
  const student = await studentModel.getStudentById(sId);
  const parentContact = await studentModel.getParentContact(sId);

  // Step 2: Strict Privacy & Consent Pre-Conditions
  if (!parentContact.parent_email || !isValidEmail(parentContact.parent_email)) {
    throw new AppError('Cannot send report: Parent email address is missing or invalid.', HTTP_STATUS.BAD_REQUEST);
  }

  if (!parentContact.parent_email_verified) {
    throw new AppError('Cannot send report: Parent email address has not been verified.', HTTP_STATUS.FORBIDDEN);
  }

  if (!parentContact.parent_report_consent) {
    throw new AppError('Cannot send report: Parent report delivery consent has not been granted.', HTTP_STATUS.FORBIDDEN);
  }

  // Step 3: Retrieve or generate Phase 6 weekly nutrition analysis
  const weeklyReport = await weeklyNutritionAnalysisService.getLatestWeeklyAnalysis(sId);
  const weeklyReportId = weeklyReport.report_id || null;

  // Step 4: Duplicate, Concurrency & Idempotency Check
  if (!options.forceResend && weeklyReportId) {
    const priorSuccessful = await parentDeliveryModel.checkSuccessfulDelivery(sId, weeklyReportId);
    if (priorSuccessful) {
      logger.warn(`⚠️ Report ${weeklyReportId} already delivered to ${parentContact.parent_email} on ${priorSuccessful.sent_at}`);
      return {
        success: false,
        delivery_status: 'Already Sent',
        duplicate_prevented: true,
        prior_delivery: {
          id: priorSuccessful.id,
          sent_at: priorSuccessful.sent_at,
          provider_message_id: priorSuccessful.provider_message_id,
        },
        message: 'This weekly report has already been delivered to the parent. Use explicit resend to deliver again.',
      };
    }
  }

  // Concurrency Guard: Check for an active in-flight dispatch queued within the last 5 minutes
  if (weeklyReportId) {
    const activeDeliveries = await parentDeliveryModel.getDeliveriesByStudent(sId, 5);
    const activeFlight = activeDeliveries.find(
      (d) => Number(d.weekly_report_id) === Number(weeklyReportId) &&
             d.delivery_status === 'Queued' &&
             (Date.now() - new Date(d.created_at).getTime()) < 5 * 60 * 1000
    );
    if (activeFlight) {
      logger.warn(`⚠️ Concurrency lock engaged: Report ${weeklyReportId} for student ${sId} has a dispatch already in flight`);
      return {
        success: false,
        delivery_status: 'Queued',
        concurrency_locked: true,
        message: 'A report delivery is currently in progress for this student. Please wait.',
      };
    }
  }

  // Step 5: Retrieve optional Phase 5 diet recommendations
  let dietPlan = null;
  try {
    dietPlan = await dietRecommendationService.getLatestRecommendation(sId);
  } catch (err) {
    logger.debug(`Diet plan note: ${err.message}`);
  }

  // Step 6: Generate official signed PDF report card
  logger.info(`📑 Generating PDF for student ${sId} parent report delivery...`);
  const pdfResult = await pdfReportService.generateWeeklyNutritionPdf(weeklyReport, dietPlan);

  // Step 7: Render HTML & Text email template
  const emailContent = emailService.renderParentEmailTemplate(weeklyReport, dietPlan);

  // Step 8: Create pending delivery record in PostgreSQL with atomic DB concurrency lock
  const isLive = Boolean(process.env.SMTP_HOST && process.env.SMTP_HOST !== 'mock' && !process.env.SMTP_TEST_MODE);
  const transportMode = isLive ? 'live_smtp' : 'mock';

  let deliveryRecord;
  try {
    deliveryRecord = await parentDeliveryModel.createDeliveryRecord({
      student_id: sId,
      weekly_report_id: weeklyReportId,
      parent_email: parentContact.parent_email,
      delivery_status: 'Queued',
      email_subject: emailContent.subject,
      pdf_path: pdfResult.filePath,
      metadata: {
        period: weeklyReport.period,
        force_resend: Boolean(options.forceResend),
        authorized_by_user_id: options.userContext?.id || null,
        authorized_by_name: options.userContext?.name || options.userContext?.email || 'Authorized Staff',
        resend_reason: options.resendReason || (options.forceResend ? 'Staff authorized manual resend' : null),
        transport_mode: transportMode,
      },
    });
  } catch (dbErr) {
    // Catch database-level unique constraint violations (duplicate normal dispatch or concurrent in-flight dispatch)
    if (dbErr.code === '23505' || dbErr.message?.includes('uq_parent_delivery_in_flight') || dbErr.message?.includes('uq_parent_delivery_active_dispatch')) {
      logger.warn(`⚠️ Concurrency lock engaged at DB level for student ${sId} and report ${weeklyReportId}`);
      return {
        success: false,
        delivery_status: 'Queued',
        concurrency_locked: true,
        message: 'A report delivery is currently in progress for this student. Please wait.',
      };
    }
    throw dbErr;
  }

  // Step 9: Execute Email Transmission
  try {
    logger.info(`🚀 Transmitting weekly report to ${parentContact.parent_email}...`);
    const sendResult = await emailService.sendEmail({
      to: parentContact.parent_email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      attachments: [
        {
          fileName: pdfResult.fileName,
          buffer: pdfResult.buffer,
          contentType: 'application/pdf',
        },
      ],
    });

    // Step 10: Update delivery record on confirmed acceptance
    const updatedRecord = await parentDeliveryModel.updateDeliveryStatus(deliveryRecord.id, {
      delivery_status: 'Sent',
      provider_message_id: sendResult.messageId,
      sent_at: new Date(),
    });

    logger.info(`✅ Parent report successfully delivered (Delivery ID: ${deliveryRecord.id}, Message ID: ${sendResult.messageId})`);

    return {
      success: true,
      delivery_id: deliveryRecord.id,
      delivery_status: 'Sent',
      parent_email: parentContact.parent_email,
      provider_message_id: sendResult.messageId,
      transport_mode: transportMode,
      sent_at: updatedRecord.sent_at,
      pdf_path: pdfResult.filePath,
      message: 'Weekly nutrition report successfully delivered to parent email.',
    };
  } catch (sendError) {
    logger.error(`❌ Parent report delivery failed for student ${sId}: ${sendError.message}`);

    await parentDeliveryModel.updateDeliveryStatus(deliveryRecord.id, {
      delivery_status: 'Failed',
      failure_reason: sendError.message,
    });

    throw new AppError(`Email delivery failed: ${sendError.message}`, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }
};

/**
 * Get delivery history for a student
 * 
 * @param {number} studentId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export const getStudentDeliveryHistory = async (studentId, limit = 20) => {
  const sId = parseInt(studentId, 10);
  if (isNaN(sId)) {
    throw new AppError('Invalid Student ID format', HTTP_STATUS.BAD_REQUEST);
  }

  await parentDeliveryModel.ensureParentDeliverySchema();
  return parentDeliveryModel.getDeliveriesByStudent(sId, limit);
};

/**
 * Get delivery details by delivery ID
 * 
 * @param {number} deliveryId
 * @returns {Promise<object>}
 */
export const getDeliveryById = async (deliveryId) => {
  const dId = parseInt(deliveryId, 10);
  if (isNaN(dId)) {
    throw new AppError('Invalid Delivery ID format', HTTP_STATUS.BAD_REQUEST);
  }

  await parentDeliveryModel.ensureParentDeliverySchema();
  const record = await parentDeliveryModel.getDeliveryById(dId);
  if (!record) {
    throw new AppError('Delivery record not found', HTTP_STATUS.NOT_FOUND);
  }
  return record;
};

/**
 * Generate or get PDF report buffer for staff download/viewing
 * 
 * @param {number} studentId
 * @returns {Promise<{ filePath: string, buffer: Buffer, fileName: string }>}
 */
export const getWeeklyReportPdf = async (studentId) => {
  const sId = parseInt(studentId, 10);
  if (isNaN(sId)) {
    throw new AppError('Invalid Student ID format', HTTP_STATUS.BAD_REQUEST);
  }

  const weeklyReport = await weeklyNutritionAnalysisService.getLatestWeeklyAnalysis(sId);
  let dietPlan = null;
  try {
    dietPlan = await dietRecommendationService.getLatestRecommendation(sId);
  } catch (err) {}

  return pdfReportService.generateWeeklyNutritionPdf(weeklyReport, dietPlan);
};

/**
 * Withdraw parent consent and log audit trail
 */
export const withdrawParentConsent = async (studentId, userContext = null, reason = 'Parent requested withdrawal') => {
  const sId = parseInt(studentId, 10);
  if (isNaN(sId)) {
    throw new AppError('Invalid Student ID format', HTTP_STATUS.BAD_REQUEST);
  }

  logger.warn(`🛑 Withdrawing parent report consent for student ID: ${sId}`);
  return studentModel.updateParentContact(sId, {
    parent_report_consent: false,
    consent_source: 'PARENT_OPT_OUT',
  }, userContext);
};

/**
 * Send email verification token & OTP to registered parent email
 */
export const sendVerificationEmail = async (studentId, userContext = null) => {
  return parentEmailVerificationService.initiateEmailVerification(studentId, userContext);
};

/**
 * Verify parent email with 6-digit OTP
 */
export const verifyParentOtp = async (studentId, otpCode, userContext = null) => {
  return parentEmailVerificationService.verifyEmailWithOtp(studentId, otpCode, userContext);
};

/**
 * Validate token preview without consuming it (safe for scanners / GET requests)
 */
export const validateEmailTokenPreview = async (token, studentId) => {
  return parentEmailVerificationService.validateEmailTokenPreview(token, studentId);
};

/**
 * Verify parent email with link token (explicit consumption action)
 */
export const verifyParentToken = async (token, studentId) => {
  return parentEmailVerificationService.verifyEmailWithToken(token, studentId);
};

/**
 * Retrieve consent audit trail for a student
 */
export const getConsentHistory = async (studentId) => {
  const sId = parseInt(studentId, 10);
  if (isNaN(sId)) {
    throw new AppError('Invalid Student ID format', HTTP_STATUS.BAD_REQUEST);
  }
  return parentDeliveryModel.getConsentHistory(sId);
};

export default {
  getParentContact,
  updateParentContact,
  previewWeeklyReportEmail,
  sendWeeklyReportToParent,
  getStudentDeliveryHistory,
  getDeliveryById,
  getWeeklyReportPdf,
  withdrawParentConsent,
  sendVerificationEmail,
  verifyParentOtp,
  validateEmailTokenPreview,
  verifyParentToken,
  getConsentHistory,
};

