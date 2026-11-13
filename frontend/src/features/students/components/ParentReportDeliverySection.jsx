import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Download,
  UserCheck,
  ShieldCheck,
  Edit2,
  RefreshCw,
  Eye,
  XCircle,
  HelpCircle
} from 'lucide-react';
import Card from '../../../components/common/Card.jsx';
import Badge from '../../../components/common/Badge.jsx';
import apiService from '../../../services/apiService.js';
import toast from 'react-hot-toast';

function ParentReportDeliverySection({
  studentId,
  studentName,
  initialParentContact = null,
  onContactUpdated,
}) {
  const [contact, setContact] = useState(initialParentContact);
  const [editing, setEditing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [forceResend, setForceResend] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    parent_report_consent: false,
    auto_weekly_report_enabled: false,
  });

  // Verification & Consent state
  const [sendingVerification, setSendingVerification] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [consentHistoryOpen, setConsentHistoryOpen] = useState(false);
  const [consentHistory, setConsentHistory] = useState([]);
  const [consentHistoryLoading, setConsentHistoryLoading] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawingConsent, setWithdrawingConsent] = useState(false);

  const loadContactAndHistory = async () => {
    if (!studentId) return;
    try {
      setHistoryLoading(true);
      const [contactRes, historyRes] = await Promise.all([
        apiService.parentDelivery.getContact(studentId),
        apiService.parentDelivery.getHistory(studentId),
      ]);

      if (contactRes.success && contactRes.data) {
        setContact(contactRes.data);
        setFormData({
          parent_name: contactRes.data.parent_name || '',
          parent_email: contactRes.data.parent_email || '',
          parent_phone: contactRes.data.parent_phone || '',
          parent_report_consent: Boolean(contactRes.data.parent_report_consent),
          auto_weekly_report_enabled: Boolean(contactRes.data.auto_weekly_report_enabled),
        });
      }

      if (historyRes.success && historyRes.data) {
        setHistory(historyRes.data);
      }
    } catch (err) {
      console.error('Failed to load parent contact/history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadContactAndHistory();
  }, [studentId]);

  const handleSaveContact = async (e) => {
    e.preventDefault();
    try {
      const res = await apiService.parentDelivery.updateContact(studentId, formData);
      if (res.success && res.data) {
        setContact(res.data);
        setEditing(false);
        toast.success('Parent contact details updated successfully');
        if (onContactUpdated) onContactUpdated(res.data);
      } else {
        toast.error(res.error || 'Failed to update contact');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update contact');
    }
  };

  const handleSendVerification = async () => {
    try {
      setSendingVerification(true);
      const res = await apiService.parentDelivery.sendVerification(studentId);
      if (res.success) {
        toast.success(res.message || 'Verification link & OTP dispatched to parent email.');
      } else {
        toast.error(res.error || 'Failed to send verification email');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send verification email');
    } finally {
      setSendingVerification(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error('Please enter the 6-digit OTP code');
      return;
    }
    try {
      setVerifyingOtp(true);
      const res = await apiService.parentDelivery.verifyOtp(studentId, otpCode.trim());
      if (res.success) {
        toast.success('Parent email verified successfully via OTP!');
        setOtpModalOpen(false);
        setOtpCode('');
        loadContactAndHistory();
      } else {
        toast.error(res.error || 'Invalid or expired OTP code');
      }
    } catch (err) {
      toast.error(err.message || 'OTP verification failed');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleWithdrawConsent = async () => {
    try {
      setWithdrawingConsent(true);
      const res = await apiService.parentDelivery.withdrawConsent(studentId, withdrawReason || 'Withdrawn by school staff');
      if (res.success) {
        toast.success('Parent report consent successfully withdrawn.');
        setWithdrawModalOpen(false);
        setWithdrawReason('');
        loadContactAndHistory();
      } else {
        toast.error(res.error || 'Failed to withdraw consent');
      }
    } catch (err) {
      toast.error(err.message || 'Consent withdrawal failed');
    } finally {
      setWithdrawingConsent(false);
    }
  };

  const handleViewConsentHistory = async () => {
    try {
      setConsentHistoryLoading(true);
      setConsentHistoryOpen(true);
      const res = await apiService.parentDelivery.getConsentHistory(studentId);
      if (res.success && res.data) {
        setConsentHistory(res.data);
      } else {
        setConsentHistory([]);
      }
    } catch (err) {
      toast.error('Could not load consent audit history');
    } finally {
      setConsentHistoryLoading(false);
    }
  };

  const handleOpenPreview = async () => {
    try {
      setPreviewLoading(true);
      setPreviewing(true);
      const res = await apiService.parentDelivery.preview(studentId);
      if (res.success && res.data) {
        setPreviewData(res.data);
      } else {
        toast.error(res.error || 'Failed to load preview');
      }
    } catch (err) {
      toast.error('Failed to load report preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendReport = async () => {
    try {
      setSending(true);
      setConfirmSendOpen(false);
      const res = await apiService.parentDelivery.send(studentId, forceResend);
      if (res.success) {
        toast.success(res.message || 'Weekly nutrition report delivered successfully!');
        setForceResend(false);
        loadContactAndHistory();
      } else if (res.data?.duplicate_prevented) {
        toast.error(res.data.message || 'Report already sent. Use Force Resend if needed.');
        setForceResend(true);
      } else {
        toast.error(res.error || 'Delivery failed');
      }
    } catch (err) {
      toast.error(err.message || 'Delivery request failed');
    } finally {
      setSending(false);
    }
  };

  const hasEmail = Boolean(contact?.parent_email);
  const isVerified = Boolean(contact?.parent_email_verified);
  const hasConsent = Boolean(contact?.parent_report_consent);
  const canSend = hasEmail && isVerified && hasConsent;

  return (
    <Card variant="default" className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Mail size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Parent Weekly Nutrition Report &amp; Delivery
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                Phase 7 Verified
              </span>
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Secure parent communication, statutory verification checks &amp; signed PDF report dispatch
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-600 transition-colors"
          >
            <Edit2 size={13} />
            <span>{editing ? 'Cancel' : 'Edit Parent Info'}</span>
          </button>

          <a
            href={apiService.parentDelivery.getPdfUrl(studentId)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-600 transition-colors"
          >
            <Download size={13} />
            <span>Download PDF</span>
          </a>

          <button
            onClick={handleOpenPreview}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg border border-indigo-500/40 shadow-sm transition-colors"
          >
            <Eye size={13} />
            <span>Preview Email &amp; Report</span>
          </button>
        </div>
      </div>

      {/* Edit Form Modal/Drawer */}
      {editing && (
        <form onSubmit={handleSaveContact} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Edit Parent / Guardian Contact &amp; Consent
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Parent / Guardian Name</label>
              <input
                type="text"
                value={formData.parent_name}
                onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                placeholder="e.g. Ramesh Sharma"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Parent Email Address</label>
              <input
                type="email"
                value={formData.parent_email}
                onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                placeholder="e.g. parent@example.com"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Parent Phone (Optional)</label>
              <input
                type="text"
                value={formData.parent_phone}
                onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-700/60">
              <span className="text-indigo-400 font-semibold">Security Note:</span> Email verification cannot be manually toggled. It requires sending a secure verification email link or entering a 6-digit OTP.
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={formData.parent_report_consent}
                onChange={(e) => setFormData({ ...formData, parent_report_consent: e.target.checked })}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
              />
              <span>Parent/Guardian Consent Granted for Report Delivery</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/60">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              Save Parent Details
            </button>
          </div>
        </form>
      )}

      {/* Contact & Verification Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Registered Parent Contact */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Registered Guardian</span>
            <span className="text-[11px] text-indigo-400 font-semibold">Primary Contact</span>
          </div>
          <div className="text-sm font-bold text-white">
            {contact?.parent_name || 'No Guardian Name Set'}
          </div>
          <div className="text-xs text-slate-300 flex items-center gap-1.5 truncate">
            <Mail size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">{contact?.parent_email || 'No email registered'}</span>
          </div>
          {contact?.parent_phone && (
            <div className="text-xs text-slate-400">
              Phone: {contact.parent_phone}
            </div>
          )}
        </div>

        {/* Card 2: Security & Consent Checks */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Statutory Pre-requisites</span>
            <ShieldCheck size={14} className="text-emerald-400" />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">Email Address Format:</span>
            {hasEmail ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle size={12} /> Present
              </span>
            ) : (
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <XCircle size={12} /> Missing
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Email Verified:</span>
              {isVerified ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle size={12} /> Verified
                </span>
              ) : (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle size={12} /> Unverified
                </span>
              )}
            </div>

            {!isVerified && hasEmail && (
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={sendingVerification}
                  className="flex-1 px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 text-indigo-200 text-[10px] rounded font-medium disabled:opacity-50"
                >
                  {sendingVerification ? 'Sending...' : 'Send Link & OTP'}
                </button>
                <button
                  type="button"
                  onClick={() => setOtpModalOpen(true)}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] rounded font-medium"
                >
                  Enter OTP
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1 pt-1 border-t border-slate-700/40">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Parent Consent:</span>
              {hasConsent ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle size={12} /> Granted
                </span>
              ) : (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle size={12} /> Pending
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <button
                type="button"
                onClick={handleViewConsentHistory}
                className="text-indigo-400 hover:text-indigo-300 underline text-[10px]"
              >
                Audit Trail
              </button>
              {hasConsent && (
                <button
                  type="button"
                  onClick={() => setWithdrawModalOpen(true)}
                  className="text-rose-400 hover:text-rose-300 text-[10px]"
                >
                  Withdraw Consent
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Dispatch Action Box */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Delivery Authorization</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                canSend ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {canSend ? 'Ready for Dispatch' : 'Authorization Incomplete'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              {canSend
                ? 'All statutory consent and email verification checks satisfied. Staff can trigger transmission.'
                : 'Email must be registered, verified by staff, and have parent consent before dispatch.'}
            </p>
          </div>

          <div className="pt-1">
            <button
              onClick={() => setConfirmSendOpen(true)}
              disabled={!canSend || sending}
              className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              {sending ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Transmitting...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>{forceResend ? 'Force Resend Report' : 'Send Weekly Report to Parent'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {confirmSendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-indigo-400">
              <Send size={20} />
              <h3 className="text-base font-bold text-white">Confirm Weekly Report Email Dispatch</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to send the weekly nutrition progress report and attached PDF for <strong>{studentName || 'this student'}</strong> to:
            </p>
            <div className="p-3 bg-slate-800 rounded-lg border border-slate-700 text-xs font-mono text-indigo-300">
              {contact?.parent_email}
            </div>
            <p className="text-[11px] text-slate-400 italic">
              * Delivery is logged in PostgreSQL audit history with SMTP message IDs and attempt counters.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmSendOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendReport}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg"
              >
                Approve &amp; Send Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {previewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400">
                <Eye size={18} />
                <h3 className="text-sm font-bold text-white">Weekly Report Email &amp; PDF Preview</h3>
              </div>
              <button
                onClick={() => setPreviewing(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {previewLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw size={24} className="animate-spin mx-auto text-indigo-400 mb-2" />
                  Generating preview...
                </div>
              ) : previewData ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                    <div><strong className="text-slate-400">Recipient:</strong> <span className="text-white">{previewData.email_preview?.to || 'Not configured'}</span></div>
                    <div><strong className="text-slate-400">Subject:</strong> <span className="text-indigo-300 font-semibold">{previewData.email_preview?.subject}</span></div>
                    <div><strong className="text-slate-400">Attachment:</strong> <span className="text-emerald-400 font-mono text-[11px]">{previewData.email_preview?.pdf_name}</span></div>
                  </div>

                  <div className="border border-slate-700 rounded-lg overflow-hidden bg-white text-slate-900 p-4 max-h-[350px] overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: previewData.email_preview?.html }} />
                  </div>
                </div>
              ) : (
                <div className="text-slate-400">Preview could not be rendered.</div>
              )}
            </div>

            <div className="p-3 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Official signed PDF will be attached automatically.</span>
              <button
                onClick={() => setPreviewing(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery History & Audit Trail */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={14} className="text-slate-400" />
            Report Delivery Audit Log
          </h3>
          <span className="text-[11px] text-slate-400">
            {history.length} delivery record(s) in PostgreSQL
          </span>
        </div>

        {historyLoading ? (
          <div className="py-4 text-center text-slate-400 text-xs">Loading delivery log...</div>
        ) : history.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-700/60">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Recipient Email</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Provider Message ID</th>
                  <th className="py-2.5 px-3">Attempts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 truncate max-w-[150px]">{row.parent_email}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                        row.delivery_status === 'Sent'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : row.delivery_status === 'Queued'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {row.delivery_status}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[10px] text-slate-400 truncate max-w-[160px]">
                      {row.provider_message_id || (row.failure_reason ? `Err: ${row.failure_reason}` : '—')}
                    </td>
                    <td className="py-2 px-3 text-center">{row.attempt_count || 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/40 text-center text-xs text-slate-400">
            No parent delivery attempts recorded yet for this student.
          </div>
        )}
      </div>

      {/* OTP Verification Modal */}
      {otpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-indigo-400">
              <ShieldCheck size={20} />
              <h3 className="text-base font-bold text-white">Enter Parent Verification OTP</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Enter the 6-digit one-time password code provided by the parent/guardian for <strong>{contact?.parent_email}</strong>.
            </p>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center text-xl tracking-[8px] font-mono py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                <span className="text-[10px] text-slate-400 block text-center mt-1">
                  OTP is valid for 15 minutes from dispatch.
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setOtpModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyingOtp || otpCode.length !== 6}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg"
                >
                  {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consent Audit Trail Modal */}
      {consentHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400">
                <ShieldCheck size={18} />
                <h3 className="text-sm font-bold text-white">Parent Consent Audit Trail</h3>
              </div>
              <button
                onClick={() => setConsentHistoryOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              {consentHistoryLoading ? (
                <div className="py-8 text-center text-slate-400">Loading audit history...</div>
              ) : consentHistory.length > 0 ? (
                <div className="space-y-2">
                  {consentHistory.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-800/80 border border-slate-700 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.consent_status ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {item.action || (item.consent_status ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN')}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-slate-300">
                        <strong className="text-slate-400">Recorded By:</strong> {item.recorded_by_name || 'Staff'} ({item.source_method || 'PORTAL'})
                      </div>
                      {item.notes && (
                        <div className="text-slate-400 text-[11px] italic">
                          "{item.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  No consent history logged yet for this student.
                </div>
              )}
            </div>
            <div className="p-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setConsentHistoryOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Consent Modal */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle size={20} />
              <h3 className="text-base font-bold text-white">Withdraw Parent Consent</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Withdrawing consent will immediately block all future weekly report deliveries for <strong>{studentName || 'this student'}</strong>.
            </p>
            <div className="space-y-2">
              <label className="block text-xs text-slate-400">Reason / Source for Withdrawal:</label>
              <textarea
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="e.g. Parent requested opt-out via phone call"
                rows={2}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setWithdrawModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWithdrawConsent}
                disabled={withdrawingConsent}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg"
              >
                {withdrawingConsent ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

    </Card>
  );
}

export default ParentReportDeliverySection;

