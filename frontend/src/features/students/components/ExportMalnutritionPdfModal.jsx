import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Send, 
  Download, 
  FileText, 
  CheckCircle2, 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  Award,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import apiService from '../../../services/apiService.js';
import toast from 'react-hot-toast';

/**
 * ExportMalnutritionPdfModal Component
 * 
 * Interactive modal that appears when clicking "Export Malnutrition Summary PDF".
 * Prompts the user: "To which email address should this Malnutrition Summary PDF be sent?"
 * - Pre-fills with the parent email registered during student enrollment.
 * - Allows sending to any real email address or downloading the PDF directly.
 */
function ExportMalnutritionPdfModal({
  isOpen,
  onClose,
  student,
  predictionData = null,
  onSuccess = null,
}) {
  const registeredParentEmail = student?.parent_contact?.parent_email || student?.parent_email || '';
  const registeredParentName = student?.parent_contact?.parent_name || student?.parent_name || 'Guardian';

  const [recipientEmail, setRecipientEmail] = useState('');
  const [adminEmail, setAdminEmail] = useState('bagesh.rvce@gmail.com');
  const [customNotes, setCustomNotes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [deliveryResult, setDeliveryResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showSmtpSettings, setShowSmtpSettings] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState(() => {
    const savedPass = localStorage.getItem('admin_smtp_app_password') || '';
    return {
      host: 'smtp.gmail.com',
      port: 465,
      user: 'bagesh.rvce@gmail.com',
      pass: savedPass,
      secure: true,
    };
  });

  const handleAppPasswordChange = (newPass) => {
    const cleaned = newPass;
    setSmtpConfig((prev) => ({ ...prev, pass: cleaned }));
    if (cleaned.trim()) {
      localStorage.setItem('admin_smtp_app_password', cleaned.trim());
    } else {
      localStorage.removeItem('admin_smtp_app_password');
    }
  };

  // Pre-fill recipient email with registered parent email when student changes
  useEffect(() => {
    if (student) {
      const email = student?.parent_contact?.parent_email || student?.parent_email || '';
      setRecipientEmail(email);
      setDeliveryResult(null);
      setErrorMessage(null);
    }
  }, [student, isOpen]);

  if (!isOpen) return null;

  const handleDownloadPdfOnly = () => {
    if (!student?.id) {
      toast.error('Student profile required to generate PDF');
      return;
    }
    const url = apiService.students.getMalnutritionReportPdfUrl(student.id);
    window.open(url, '_blank');
  };

  const handleSendEmail = async (e) => {
    if (e) e.preventDefault();
    if (!student?.id) {
      toast.error('Student profile required');
      return;
    }
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('Please enter a valid recipient email address');
      return;
    }

    try {
      setIsSending(true);
      setErrorMessage(null);
      setDeliveryResult(null);

      const payload = {
        recipient_email: recipientEmail.trim(),
        admin_email: adminEmail.trim(),
        custom_notes: customNotes.trim(),
        prediction_data: predictionData,
        force_real_email: Boolean(smtpConfig.user && smtpConfig.pass),
        smtp_config: (smtpConfig.user && smtpConfig.pass) ? smtpConfig : null,
      };

      const res = await apiService.students.sendMalnutritionReport(student.id, payload);

      if (res.success && res.data) {
        setDeliveryResult(res.data);
        toast.success(`Malnutrition PDF sent to ${res.data.recipient}!`);
        if (onSuccess) onSuccess(res.data);
      } else {
        throw new Error(res.error || 'Failed to dispatch email');
      }
    } catch (err) {
      console.error('Email sending error:', err);
      setErrorMessage(err.message || 'Email delivery failed');
      toast.error(err.message || 'Email delivery failed');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-slate-900 border-2 border-indigo-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-indigo-500/30 p-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner flex-shrink-0">
              <FileText size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
                  GOVERNMENT OF INDIA &bull; PM POSHAN SCHEME
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                  Official PDF Dispatch
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                Export Malnutrition Summary PDF
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                Generate official 2-page assessment report and dispatch via email.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Active Student Badge */}
          {student && (
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">Active Student:</span>
                <span className="text-base font-extrabold text-white">{student.name}</span>
                <span className="text-slate-400">({student.age} yrs &bull; ID: {student.id})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold uppercase">
                  Status: {predictionData?.prediction?.status || student.risk_level?.toUpperCase() || 'EVALUATED'}
                </span>
              </div>
            </div>
          )}

          {/* Prompt: To which email address should this be sent? */}
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Mail size={16} className="text-indigo-400" />
                  To Which Email Should This PDF Be Sent? *
                </label>
                {registeredParentEmail && (
                  <button
                    type="button"
                    onClick={() => setRecipientEmail(registeredParentEmail)}
                    className="text-xs text-indigo-300 hover:text-indigo-200 underline flex items-center gap-1 font-semibold"
                  >
                    <UserCheck size={13} />
                    Use Registered Parent Email
                  </button>
                )}
              </div>

              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="e.g. parent@example.com (or enter any recipient email)..."
                className="w-full px-4 py-3 bg-slate-950 border-2 border-indigo-500/60 rounded-xl text-base font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                required
              />

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs text-slate-300 space-y-1">
                <p>
                  <strong className="text-slate-200">Registered Parent on File: </strong> 
                  {registeredParentName} {registeredParentEmail ? `(${registeredParentEmail})` : '(No email on record)'}
                </p>
                <p className="text-slate-400">
                  Pre-filled with the parent email provided during student enrollment. You can change this to your personal email address or a medical officer&apos;s email to verify live delivery.
                </p>
              </div>
            </div>

            {/* Admin Sender Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Admin Sender Address (From)
              </label>
              <input
                type="text"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@school-nutrition.gov.in"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Optional Custom Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Custom Note for Recipient (Optional)
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Generated during PM POSHAN Mid-Day Meal assessment. Please review clinical action steps."
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Live Real-Time Gmail Dispatch Settings */}
            <div className="rounded-xl border border-indigo-500/30 bg-slate-950/80 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSmtpSettings(!showSmtpSettings)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Settings size={14} className="text-indigo-400" />
                  <span>Real-Time Gmail Sender Credentials ({smtpConfig.user})</span>
                  {smtpConfig.pass ? (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      App Password Saved
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                      Password Needed for Real Inboxes
                    </span>
                  )}
                </span>
                {showSmtpSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showSmtpSettings && (
                <div className="p-4 border-t border-slate-800 space-y-3 text-xs bg-slate-950/90 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block mb-1 font-semibold">Admin Gmail Sender</span>
                      <input
                        type="text"
                        value={smtpConfig.user}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                        placeholder="bagesh.rvce@gmail.com"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1 font-semibold">Google 16-Char App Password</span>
                      <input
                        type="password"
                        value={smtpConfig.pass}
                        onChange={(e) => handleAppPasswordChange(e.target.value)}
                        placeholder="e.g. abcd efgh ijkl mnop"
                        className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/50 rounded-lg text-emerald-300 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-slate-300 space-y-1">
                    <p className="font-semibold text-indigo-300 flex items-center gap-1">
                      ℹ️ How to get real-time delivery from bagesh.rvce@gmail.com:
                    </p>
                    <p className="text-slate-400 leading-relaxed">
                      Google requires a 16-character <strong>App Password</strong> (your regular Gmail password is blocked by Google for security). Generate one in 30 seconds at:
                      <a 
                        href="https://myaccount.google.com/apppasswords" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-amber-400 underline font-bold ml-1 hover:text-amber-300"
                      >
                        myaccount.google.com/apppasswords &rarr;
                      </a>
                    </p>
                    <p className="text-slate-500 text-[10px]">
                      Once pasted, it is saved securely in your browser session so all subsequent student malnutrition PDFs send instantly in real-time.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Delivery Receipt */}
            {deliveryResult && (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    PDF Successfully Sent!
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                    SENT
                  </span>
                </div>
                <div className="text-xs text-slate-300 space-y-0.5 pt-1 border-t border-emerald-500/20">
                  <p>Recipient: <strong className="text-white font-mono">{deliveryResult.recipient}</strong></p>
                  <p>Attached File: <strong className="text-emerald-300 font-mono">{deliveryResult.fileName}</strong></p>
                  <p className="text-slate-400 text-[11px] truncate">Message ID: {deliveryResult.messageId}</p>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleDownloadPdfOnly}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold transition-all shadow-sm active:scale-98"
              >
                <Download size={16} className="text-indigo-400" />
                <span>Download PDF Only</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={isSending || !recipientEmail}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-extrabold shadow-lg shadow-emerald-600/30 transition-all active:scale-98 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending PDF...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Send PDF to this Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ExportMalnutritionPdfModal;

