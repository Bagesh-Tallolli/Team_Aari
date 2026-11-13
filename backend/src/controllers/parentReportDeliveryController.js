import parentReportDeliveryService from '../services/parentReportDeliveryService.js';
import * as studentService from '../services/studentService.js';
import * as parentDeliveryModel from '../models/parentDeliveryModel.js';
import logger from '../utils/logger.js';
import { AppError } from '../middlewares/errorHandler.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../utils/httpStatus.js';

/**
 * Parent Report Delivery Controller (Phase 7)
 * Handles endpoints for parent contact management, weekly report preview,
 * email transmission, and delivery auditing.
 */

/**
 * GET /api/students/:id/parent-contact
 * Retrieve parent/guardian contact details and report consent status
 */
export const getParentContact = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const contact = await parentReportDeliveryService.getParentContact(studentId);

  res.status(HTTP_STATUS.OK).json(
    successResponse(contact, 'Parent contact details retrieved successfully', HTTP_STATUS.OK)
  );
});

/**
 * PUT /api/students/:id/parent-contact
 * Update parent/guardian contact details and report consent
 * Note: parent_email_verified cannot be manually toggled here; requires OTP or link verification.
 */
export const updateParentContact = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const { parent_email_verified, ...safeContactData } = req.body;
  const updated = await parentReportDeliveryService.updateParentContact(studentId, safeContactData, req.user);

  res.status(HTTP_STATUS.OK).json(
    successResponse(updated, 'Parent contact details updated successfully', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/students/:id/weekly-report/preview
 * Generate a preview of the parent report email, readiness checks, and PDF metadata
 */
export const previewWeeklyReport = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const preview = await parentReportDeliveryService.previewWeeklyReportEmail(studentId);

  res.status(HTTP_STATUS.OK).json(
    successResponse(preview, 'Weekly report email preview generated successfully', HTTP_STATUS.OK)
  );
});

/**
 * POST /api/students/:id/weekly-report/send
 * Staff approved transmission of the weekly report to the verified parent email
 */
export const sendWeeklyReport = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const options = {
    forceResend: Boolean(req.body?.forceResend),
    resendReason: req.body?.reason || req.body?.resendReason || 'Staff authorized manual resend',
    userContext: req.user,
  };

  const result = await parentReportDeliveryService.sendWeeklyReportToParent(studentId, options);

  const statusCode = result.success ? HTTP_STATUS.OK : HTTP_STATUS.OK;
  res.status(statusCode).json(
    successResponse(result, result.message || 'Weekly report dispatch processed', statusCode)
  );
});

/**
 * GET /api/students/:id/weekly-report/delivery-history
 * Retrieve audit history of email deliveries for this student
 */
export const getDeliveryHistory = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const history = await parentReportDeliveryService.getStudentDeliveryHistory(studentId, limit);

  res.status(HTTP_STATUS.OK).json(
    successResponse(history, 'Student report delivery history retrieved successfully', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/students/:id/weekly-report/pdf
 * Download or stream the generated PDF report card for staff viewing
 */
export const downloadReportPdf = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const pdfResult = await parentReportDeliveryService.getWeeklyReportPdf(studentId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${pdfResult.fileName}"`);
  res.send(pdfResult.buffer);
});

/**
 * GET /api/parent-report-deliveries/:deliveryId
 * Retrieve a specific delivery attempt by delivery record ID
 */
export const getDeliveryById = asyncHandler(async (req, res) => {
  const deliveryId = parseInt(req.params.deliveryId, 10);
  const delivery = await parentReportDeliveryService.getDeliveryById(deliveryId);

  res.status(HTTP_STATUS.OK).json(
    successResponse(delivery, 'Delivery record retrieved successfully', HTTP_STATUS.OK)
  );
});

/**
 * POST /api/students/:id/parent-contact/send-verification
 * Send verification email link and OTP code to parent email address
 */
export const sendVerificationEmail = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const result = await parentReportDeliveryService.sendVerificationEmail(studentId, req.user);

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, result.message || 'Verification email sent', HTTP_STATUS.OK)
  );
});

/**
 * POST /api/students/:id/parent-contact/verify-otp
 * Verify parent email using submitted 6-digit OTP code
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const { otp_code } = req.body;
  const result = await parentReportDeliveryService.verifyParentOtp(studentId, otp_code, req.user);

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, result.message || 'Email verified successfully via OTP', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/parent-report-deliveries/verify-email
 * Safe verification landing page (invoked when parent clicks email link)
 * SECURITY NOTE: Does NOT consume the token on GET to protect against automated email scanners.
 * Displays a branded confirmation prompt requiring explicit user action.
 */
export const getVerificationLandingPage = asyncHandler(async (req, res) => {
  const { token, studentId } = req.query;
  const sId = parseInt(studentId, 10);

  // Validate token without consuming it
  const preview = await parentReportDeliveryService.validateEmailTokenPreview(token, sId);

  // If request accepts HTML (standard browser click), return confirmation prompt
  if (req.headers.accept?.includes('text/html')) {
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Confirm Email Verification - PM POSHAN</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: #ffffff; max-width: 480px; width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 32px; text-align: center; border: 1px solid #e2e8f0; }
          .icon { width: 56px; height: 56px; border-radius: 50%; background: #e0e7ff; color: #4f46e5; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
          h1 { font-size: 22px; color: #0f172a; margin: 0 0 8px 0; }
          p { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0; }
          .btn { background: #4f46e5; color: #ffffff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s; width: 100%; }
          .btn:hover { background: #4338ca; }
          .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✉</div>
          <h1>Confirm Email Verification</h1>
          <p>Please confirm that you wish to verify <strong>${preview.parent_email}</strong> to receive weekly PM POSHAN mid-day meal nutrition reports for <strong>${preview.student_name}</strong>.</p>
          <form method="POST" action="/api/parent-report-deliveries/confirm-verification">
            <input type="hidden" name="token" value="${token}" />
            <input type="hidden" name="studentId" value="${sId}" />
            <button type="submit" class="btn">Confirm Email Verification</button>
          </form>
          <div class="footer">AI-Based Nutrition Assurance &amp; Personalised Diet Recommendation System</div>
        </div>
      </body>
      </html>
    `);
  }

  res.status(HTTP_STATUS.OK).json(
    successResponse(preview, 'Verification token valid. Submit POST to confirm verification.', HTTP_STATUS.OK)
  );
});

/**
 * POST /api/parent-report-deliveries/confirm-verification
 * Explicit action that consumes the single-use token and verifies the email.
 */
export const confirmVerificationToken = asyncHandler(async (req, res) => {
  const token = req.body?.token || req.query?.token;
  const studentId = req.body?.studentId || req.query?.studentId;
  const sId = parseInt(studentId, 10);

  const result = await parentReportDeliveryService.verifyParentToken(token, sId);

  // If request accepts HTML (standard browser click), return branded confirmation page
  if (req.headers.accept?.includes('text/html')) {
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Email Verified - PM POSHAN</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: #ffffff; max-width: 480px; width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 32px; text-align: center; border: 1px solid #e2e8f0; }
          .badge { width: 56px; height: 56px; border-radius: 50%; background: #dcfce7; color: #16a34a; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 16px; }
          h1 { font-size: 22px; color: #0f172a; margin: 0 0 8px 0; }
          p { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0; }
          .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">✓</div>
          <h1>Email Verified Successfully</h1>
          <p>Thank you! Your email address <strong>${result.parent_email}</strong> has been successfully verified for weekly PM POSHAN mid-day meal nutrition reports.</p>
          <div class="footer">AI-Based Nutrition Assurance & Personalised Diet Recommendation System</div>
        </div>
      </body>
      </html>
    `);
  }

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Parent email verified successfully', HTTP_STATUS.OK)
  );
});

/**
 * POST /api/students/:id/parent-contact/withdraw-consent
 * Withdraw parent consent and log audit trail
 */
export const withdrawConsent = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const { reason } = req.body || {};
  const result = await parentReportDeliveryService.withdrawParentConsent(studentId, req.user, reason);

  res.status(HTTP_STATUS.OK).json(
    successResponse(result, 'Parent report consent withdrawn successfully', HTTP_STATUS.OK)
  );
});

/**
 * GET /api/students/:id/parent-contact/consent-history
 * Retrieve audit history of consent grants and withdrawals
 */
export const getConsentHistory = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const history = await parentReportDeliveryService.getConsentHistory(studentId);

  res.status(HTTP_STATUS.OK).json(
    successResponse(history, 'Consent audit history retrieved successfully', HTTP_STATUS.OK)
  );
});

/**
 * POST /api/students/:id/malnutrition-report/send
 * Generate official Malnutrition PDF report and dispatch to parent email
 */
export const sendMalnutritionReportToParent = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const {
    recipient_email,
    admin_email,
    custom_notes,
    force_real_email,
    smtp_config,
    prediction_data,
  } = req.body || {};

  // 1. Fetch comprehensive student profile
  const profile = await studentService.getComprehensiveStudentProfile(studentId);
  const student = profile.student;

  // 2. Determine target parent email
  const targetEmail = (recipient_email || student.parent_email || '').trim();
  if (!targetEmail) {
    throw new AppError('No parent email address found for this student. Please provide a recipient email address.', HTTP_STATUS.BAD_REQUEST);
  }

  // 3. Obtain or execute malnutrition evaluation
  let malnutritionData = prediction_data;
  if (!malnutritionData || !malnutritionData.prediction) {
    const predictionService = await import('../services/predictionService.js');
    malnutritionData = await predictionService.predictCustomMalnutrition({
      student_id: studentId,
      height: student.height,
      weight: student.weight,
      avg_weekly_calories: profile.nutrition_analytics?.actual_school_calories_served || profile.nutrition_analytics?.avg_weekly_daily_calories || 450,
      age: student.age,
      gender: student.gender,
      preference: student.food_preference || 'veg',
      save_to_db: false,
    });
  }

  // 4. Generate Official Malnutrition PDF Report
  const pdfService = await import('../services/pdfReportService.js');
  const pdfResult = await pdfService.generateMalnutritionPdfReport(
    student,
    malnutritionData,
    profile.diet_recommendation,
    profile.parent_contact
  );

  // 5. Render HTML Email Template
  const emailService = (await import('../services/emailService.js')).default;
  const emailRender = emailService.renderMalnutritionEmailTemplate({
    student,
    malnutritionData,
    dietPlan: profile.diet_recommendation,
    adminEmail: admin_email || smtp_config?.user || 'admin@school-nutrition.gov.in',
  });

  // 6. Record delivery initiation in database
  let deliveryRecord = null;
  try {
    deliveryRecord = await parentDeliveryModel.createDeliveryRecord({
      student_id: studentId,
      weekly_report_id: null,
      parent_email: targetEmail,
      delivery_status: 'Queued',
      email_subject: emailRender.subject,
      pdf_path: pdfResult.filePath,
      metadata: {
        type: 'malnutrition_report',
        sent_by: req.user?.username || 'admin',
        admin_email: admin_email || null,
        status_evaluated: malnutritionData.prediction?.status,
        bmi: malnutritionData.inputs?.calculated_bmi,
        force_real: Boolean(force_real_email),
        custom_notes: custom_notes || null,
      },
    });
  } catch (dbErr) {
    logger.warn('Could not record delivery audit entry:', dbErr.message);
  }

  // 7. Dispatch Email with PDF Attachment
  let dispatchResult;
  try {
    dispatchResult = await emailService.sendEmail({
      to: targetEmail,
      from: admin_email || smtp_config?.from || undefined,
      subject: emailRender.subject,
      html: emailRender.html,
      text: emailRender.text,
      attachments: [
        {
          fileName: pdfResult.fileName,
          buffer: pdfResult.buffer,
          contentType: 'application/pdf',
        },
      ],
      smtpConfig: smtp_config || null,
      forceReal: Boolean(force_real_email),
    });

    if (deliveryRecord?.id) {
      await parentDeliveryModel.updateDeliveryStatus(deliveryRecord.id, {
        delivery_status: 'Sent',
        provider_message_id: dispatchResult.messageId,
        sent_at: new Date().toISOString(),
      });
    }
  } catch (sendErr) {
    if (deliveryRecord?.id) {
      await parentDeliveryModel.updateDeliveryStatus(deliveryRecord.id, {
        delivery_status: 'Failed',
        failure_reason: sendErr.message,
      });
    }
    throw sendErr;
  }

  res.status(HTTP_STATUS.OK).json(
    successResponse({
      recipient: targetEmail,
      student_name: student.name,
      fileName: pdfResult.fileName,
      messageId: dispatchResult.messageId,
      provider: dispatchResult.provider,
      live: dispatchResult.live,
      timestamp: dispatchResult.timestamp || new Date().toISOString(),
      download_url: `/api/students/${studentId}/malnutrition-report/pdf`,
      delivery_id: deliveryRecord?.id || null,
    }, `Malnutrition assessment PDF successfully sent to ${targetEmail}`, HTTP_STATUS.OK)
  );
});

/**
 * GET /api/students/:id/malnutrition-report/pdf
 * Download or stream the generated official Malnutrition PDF report card
 */
export const downloadMalnutritionReportPdf = asyncHandler(async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const profile = await studentService.getComprehensiveStudentProfile(studentId);
  const predictionService = await import('../services/predictionService.js');
  const malnutritionData = await predictionService.predictCustomMalnutrition({
    student_id: studentId,
    height: profile.student.height,
    weight: profile.student.weight,
    avg_weekly_calories: profile.nutrition_analytics?.actual_school_calories_served || profile.nutrition_analytics?.avg_weekly_daily_calories || 450,
    age: profile.student.age,
    gender: profile.student.gender,
    preference: profile.student.food_preference || 'veg',
    save_to_db: false,
  });

  const pdfService = await import('../services/pdfReportService.js');
  const pdfResult = await pdfService.generateMalnutritionPdfReport(
    profile.student,
    malnutritionData,
    profile.diet_recommendation,
    profile.parent_contact
  );

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${pdfResult.fileName}"`);
  res.send(pdfResult.buffer);
});

export const verifyEmailToken = confirmVerificationToken;

export default {
  getParentContact,
  updateParentContact,
  previewWeeklyReport,
  sendWeeklyReport,
  getDeliveryHistory,
  downloadReportPdf,
  sendMalnutritionReportToParent,
  downloadMalnutritionReportPdf,
  getDeliveryById,
  sendVerificationEmail,
  verifyOtp,
  getVerificationLandingPage,
  confirmVerificationToken,
  verifyEmailToken,
  withdrawConsent,
  getConsentHistory,
};

