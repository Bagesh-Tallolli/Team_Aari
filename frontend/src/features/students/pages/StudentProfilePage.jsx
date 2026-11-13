import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  CheckCircle2, 
  Cpu, 
  Activity, 
  Utensils, 
  FileText, 
  Users, 
  ArrowRight,
  ShieldCheck,
  Award
} from 'lucide-react';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import Card from '../../../components/common/Card.jsx';
import Table from '../../../components/common/Table.jsx';
import Badge from '../../../components/common/Badge.jsx';
import { useParams, useNavigate } from 'react-router-dom';
import { SkeletonCard, SkeletonTable } from '../../../components/common/Skeleton.jsx';
import { calculateBMI, getBMIStatus } from '../../../utils/formatters.js';
import apiService from '../../../services/apiService.js';
import DietRecommendationSection from '../components/DietRecommendationSection.jsx';
import WeeklyNutritionAnalysisSection from '../components/WeeklyNutritionAnalysisSection.jsx';
import ParentReportDeliverySection from '../components/ParentReportDeliverySection.jsx';
import MalnutritionPredictor from '../components/MalnutritionPredictor.jsx';

function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [dietPlan, setDietPlan] = useState(null);
  const [dietLoading, setDietLoading] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preference, setPreference] = useState('veg');

  // VIEW CONTROLLER: 'malnutrition' | 'diet' | 'weekly'
  // Default to 'malnutrition' so report is not dumped all at once
  const [activeView, setActiveView] = useState('malnutrition');

  // Load student list for quick switcher bar
  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.students.getAll(1, 20);
        if (res.success && Array.isArray(res.data)) {
          setAllStudents(res.data);
        }
      } catch (e) {
        console.error('Failed to load student roster:', e);
      }
    })();
  }, []);

  useEffect(() => {
    const fetchStudent = async (forceRefresh = false) => {
      try {
        setLoading(true);
        setError(null);
        // Fetch comprehensive student details from backend
        const detailsResult = await apiService.students.getDetails(id, forceRefresh);

        if (!detailsResult.success) {
          throw new Error(detailsResult.error || 'Failed to fetch student details');
        }

        const payload = detailsResult.data || {};
        const studentData = payload.student || {};

        // Nutrition analytics
        const analytics = payload.nutrition_analytics || {};

        // AI analysis
        const ai = payload.ai_analysis || {};

        // Food history
        const foodHistory = (payload.food_history || []).map((log) => ({
          id: log.id,
          foodName: log.food_item,
          servedGrams: parseFloat(log.served_grams || 0),
          protein: parseFloat(log.protein || 0),
          calories: parseFloat(log.estimated_calories || 0),
          timestamp: log.logged_at || log.created_at,
        }));

        const computedBmi = studentData.current_bmi || calculateBMI(studentData.weight, studentData.height);
        const age = Number(studentData.age) || 10;
        const schoolMealTarget = analytics.school_meal_calories_target || (age <= 10 ? 450 : 700);
        const schoolMealProteinTarget = analytics.school_meal_protein_target || (age <= 10 ? 12 : 20);
        const actualServed = analytics.machine_served_calories !== undefined 
          ? analytics.machine_served_calories 
          : (analytics.actual_school_calories_served || analytics.todays_calories || 0);
        const actualProtein = analytics.machine_served_protein !== undefined 
          ? analytics.machine_served_protein 
          : (analytics.actual_school_protein_served || 0);
        const schoolMealGap = analytics.school_meal_calorie_gap !== undefined 
          ? analytics.school_meal_calorie_gap 
          : Math.max(0, schoolMealTarget - actualServed);
        const fullDayCalories = analytics.total_daily_calories_icmr || analytics.full_day_calories_required || (age <= 9 ? 1500 : 2200);
        const remainingDailyCalories = analytics.icmr_remaining_calories !== undefined 
          ? analytics.icmr_remaining_calories 
          : (analytics.remaining_daily_calories !== undefined ? analytics.remaining_daily_calories : Math.max(0, fullDayCalories - actualServed));
        const isMachineServed = analytics.is_machine_served !== undefined ? analytics.is_machine_served : actualServed > 0;
        const icmrFulfillmentPct = analytics.icmr_fulfillment_pct !== undefined 
          ? analytics.icmr_fulfillment_pct 
          : Math.min(100, Math.round((actualServed / fullDayCalories) * 100));

        setStudent({
          ...studentData,
          riskLevel: studentData.risk_level || studentData.riskLevel || 'healthy',
          parent_contact: payload.parent_contact || null,
          bmi: parseFloat(studentData.current_bmi || computedBmi || 0).toFixed(1),
          nutritionAnalytics: {
            schoolMealTarget,
            schoolMealProteinTarget,
            actualServed,
            actualProtein,
            schoolMealGap,
            fullDayCalories,
            remainingDailyCalories,
            isMachineServed,
            avgWeeklyCalories: analytics.avg_weekly_daily_calories || analytics.avg_weekly_calories || 0,
            fulfillmentPct: Math.round((actualServed / schoolMealTarget) * 100),
            icmrFulfillmentPct,
            lastServedFood: analytics.last_served_food || (foodHistory[0]?.foodName) || null,
            lastServedGrams: analytics.last_served_grams || (foodHistory[0]?.servedGrams) || null,
          },
          aiAnalysis: {
            status: ai?.status || ai?.ai_prediction || 'Unknown',
            reason: ai?.reason || ai?.analysis || null,
            confidence: ai?.confidence || null,
            dietPlan: ai?.diet_plan || null,
          },
          foodLogs: foodHistory,
        });

        if (studentData.food_preference) {
          setPreference(studentData.food_preference.toLowerCase().includes('non') ? 'non_veg' : 'veg');
        }

        if (payload.diet_recommendation) {
          setDietPlan(payload.diet_recommendation);
        } else {
          apiService.students.getDietRecommendation(id).then(res => {
            if (res.success && res.data) setDietPlan(res.data);
          }).catch(() => {});
        }

        if (payload.weekly_analysis) {
          setWeeklyReport(payload.weekly_analysis);
        } else {
          apiService.students.getWeeklyAnalysis(id).then(res => {
            if (res.success && res.data) setWeeklyReport(res.data);
          }).catch(() => {});
        }
      } catch (err) {
        console.error('Failed to fetch student:', err);
        setError(err.message);
        setStudent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id]);

  const handleRegenerateDietPlan = async (pref = preference) => {
    try {
      setDietLoading(true);
      const res = await apiService.students.generateDietRecommendation(id, pref);
      if (res.success && res.data) {
        setDietPlan(res.data);
      }
    } catch (err) {
      console.error('Failed to regenerate diet recommendation:', err);
    } finally {
      setDietLoading(false);
    }
  };

  const handlePreferenceChange = async (newPref) => {
    setPreference(newPref);
    await handleRegenerateDietPlan(newPref);
  };

  const handleRegenerateWeeklyAnalysis = async () => {
    try {
      setWeeklyLoading(true);
      const res = await apiService.students.generateWeeklyAnalysis(id);
      if (res.success && res.data) {
        setWeeklyReport(res.data);
      }
    } catch (err) {
      console.error('Failed to regenerate weekly analysis:', err);
    } finally {
      setWeeklyLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonTable />
        </div>
      </MainLayout>
    );
  }

  if (!student) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <p className="text-slate-300 text-lg font-medium">{error || 'Student not found'}</p>
        </div>
      </MainLayout>
    );
  }

  const bmiStatus = getBMIStatus(student.bmi);
  const riskColorMap = {
    healthy: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', badge: 'success', border: 'border-emerald-500/30' },
    at_risk: { bg: 'bg-amber-500/10', text: 'text-amber-400', badge: 'warning', border: 'border-amber-500/30' },
    underweight: { bg: 'bg-rose-500/10', text: 'text-rose-400', badge: 'danger', border: 'border-rose-500/30' },
    critical: { bg: 'bg-rose-500/10', text: 'text-rose-400', badge: 'danger', border: 'border-rose-500/30' },
  };

  const colors = riskColorMap[student.riskLevel] || riskColorMap.healthy;

  const foodColumns = [
    {
      key: 'timestamp',
      label: 'Date & Exact Time',
      render: (value) => {
        if (!value) return 'N/A';
        const d = new Date(value);
        if (isNaN(d.getTime())) return 'N/A';
        const dateStr = d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        const timeStr = d.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
        return (
          <div className="flex flex-col">
            <span className="text-white font-bold">{dateStr}</span>
            <span className="text-xs text-indigo-400 font-mono font-semibold">{timeStr}</span>
          </div>
        );
      },
    },
    { key: 'foodName', label: 'Food Item', render: (val) => <span className="font-bold text-white">{val}</span> },
    {
      key: 'servedGrams',
      label: 'Served (g)',
      render: (value) => <span className="text-slate-200 font-semibold">{value}g</span>,
    },
    { 
      key: 'calories', 
      label: 'Calories (kcal)',
      render: (val) => <span className="text-orange-400 font-bold">{val} kcal</span>
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fadeIn pb-12">

        {/* 1. GOVERNMENT OF INDIA OFFICIAL PLATFORM BANNER */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-xl shadow-inner">
                <Award size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                    भारत सरकार &bull; GOVERNMENT OF INDIA
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    PM POSHAN SCHEME
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                    ICMR-NIN 2020 RDA
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                  National Child Nutrition Surveillance &amp; Clinical Decision Platform
                </h1>
                <p className="text-slate-300 text-sm mt-0.5 font-medium">
                  Autonomous Mid-Day Meal Dispenser &bull; WHO 5-19 Growth Analytics &bull; Targeted Dietary Intervention
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto bg-slate-800/90 px-4 py-2 rounded-xl border border-slate-700">
              <ShieldCheck className="text-emerald-400" size={20} />
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Status Verified</span>
                <span className="text-xs font-bold text-white">Clinical Grade AI</span>
              </div>
            </div>
          </div>

          {/* Quick Student Switcher Bar */}
          {allStudents.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-700/60">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5">
                  <Users size={14} className="text-indigo-400" />
                  Enrolled Students (Click to Switch Student Profile):
                </span>
                <span className="text-xs text-slate-400">
                  {allStudents.length} Students Registered
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {allStudents.map((s) => {
                  const isActive = String(s.id) === String(student.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => navigate(`/students/${s.id}`)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold border transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30 scale-105'
                          : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>{s.name}</span>
                      <span className="text-xs opacity-75 font-normal">
                        ({s.age}y &bull; ID {s.id})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. ICMR DAILY INTAKE & MACHINE SERVING SUMMARY PANEL */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-indigo-500/20">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-inner">
                <Flame size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    ICMR Daily Calorie Intake &amp; Machine Serving
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Student: {student.name} ({student.age} yrs, {student.gender || 'Child'})
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1">
                  Full 24-hour statutory energy intake based on ICMR-NIN 2020 RDA standard
                </p>
              </div>
            </div>

            {/* Machine Status Badge */}
            <div className="flex items-center gap-2">
              {student.nutritionAnalytics?.isMachineServed ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  Machine Dispensed: Confirmed
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  <Cpu size={16} className="text-slate-400" />
                  Machine Dispensed: Not Yet Today
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Total Required Daily Calories */}
            <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 flex flex-col justify-between shadow-md">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-300 font-bold mb-1">
                  1. Total Daily Calories to Intake (ICMR)
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl sm:text-5xl font-black text-white">
                    {student.nutritionAnalytics?.fullDayCalories}
                  </span>
                  <span className="text-base font-bold text-slate-300">kcal / day</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 mt-3 pt-3 border-t border-slate-700/60 font-medium">
                Mandated 24-hr pediatric energy quota (ICMR-NIN 2020)
              </p>
            </div>

            {/* Card 2: Served Calories from Machine */}
            <div className="bg-slate-800/80 rounded-xl p-5 border border-emerald-500/40 flex flex-col justify-between shadow-md">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                    2. Machine Served Calories
                  </p>
                  {student.nutritionAnalytics?.isMachineServed && (
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      Dispensed
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl sm:text-5xl font-black text-emerald-400">
                    {student.nutritionAnalytics?.actualServed}
                  </span>
                  <span className="text-base font-bold text-emerald-300">kcal</span>
                </div>
              </div>
              <p className="text-xs text-slate-200 mt-3 pt-3 border-t border-slate-700/60 font-medium">
                {student.nutritionAnalytics?.isMachineServed
                  ? `Machine dispensed ${student.nutritionAnalytics?.lastServedGrams ? `${student.nutritionAnalytics.lastServedGrams}g ` : ''}${student.nutritionAnalytics?.lastServedFood || 'Rice portion'} via IoT dispenser`
                  : 'Awaiting student RFID scan at automated dispenser'}
              </p>
            </div>

            {/* Card 3: Remaining Calories to Intake */}
            <div className="bg-slate-800/80 rounded-xl p-5 border border-orange-500/40 flex flex-col justify-between shadow-md">
              <div>
                <p className="text-xs uppercase tracking-wider text-orange-400 font-bold mb-1">
                  3. Remaining Calories to Intake
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl sm:text-5xl font-black text-orange-400">
                    {student.nutritionAnalytics?.remainingDailyCalories}
                  </span>
                  <span className="text-base font-bold text-orange-300">kcal remaining</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700/60">
                <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1.5">
                  <span>Daily Progress Fulfillment</span>
                  <span className="font-bold text-white">{student.nutritionAnalytics?.icmrFulfillmentPct}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, student.nutritionAnalytics?.icmrFulfillmentPct || 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. STUDENT ANTHROPOMETRY & BENCHMARKS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Box 1: Stature & Mass */}
          <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-1">Physical Stature</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold text-white">{student.height} cm</span>
              <span className="text-2xl font-extrabold text-indigo-300">{student.weight} kg</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Age: <strong className="text-white">{student.age} yrs</strong> &bull; Sex: <strong className="text-white">{student.gender || 'Child'}</strong>
            </p>
          </div>

          {/* Box 2: Pediatric BMI */}
          <div className={`p-4 rounded-xl border ${colors.border} ${colors.bg}`}>
            <span className="text-xs uppercase tracking-wider text-slate-300 font-bold block mb-1">Pediatric BMI</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className={`text-2xl font-extrabold ${colors.text}`}>{student.bmi}</span>
              <Badge variant={colors.badge} size="md">
                {bmiStatus.label}
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              WHO Growth Reference (5-19 years)
            </p>
          </div>

          {/* Box 3: PM POSHAN Target */}
          <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-1">PM POSHAN School Target</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold text-white">{student.nutritionAnalytics?.schoolMealTarget} kcal</span>
              <span className="text-sm font-bold text-emerald-400">{student.nutritionAnalytics?.schoolMealProteinTarget}g Pro</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Served: <strong className="text-emerald-400">{student.nutritionAnalytics?.actualServed} kcal</strong> ({student.nutritionAnalytics?.fulfillmentPct}%)
            </p>
          </div>

          {/* Box 4: 7-Day Calorie Average */}
          <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-1">7-Day Daily Intake Avg</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold text-orange-400">
                {student.nutritionAnalytics?.avgWeeklyCalories || student.nutritionAnalytics?.actualServed} kcal
              </span>
              <span className="text-xs text-slate-400 font-semibold">Longitudinal</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Diet Pref: <strong className="text-white capitalize">{student.food_preference || 'Vegetarian'}</strong>
            </p>
          </div>
        </div>

        {/* 4. THE TWO PROMINENT REPORT CONTROLLER BUTTONS (GOVERNMENT PRESENTATION STANDARD) */}
        <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-2xl p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Interactive Assessment &amp; Advisory View Controller
              </span>
              <p className="text-sm text-slate-300 font-medium">
                Select an assessment mode to review targeted clinical diagnostics or personalized meal plans for <strong className="text-white">{student.name}</strong>.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold hidden sm:inline-block">
              Single-View Focus Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BUTTON 1: MALNUTRITION PREDICTION */}
            <button
              type="button"
              onClick={() => setActiveView('malnutrition')}
              className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${
                activeView === 'malnutrition'
                  ? 'bg-gradient-to-r from-indigo-900/90 via-slate-900 to-indigo-950 border-indigo-500 shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-400/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl border transition-all ${
                  activeView === 'malnutrition'
                    ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/30'
                    : 'bg-slate-800 text-indigo-400 border-slate-700 group-hover:bg-slate-700'
                }`}>
                  <Activity size={26} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                      1. Malnutrition &amp; Clinical Risk Prediction
                    </h3>
                    {activeView === 'malnutrition' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500 text-white">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 mt-1 font-medium">
                    Input average weekly calories, updated height &amp; weight to predict WHO growth status, malnutrition risk &amp; clinical conditions.
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono">
                      Current Status: {student.riskLevel?.toUpperCase()}
                    </span>
                    <span className="text-indigo-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Open Predictor <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* BUTTON 2: DIET RECOMMENDATION */}
            <button
              type="button"
              onClick={() => setActiveView('diet')}
              className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${
                activeView === 'diet'
                  ? 'bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950 border-emerald-500 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-400/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl border transition-all ${
                  activeView === 'diet'
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/30'
                    : 'bg-slate-800 text-emerald-400 border-slate-700 group-hover:bg-slate-700'
                }`}>
                  <Utensils size={26} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                      2. Personalized Diet Recommendations
                    </h3>
                    {activeView === 'diet' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 mt-1 font-medium">
                    Automated breakfast, lunch, and dinner plans customized to {student.name}&apos;s specific daily caloric deficit and dietary preference.
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono">
                      Target: {student.nutritionAnalytics?.fullDayCalories} kcal ({preference})
                    </span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View Meal Plans <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Tertiary View Option: 7-Day Analysis & Parent Reports */}
          <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-400">
              Need detailed longitudinal charts or guardian communication?
            </span>
            <button
              type="button"
              onClick={() => setActiveView('weekly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                activeView === 'weekly'
                  ? 'bg-purple-600 text-white border-purple-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
            >
              <FileText size={14} />
              <span>7-Day Longitudinal &amp; Parent Reports</span>
            </button>
          </div>
        </div>

        {/* 5. CONDITIONAL VIEW CONTAINER (ONLY ONE REPORT AT A TIME) */}
        <div>
          {/* VIEW 1: Dedicated Malnutrition & Clinical Risk Predictor */}
          {activeView === 'malnutrition' && (
            <div className="animate-fadeIn">
              <MalnutritionPredictor
                key={`malnutrition-${student.id}`}
                student={student}
                initialAvgCalories={student.nutritionAnalytics?.avgWeeklyCalories || student.nutritionAnalytics?.actualServed}
                onPredictionComplete={(pred) => {
                  if (pred.saved_to_db && pred.prediction?.risk_level) {
                    setStudent((prev) => ({
                      ...prev,
                      riskLevel: pred.prediction.risk_level,
                      current_bmi: pred.inputs?.calculated_bmi,
                      bmi: Number(pred.inputs?.calculated_bmi).toFixed(1),
                      height: pred.inputs?.height,
                      weight: pred.inputs?.weight,
                    }));
                  }
                }}
              />
            </div>
          )}

          {/* VIEW 2: Personalized Diet Recommendation Section */}
          {activeView === 'diet' && (
            <div className="animate-fadeIn">
              <DietRecommendationSection
                key={`diet-${student.id}`}
                plan={dietPlan}
                loading={dietLoading}
                currentPreference={preference}
                onPreferenceChange={handlePreferenceChange}
                onRefresh={handleRegenerateDietPlan}
              />
            </div>
          )}

          {/* VIEW 3: 7-Day Weekly Analysis & Parent Report Delivery */}
          {activeView === 'weekly' && (
            <div className="space-y-6 animate-fadeIn">
              <WeeklyNutritionAnalysisSection
                report={weeklyReport}
                loading={weeklyLoading}
                onRefresh={handleRegenerateWeeklyAnalysis}
              />
              <ParentReportDeliverySection
                studentId={id}
                studentName={student.name}
                initialParentContact={student.parent_contact}
              />
            </div>
          )}
        </div>

        {/* 6. Food Logs Table */}
        <div className="pt-4 border-t border-slate-800">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
            Recent Food Logs ({student.name})
          </h2>
          <Table
            columns={foodColumns}
            data={student.foodLogs || []}
            emptyMessage="No food logs recorded yet"
          />
        </div>

      </div>
    </MainLayout>
  );
}

export default StudentProfilePage;
