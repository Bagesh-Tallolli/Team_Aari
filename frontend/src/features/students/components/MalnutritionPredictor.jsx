import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Play,
  RotateCcw,
  AlertTriangle,
  Flame,
  Scale,
  Stethoscope,
  ShieldAlert,
  Save,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  FileCheck2,
  HeartPulse,
  Mail,
  Send,
  Download,
  FileText,
  CheckCheck,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Card from '../../../components/common/Card.jsx';
import Badge from '../../../components/common/Badge.jsx';
import apiService from '../../../services/apiService.js';
import toast from 'react-hot-toast';
import ExportMalnutritionPdfModal from './ExportMalnutritionPdfModal.jsx';

/**
 * MalnutritionPredictor Component
 * 
 * Government of India & PM POSHAN / ICMR-NIN Presentation Standard
 * Dedicated interactive component that takes:
 * 1. Average weekly calorie intake (dynamic per student or custom)
 * 2. Updated height (stature)
 * 3. Updated weight (pediatric mass)
 * 
 * Runs Random Forest inference, calculates live BMI against WHO 5-19 Growth References,
 * details full ICD-10 mapped medical conditions & clinical pathologies, and enables 1-click database synchronization.
 */
function MalnutritionPredictor({
  student = null,
  initialAvgCalories = null,
  onPredictionComplete = null,
}) {
  // Input form state
  const [height, setHeight] = useState('120');
  const [weight, setWeight] = useState('25');
  const [avgWeeklyCalories, setAvgWeeklyCalories] = useState('450');
  const [age, setAge] = useState(10);
  const [gender, setGender] = useState('Male');
  const [preference, setPreference] = useState('veg');
  const [saveToDb, setSaveToDb] = useState(true);

  // Prediction execution state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Parent Email Dispatch & PDF Generation state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [adminEmail, setAdminEmail] = useState('bagesh.rvce@gmail.com');
  const [customNotes, setCustomNotes] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(null);
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

  // Populate from student prop if provided & reset on student switch
  useEffect(() => {
    if (student) {
      if (student.height) setHeight(String(student.height));
      if (student.weight) setWeight(String(student.weight));
      if (student.age) setAge(Number(student.age));
      if (student.gender) setGender(student.gender);
      if (student.food_preference) {
        setPreference(student.food_preference.toLowerCase().includes('non') ? 'non_veg' : 'veg');
      }
      const pEmail = student?.parent_contact?.parent_email || student?.parent_email || '';
      setRecipientEmail(pEmail);
    }

    if (initialAvgCalories !== null && initialAvgCalories !== undefined && Number(initialAvgCalories) > 0) {
      setAvgWeeklyCalories(String(Math.round(initialAvgCalories)));
    } else if (student?.nutritionAnalytics?.actualServed && Number(student.nutritionAnalytics.actualServed) > 0) {
      setAvgWeeklyCalories(String(Math.round(student.nutritionAnalytics.actualServed)));
    } else if (student?.age && Number(student.age) > 10) {
      setAvgWeeklyCalories('700');
    } else {
      setAvgWeeklyCalories('450');
    }

    // Reset previous prediction on student profile switch
    setResult(null);
    setError(null);
    setEmailSuccess(null);
  }, [student, initialAvgCalories]);

  const handleSendMalnutritionEmail = async (e) => {
    if (e) e.preventDefault();
    if (!student?.id) {
      toast.error('Student profile required to dispatch report');
      return;
    }
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('Please enter a valid recipient parent email address');
      return;
    }

    try {
      setSendingEmail(true);
      setEmailSuccess(null);
      const payload = {
        recipient_email: recipientEmail,
        admin_email: adminEmail,
        custom_notes: customNotes,
        prediction_data: result,
        force_real_email: Boolean(smtpConfig.user && smtpConfig.pass),
        smtp_config: (smtpConfig.user && smtpConfig.pass) ? smtpConfig : null,
      };

      const res = await apiService.students.sendMalnutritionReport(student.id, payload);

      if (res.success && res.data) {
        setEmailSuccess(res.data);
        toast.success(`Malnutrition assessment PDF dispatched to ${res.data.recipient}!`);
      } else {
        throw new Error(res.error || 'Failed to dispatch email');
      }
    } catch (err) {
      console.error('Failed to send malnutrition email:', err);
      toast.error(err.message || 'Email delivery failed');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!student?.id) {
      toast.error('Student ID required to download PDF');
      return;
    }
    const url = apiService.students.getMalnutritionReportPdfUrl(student.id);
    window.open(url, '_blank');
  };

  // Live BMI calculation
  const numHeight = parseFloat(height) || 0;
  const numWeight = parseFloat(weight) || 0;
  const liveBmi = numHeight > 0 && numWeight > 0
    ? (numWeight / ((numHeight / 100) * (numHeight / 100))).toFixed(2)
    : null;

  // Preset quick buttons for average weekly calories
  const presetCalories = [
    { label: 'Severe Deficit', value: 250 },
    { label: 'PM POSHAN Primary', value: 450 },
    { label: 'PM POSHAN Upper Pri', value: 700 },
    { label: 'Full Day RDA', value: student?.age && Number(student.age) > 9 ? 2200 : 1500 },
  ];

  const handleRunPrediction = useCallback(async (e) => {
    if (e) e.preventDefault();

    if (!numHeight || numHeight < 50 || numHeight > 220) {
      toast.error('Please enter a valid height (50 - 220 cm)');
      return;
    }

    if (!numWeight || numWeight < 5 || numWeight > 150) {
      toast.error('Please enter a valid weight (5 - 150 kg)');
      return;
    }

    const cals = parseFloat(avgWeeklyCalories);
    if (isNaN(cals) || cals < 0 || cals > 5000) {
      toast.error('Please enter a valid average weekly calorie intake (0 - 5000 kcal)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        student_id: student?.id || null,
        height: numHeight,
        weight: numWeight,
        avg_weekly_calories: cals,
        age: Number(age),
        gender,
        preference,
        save_to_db: Boolean(saveToDb && student?.id),
      };

      const res = await apiService.students.predictMalnutrition(payload, student?.id);

      if (res.success && res.data) {
        setResult(res.data);
        toast.success(`Diagnostic assessment: ${res.data.prediction?.status || 'Evaluated'}`);
        if (res.data.saved_to_db) {
          toast.success('Updated student anthropometry in PostgreSQL database');
        }
        if (onPredictionComplete) {
          onPredictionComplete(res.data);
        }
      } else {
        throw new Error(res.error || 'Prediction service failed to return an assessment');
      }
    } catch (err) {
      console.error('Malnutrition prediction failed:', err);
      setError(err.message || 'Failed to execute malnutrition prediction');
      toast.error(err.message || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  }, [numHeight, numWeight, avgWeeklyCalories, age, gender, preference, saveToDb, student?.id, onPredictionComplete]);

  const handleReset = () => {
    if (student) {
      setHeight(String(student.height || 120));
      setWeight(String(student.weight || 25));
      setAge(Number(student.age || 10));
      setGender(student.gender || 'Male');
      setAvgWeeklyCalories(String(Math.round(initialAvgCalories || (student.age > 10 ? 700 : 450))));
    } else {
      setHeight('120');
      setWeight('25');
      setAge(10);
      setGender('Male');
      setAvgWeeklyCalories('450');
    }
    setResult(null);
    setError(null);
  };

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('underweight') || s.includes('critical') || s.includes('severe')) {
      return {
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/50',
        text: 'text-rose-400',
        badge: 'danger',
        gradient: 'from-rose-500/20 via-rose-500/5 to-slate-900',
      };
    }
    if (s.includes('risk') || s.includes('thinness')) {
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/50',
        text: 'text-amber-400',
        badge: 'warning',
        gradient: 'from-amber-500/20 via-amber-500/5 to-slate-900',
      };
    }
    return {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/50',
      text: 'text-emerald-400',
      badge: 'success',
      gradient: 'from-emerald-500/20 via-emerald-500/5 to-slate-900',
    };
  };

  const colors = getStatusColor(result?.prediction?.status);

  return (
    <Card variant="default" className="border-indigo-500/40 bg-slate-900/90 shadow-2xl overflow-hidden p-6 sm:p-8">
      {/* 1. Header with Government Standards & Active Student Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/80 pb-5">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 rounded-2xl text-indigo-400 shadow-inner">
            <Activity size={30} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                AI Malnutrition &amp; Clinical Risk Predictor
              </h2>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Random Forest ML &bull; WHO 5-19 Growth References
              </span>
            </div>
            <p className="text-slate-300 text-sm sm:text-base mt-1 font-medium">
              Simulate or evaluate child nutritional status based on weekly calorie intake, new physical anthropometry (height &amp; weight), and ICD-10 medical condition mapping.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {student && (
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <FileText size={16} />
              <span>Export Malnutrition Summary PDF</span>
            </button>
          )}

          {student && (
            <div className="text-left md:text-right bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-700 shadow-sm">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Evaluating Student</span>
              <span className="text-sm font-extrabold text-white">{student.name}</span>
              <span className="text-xs text-indigo-300 ml-1 font-mono">(ID: {student.id})</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive Input Form */}
      <form onSubmit={handleRunPrediction} className="mt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Input A: Average Weekly Calories */}
          <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Flame size={18} className="text-orange-400" />
                1. Avg. Weekly Calorie
              </label>
              <span className="text-xs font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded">
                kcal / day
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                max="5000"
                value={avgWeeklyCalories}
                onChange={(e) => setAvgWeeklyCalories(e.target.value)}
                placeholder="e.g. 450"
                className="w-full px-4 py-3 bg-slate-900 border-2 border-slate-700 rounded-xl text-2xl font-black text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                required
              />
              <span className="absolute right-4 top-3.5 text-sm text-slate-400 font-bold pointer-events-none">
                kcal
              </span>
            </div>
            {/* Quick Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs text-slate-400 block uppercase font-bold">Standard Presets:</span>
              <div className="flex flex-wrap gap-2">
                {presetCalories.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setAvgWeeklyCalories(String(p.value))}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-bold transition-all ${
                      String(p.value) === String(avgWeeklyCalories)
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    {p.label} ({p.value}k)
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Input B: New Height */}
          <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-400" />
                2. New Height (cm)
              </label>
              <span className="text-xs font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded">
                Stature
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="50"
                max="220"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g. 135.0"
                className="w-full px-4 py-3 bg-slate-900 border-2 border-slate-700 rounded-xl text-2xl font-black text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                required
              />
              <span className="absolute right-4 top-3.5 text-sm text-slate-400 font-bold pointer-events-none">
                cm
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Calibrated stadiometer height measurement in standing position.
            </p>
          </div>

          {/* Input C: New Weight & Live BMI */}
          <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Scale size={18} className="text-emerald-400" />
                3. New Weight (kg)
              </label>
              {liveBmi && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  BMI: {liveBmi}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="5"
                max="150"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 30.5"
                className="w-full px-4 py-3 bg-slate-900 border-2 border-slate-700 rounded-xl text-2xl font-black text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                required
              />
              <span className="absolute right-4 top-3.5 text-sm text-slate-400 font-bold pointer-events-none">
                kg
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
              <span>Real-Time Computed BMI:</span>
              <span className="font-bold text-white font-mono text-sm">
                {liveBmi ? `${liveBmi} kg/m²` : 'Awaiting stature & mass'}
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Inputs: Age, Sex, Dietary Preference, Database Save */}
        <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {/* Age */}
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-bold">Child Age:</span>
              <select
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-sm focus:outline-none focus:border-indigo-500"
              >
                {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((a) => (
                  <option key={a} value={a}>
                    {a} years ({a <= 10 ? 'Primary' : 'Upper Pri'})
                  </option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-bold">Sex:</span>
              <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-0.5">
                <button
                  type="button"
                  onClick={() => setGender('Male')}
                  className={`px-3 py-1 text-xs rounded-md font-bold transition-colors ${
                    gender === 'Male' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setGender('Female')}
                  className={`px-3 py-1 text-xs rounded-md font-bold transition-colors ${
                    gender === 'Female' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>

            {/* Preference */}
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-bold">Diet Pref:</span>
              <select
                value={preference}
                onChange={(e) => setPreference(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="veg">Vegetarian</option>
                <option value="non_veg">Non-Vegetarian</option>
              </select>
            </div>
          </div>

          {/* Database Synchronization Checkbox */}
          {student && (
            <label className="flex items-center gap-2.5 text-sm text-slate-200 font-medium cursor-pointer select-none bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700">
              <input
                type="checkbox"
                checked={saveToDb}
                onChange={(e) => setSaveToDb(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500"
              />
              <span>Save new height/weight &amp; diagnosis to official student database record</span>
            </label>
          )}
        </div>

        {/* 3. Action Buttons: RUN PREDICTION & EXPORT SUMMARY */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold transition-colors disabled:opacity-50"
          >
            <RotateCcw size={16} />
            <span>Reset Inputs</span>
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1 max-w-2xl justify-end">
            {student && (
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border-2 border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-sm font-extrabold transition-all shadow-md active:scale-98"
              >
                <FileText size={17} />
                <span>Export Malnutrition Summary PDF</span>
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white text-base font-extrabold shadow-xl shadow-indigo-600/40 transition-all transform active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Running ML &amp; WHO Growth Inference...</span>
                </>
              ) : (
                <>
                  <Play size={18} className="fill-white" />
                  <span>Run Malnutrition Prediction</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Error Banner */}
      {error && (
        <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 flex items-start gap-3">
          <AlertCircle size={20} className="text-rose-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-bold text-rose-300 block mb-0.5">Prediction Failed</span>
            <p className="text-slate-200">{error}</p>
          </div>
        </div>
      )}

      {/* 4. Complete Prediction & Medical Assessment Panel */}
      {result && (
        <div className="mt-8 space-y-6 pt-6 border-t-2 border-slate-700/80 animate-fadeIn">
          {/* A. Diagnosis Header Card */}
          <div className={`p-6 sm:p-8 rounded-2xl border-2 ${colors.border} bg-gradient-to-br ${colors.gradient} relative overflow-hidden shadow-2xl`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  AI Diagnostic Assessment Result
                </span>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className={`text-3xl sm:text-4xl font-black ${colors.text} tracking-tight`}>
                    {result.prediction?.status}
                  </h3>
                  <Badge variant={colors.badge} size="lg">
                    {result.prediction?.risk_level ? result.prediction.risk_level.toUpperCase() : 'SCREENED'}
                  </Badge>
                  {result.saved_to_db && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                      <Save size={13} />
                      Persisted to PostgreSQL Database
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base text-slate-200 mt-2 max-w-2xl leading-relaxed font-medium">
                  {result.prediction?.reason}
                </p>
              </div>

              {/* Confidence & Quick Export Button */}
              <div className="flex flex-col items-end gap-2.5 self-start md:self-auto min-w-[220px]">
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700 text-left md:text-right w-full shadow-md">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Model Confidence</div>
                  <div className="text-3xl font-black text-white mt-0.5">
                    {Math.round((result.prediction?.confidence || 0.88) * 100)}%
                  </div>
                  <div className="text-xs text-indigo-300 mt-1 font-mono font-semibold">
                    {result.prediction?.model_type}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                >
                  <FileText size={15} />
                  <span>Export &amp; Send PDF</span>
                </button>
              </div>
            </div>

            {/* Growth & Intake Metric Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-700/60">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-xs font-bold uppercase">Evaluated BMI</span>
                <span className="text-xl sm:text-2xl font-black text-white font-mono">
                  {result.inputs?.calculated_bmi} <span className="text-xs font-normal text-slate-400">kg/m²</span>
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-xs font-bold uppercase">WHO Growth Standard</span>
                <span className="text-base sm:text-lg font-bold text-slate-100">
                  {result.prediction?.pediatric_screening?.label || 'Screened'}
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-xs font-bold uppercase">School-Meal Calorie Gap</span>
                <span className={`text-xl sm:text-2xl font-black ${result.nutritional_benchmarks?.school_meal_gap > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {result.nutritional_benchmarks?.school_meal_gap} <span className="text-xs font-normal text-slate-400">kcal</span>
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-xs font-bold uppercase">Full-Day RDA Deficit</span>
                <span className="text-xl sm:text-2xl font-black text-rose-400">
                  {result.nutritional_benchmarks?.remaining_daily_calories} <span className="text-xs font-normal text-slate-400">kcal remaining</span>
                </span>
              </div>
            </div>
          </div>

          {/* B. ALL MEDICAL CONDITIONS & CLINICAL PATHOLOGY */}
          {result.medical_assessment && (
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/95 border-2 border-slate-700/80 space-y-5 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <Stethoscope size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                      All Associated Medical Conditions &amp; Clinical Pathology
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold">
                        ICD-10 Clinical Mapping
                      </span>
                    </h4>
                    <p className="text-sm text-slate-300 mt-0.5 font-medium">
                      Physiological pathologies, deficiencies, and clinical risks corresponding to this child&apos;s nutritional diagnosis
                    </p>
                  </div>
                </div>

                <span className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-slate-800 text-slate-200 border border-slate-700 shadow-sm self-start sm:self-auto">
                  {result.medical_assessment.urgency || 'CLINICAL_MONITORING'}
                </span>
              </div>

              {/* Affected Organ Systems Pills */}
              {result.medical_assessment.affected_organ_systems && (
                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-wider text-slate-300 font-bold block">
                    Affected Physiological Systems:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {result.medical_assessment.affected_organ_systems.map((system, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-semibold text-slate-200"
                      >
                        &bull; {system}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditions List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {result.medical_assessment.medical_conditions?.map((cond, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-slate-500 transition-colors space-y-3 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="text-base font-bold text-white flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
                        {cond.name}
                      </h5>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg uppercase ${
                        cond.severity === 'Critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : cond.severity === 'Severe'
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          : cond.severity === 'High'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {cond.severity} ({cond.icd_hint})
                      </span>
                    </div>

                    <p className="text-sm text-slate-200 leading-relaxed">
                      <strong className="text-slate-300">Pathophysiology: </strong>
                      {cond.pathophysiology}
                    </p>

                    {cond.symptoms && cond.symptoms.length > 0 && (
                      <div className="text-xs text-slate-300 pt-2 border-t border-slate-700/60">
                        <strong className="text-slate-400 block mb-1.5 uppercase font-bold text-[11px]">
                          Key Manifestations &amp; Clinical Signs:
                        </strong>
                        <div className="flex flex-wrap gap-1.5">
                          {cond.symptoms.map((sym, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-xs font-medium text-slate-200"
                            >
                              {sym}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Clinical Recommendations */}
              {result.medical_assessment.clinical_recommendations && (
                <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 space-y-3 mt-4">
                  <h5 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert size={18} className="text-indigo-400" />
                    Recommended Medical &amp; Mid-Day Meal Clinical Action Steps
                  </h5>
                  <ul className="space-y-2 text-sm text-slate-200 pl-4 list-disc leading-relaxed font-medium">
                    {result.medical_assessment.clinical_recommendations.map((rec, rIdx) => (
                      <li key={rIdx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* C. PARENT EMAIL DISPATCH & MALNUTRITION PDF CONVERTER (GOVT OF INDIA STANDARD) */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border-2 border-indigo-500/50 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-500/30 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 rounded-2xl text-indigo-300 shadow-inner">
                  <Mail size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                      MINISTRY OF EDUCATION &bull; PM POSHAN SCHEME
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      Parent Notification System
                    </span>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">
                    Convert Malnutrition Report to PDF &amp; Send to Parent Email
                  </h4>
                  <p className="text-sm text-slate-300 font-medium">
                    Converts this complete diagnostic report, WHO growth indicators, ICD-10 medical risks, and meal plans into an official 2-page PDF document and emails it to the parent registered during enrollment.
                  </p>
                </div>
              </div>

              {student && (
                <div className="bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-700 text-right self-start sm:self-auto">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Recipient Student</span>
                  <span className="text-sm font-extrabold text-white">{student.name}</span>
                </div>
              )}
            </div>

            {/* Email Dispatch Form */}
            <form onSubmit={handleSendMalnutritionEmail} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Parent Recipient Email */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail size={14} className="text-indigo-400" />
                      Parent / Guardian Email (Recipient) *
                    </label>
                    {student?.parent_name && (
                      <span className="text-xs text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-medium">
                        Parent: <strong>{student.parent_name}</strong>
                      </span>
                    )}
                  </div>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="e.g. parent@example.com (registered during student registration)"
                    className="w-full px-4 py-3 bg-slate-900 border-2 border-slate-700 rounded-xl text-base font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                    required
                  />
                  <p className="text-xs text-slate-300">
                    Pre-filled with the parent email registered during student enrollment. You may enter any real email address to test and inspect the delivered PDF report.
                  </p>
                </div>

                {/* 2. Admin Sender Email */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Send size={14} className="text-emerald-400" />
                    Admin Sender Address (From)
                  </label>
                  <input
                    type="text"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@school-nutrition.gov.in"
                    className="w-full px-4 py-3 bg-slate-900 border-2 border-slate-700 rounded-xl text-base font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  />
                  <p className="text-xs text-slate-300">
                    Official PM POSHAN issuing authority email address displayed on the report.
                  </p>
                </div>
              </div>

              {/* Optional Custom Instructions / Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Additional Notes / Guidance for Parent (Optional)
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. Please discuss these nutritional results with the school medical officer this Friday."
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Quick Real SMTP Credentials Accordion (Optional) */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSmtpSettings(!showSmtpSettings)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Settings size={14} className="text-indigo-400" />
                    Configure Live Gmail / Real SMTP Dispatch (Optional for Real Inboxes)
                  </span>
                  {showSmtpSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showSmtpSettings && (
                  <div className="p-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-slate-950/40 animate-fadeIn">
                    <div>
                      <span className="text-slate-400 block mb-1 font-semibold">SMTP Host</span>
                      <input
                        type="text"
                        value={smtpConfig.host}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1 font-semibold">SMTP Port</span>
                      <input
                        type="number"
                        value={smtpConfig.port}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1 font-semibold">Admin Gmail / User</span>
                      <input
                        type="text"
                        value={smtpConfig.user}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                        placeholder="yourname@gmail.com"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1 font-semibold">App Password (16-char)</span>
                      <input
                        type="password"
                        value={smtpConfig.pass}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                        placeholder="xxxx xxxx xxxx xxxx"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: 1. Download PDF, 2. Send PDF to Parent Email */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border-2 border-slate-600 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold shadow-md transition-all active:scale-98"
                >
                  <Download size={17} className="text-indigo-300" />
                  <span>Download Official PDF Report</span>
                </button>

                <button
                  type="submit"
                  disabled={sendingEmail || !recipientEmail}
                  className="w-full sm:flex-1 max-w-md flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white text-base font-extrabold shadow-xl shadow-emerald-600/30 transition-all transform active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {sendingEmail ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Generating PDF &amp; Dispatching Email...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Send Malnutrition PDF to Parent Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Delivery Confirmation Receipt */}
            {emailSuccess && (
              <div className="p-5 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 space-y-2 animate-fadeIn shadow-lg">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCheck size={22} className="text-emerald-400" />
                    <h5 className="text-base font-extrabold text-white">
                      Malnutrition Assessment PDF Successfully Dispatched!
                    </h5>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    STATUS: DELIVERED
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-emerald-500/30">
                  <div>
                    <span className="text-slate-400 block font-semibold">Recipient Parent Email:</span>
                    <span className="text-white font-mono font-bold text-sm">{emailSuccess.recipient}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Attached PDF File:</span>
                    <span className="text-emerald-300 font-mono font-bold">{emailSuccess.fileName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Provider Message ID:</span>
                    <span className="text-slate-300 font-mono text-[11px] truncate block">{emailSuccess.messageId}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. INTERACTIVE MODAL: ASKS WHICH EMAIL TO SEND THE MALNUTRITION SUMMARY PDF */}
      <ExportMalnutritionPdfModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        student={student}
        predictionData={result}
      />
    </Card>
  );
}

export default MalnutritionPredictor;
