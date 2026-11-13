import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  User, 
  TrendingDown, 
  Utensils, 
  AlertCircle, 
  Calendar, 
  Flame, 
  CheckCircle2, 
  Cpu,
  Activity,
  Award,
  ShieldCheck,
  ArrowRight,
  FileText,
  Users,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import apiService from '../../../services/apiService.js';
import DietRecommendationSection from '../components/DietRecommendationSection.jsx';
import WeeklyNutritionAnalysisSection from '../components/WeeklyNutritionAnalysisSection.jsx';
import ParentReportDeliverySection from '../components/ParentReportDeliverySection.jsx';
import MalnutritionPredictor from '../components/MalnutritionPredictor.jsx';

function StudentNutritionTracker() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [error, setError] = useState(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [preference, setPreference] = useState('veg');

  // VIEW CONTROLLER: 'malnutrition' | 'diet' | 'weekly'
  // Defaults to 'malnutrition' so reports are not dumped all at once
  const [activeView, setActiveView] = useState('malnutrition');

  // Load all students for the Quick Switcher Bar
  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.students.getAll(1, 20);
        if (res.success && Array.isArray(res.data)) {
          setAllStudents(res.data);
        }
      } catch (err) {
        console.error('Failed to load student list:', err);
      }
    })();
  }, []);

  const loadStudentById = useCallback(async (studentId) => {
    if (!studentId) return;
    try {
      setLoading(true);
      setError(null);
      setSearchAttempted(true);
      const profileResponse = await apiService.students.getDetails(studentId);
      if (profileResponse.success && profileResponse.data) {
        setStudentData(profileResponse.data);
        if (profileResponse.data.student?.name) {
          setSearchQuery(profileResponse.data.student.name);
        }
        if (profileResponse.data.student?.food_preference) {
          setPreference(
            profileResponse.data.student.food_preference.toLowerCase().includes('non') ? 'non_veg' : 'veg'
          );
        }
      } else {
        setError('Failed to load student profile');
      }
    } catch (err) {
      setError(err.message || 'Failed to load student profile');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load on mount if query param present or default to first student (e.g. Ravi)
  useEffect(() => {
    const studentIdParam = searchParams.get('studentId');
    const nameParam = searchParams.get('name') || searchParams.get('q');

    if (studentIdParam) {
      loadStudentById(studentIdParam);
    } else if (nameParam) {
      setSearchQuery(nameParam);
      (async () => {
        try {
          setLoading(true);
          setSearchAttempted(true);
          const res = await apiService.students.getAll(1, 10, nameParam);
          if (res.success && res.data?.length) {
            await loadStudentById(res.data[0].id);
          }
        } catch {
          /* ignore */
        } finally {
          setLoading(false);
        }
      })();
    } else {
      (async () => {
        try {
          const res = await apiService.students.getAll(1, 5);
          if (res.success && res.data?.length) {
            await loadStudentById(res.data[0].id);
          }
        } catch {
          /* ignore */
        }
      })();
    }
  }, [searchParams, loadStudentById]);

  const handleSearch = useCallback(async (e) => {
    if (e) e.preventDefault();

    if (!searchQuery.trim()) {
      toast.error('Please enter student name');
      return;
    }

    setLoading(true);
    setError(null);
    setStudentData(null);
    setSearchAttempted(true);

    try {
      const studentsResponse = await apiService.students.getAll(1, 10, searchQuery);

      if (!studentsResponse.success || !studentsResponse.data.length) {
        setError(`No student found matching "${searchQuery}"`);
        toast.error('Student not found');
        return;
      }

      const student = studentsResponse.data[0];
      const profileResponse = await apiService.students.getDetails(student.id);

      if (profileResponse.success) {
        setStudentData(profileResponse.data);
        setSearchParams({ studentId: student.id });
        toast.success(`Loaded profile for ${student.name}`);
      } else {
        setError('Failed to load student profile');
        toast.error('Failed to load student profile');
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to search student';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, setSearchParams]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' };
      case 'at risk':
      case 'at_risk':
        return { bg: 'bg-amber-500/10', border: 'border-amber-500/50', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' };
      case 'underweight':
      case 'critical':
        return { bg: 'bg-rose-500/10', border: 'border-rose-500/50', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300' };
      default:
        return { bg: 'bg-slate-500/10', border: 'border-slate-500/50', text: 'text-slate-400', badge: 'bg-slate-500/20 text-slate-300' };
    }
  };

  const content = (
    <div className="space-y-6 pb-12">
      {/* 1. GOVERNMENT OF INDIA PRESENTATION HEADER */}
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
                Student Nutrition &amp; Dietary Surveillance Tracker
              </h1>
              <p className="text-slate-300 text-sm mt-0.5 font-medium">
                Real-Time Automated Serving Records &bull; Anthropometric Growth Diagnosis &bull; Targeted Diet Architecture
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-800/90 px-4 py-2 rounded-xl border border-slate-700 shadow-sm">
            <ShieldCheck className="text-emerald-400" size={20} />
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Surveillance Grade</span>
              <span className="text-xs font-bold text-white">Govt Accredited</span>
            </div>
          </div>
        </div>

        {/* Quick Student Switcher Chips */}
        {allStudents.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-700/60">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5">
                <Users size={14} className="text-indigo-400" />
                Select Enrolled Student Profile:
              </span>
              <span className="text-xs text-slate-400">
                {allStudents.length} Students in Registry
              </span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {allStudents.map((s) => {
                const isActive = String(s.id) === String(studentData?.student?.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSearchParams({ studentId: s.id });
                      loadStudentById(s.id);
                    }}
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

      {/* 2. SEARCH BAR SECTION */}
      <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-700/80 shadow-md">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student by name (e.g. Ravi, Nayana, bagesh, panch)..."
              className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-base"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !searchQuery.trim()}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-md shadow-indigo-600/30 text-base"
          >
            {loading ? 'Searching...' : 'Search Profile'}
          </button>
        </form>
      </div>

      {/* No Search Attempt */}
      {!searchAttempted && !studentData && (
        <div className="bg-slate-900/70 rounded-2xl p-12 text-center border border-slate-800 shadow-lg">
          <Search className="text-slate-500 mx-auto mb-4" size={48} />
          <p className="text-slate-300 text-lg font-medium">Select a student chip above or enter a name to review their nutritional metrics.</p>
        </div>
      )}

      {/* Error State */}
      {error && !studentData && (
        <div className="rounded-2xl p-6 border border-rose-500/50 bg-rose-500/10 shadow-lg">
          <div className="flex gap-3">
            <AlertCircle className="text-rose-400 flex-shrink-0 mt-1" size={22} />
            <div>
              <p className="text-rose-300 font-bold text-base">Student Record Not Found</p>
              <p className="text-slate-300 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-slate-900/70 rounded-2xl p-12 text-center border border-slate-800">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-slate-600 border-t-indigo-400 rounded-full mb-4" />
          <p className="text-slate-300 text-base font-medium">Loading comprehensive student nutritional records...</p>
        </div>
      )}

      {/* 3. ACTIVE STUDENT PROFILE DISPLAY */}
      {studentData && (
        <div className="space-y-6 animate-fadeIn">
          {/* SECTION A: Basic Anthropometric Information */}
          <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-700/80 shadow-xl">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-5 flex items-center gap-2.5">
              <User size={24} className="text-indigo-400" />
              Pediatric Profile &amp; Baseline Anthropometry
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono ml-2 font-normal">
                RFID: {studentData.student?.rfid_card_id || 'Assigned'}
              </span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Student Name</p>
                <p className="text-white font-extrabold text-xl">{studentData.student?.name || 'N/A'}</p>
              </div>
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Age &bull; Sex</p>
                <p className="text-white font-extrabold text-lg">
                  {studentData.student?.age} yrs &bull; {studentData.student?.gender || 'Child'}
                </p>
              </div>
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Stature (Height)</p>
                <p className="text-white font-extrabold text-xl">{studentData.student?.height || 'N/A'} cm</p>
              </div>
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Body Mass (Weight)</p>
                <p className="text-indigo-300 font-extrabold text-xl">{studentData.student?.weight || 'N/A'} kg</p>
              </div>
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Calculated BMI</p>
                <p className="text-white font-extrabold text-xl font-mono">
                  {studentData.student?.current_bmi ? Number(studentData.student.current_bmi).toFixed(2) : 'N/A'}
                </p>
              </div>
              <div className={`rounded-xl p-4 border ${getStatusColor(studentData.student?.risk_level).border} ${getStatusColor(studentData.student?.risk_level).bg}`}>
                <p className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">Screening Status</p>
                <div className={`font-black text-lg ${getStatusColor(studentData.student?.risk_level).text}`}>
                  {studentData.student?.risk_level?.toUpperCase() || 'HEALTHY'}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B: ICMR DAILY CALORIE INTAKE & MACHINE SERVING PANEL */}
          {studentData.nutrition_analytics && (() => {
            const age = Number(studentData.student?.age) || 10;
            const totalDailyCalories = (
              studentData.nutrition_analytics.total_daily_calories_icmr ||
              studentData.nutrition_analytics.full_day_calories_required ||
              (age <= 9 ? 1500 : 2200)
            );
            const servedCalories = (
              studentData.nutrition_analytics.machine_served_calories !== undefined
                ? studentData.nutrition_analytics.machine_served_calories
                : (studentData.nutrition_analytics.actual_school_calories_served || studentData.nutrition_analytics.todays_calories || 0)
            );
            const remainingCalories = (
              studentData.nutrition_analytics.icmr_remaining_calories !== undefined
                ? studentData.nutrition_analytics.icmr_remaining_calories
                : Math.max(0, totalDailyCalories - servedCalories)
            );
            const isMachineServed = (
              studentData.nutrition_analytics.is_machine_served !== undefined
                ? studentData.nutrition_analytics.is_machine_served
                : servedCalories > 0
            );
            const icmrFulfillmentPct = Math.min(100, Math.round((servedCalories / totalDailyCalories) * 100));

            return (
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
                          Student: {studentData.student?.name} ({studentData.student?.age} yrs)
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1">
                        Statutory 24h nutritional requirement for age {studentData.student?.age}y ({studentData.student?.gender || 'Child'})
                      </p>
                    </div>
                  </div>

                  {/* Machine Status Badge */}
                  <div className="flex items-center gap-2">
                    {isMachineServed ? (
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
                          {totalDailyCalories}
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
                        {isMachineServed && (
                          <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            Dispensed
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl sm:text-5xl font-black text-emerald-400">
                          {servedCalories}
                        </span>
                        <span className="text-base font-bold text-emerald-300">kcal</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-200 mt-3 pt-3 border-t border-slate-700/60 font-medium">
                      {isMachineServed
                        ? `Machine dispensed ${studentData.nutrition_analytics.last_served_grams ? `${studentData.nutrition_analytics.last_served_grams}g ` : ''}${studentData.nutrition_analytics.last_served_food || 'Rice portion'} via automated dispenser`
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
                          {remainingCalories}
                        </span>
                        <span className="text-base font-bold text-orange-300">kcal remaining</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-700/60">
                      <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1.5">
                        <span>Daily Progress Fulfillment</span>
                        <span className="font-bold text-white">{icmrFulfillmentPct}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${icmrFulfillmentPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* SECTION C: THE TWO PROMINENT REPORT CONTROLLER BUTTONS */}
          <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Interactive Assessment &amp; Advisory View Controller
                </span>
                <p className="text-sm text-slate-300 font-medium">
                  Select an assessment mode to review targeted clinical diagnostics or personalized meal plans for <strong className="text-white">{studentData.student?.name}</strong>.
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
                        Current Status: {studentData.student?.risk_level?.toUpperCase()}
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
                      Automated breakfast, lunch, and dinner plans customized to {studentData.student?.name}&apos;s specific daily caloric deficit and dietary preference.
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono">
                        Target: {studentData.nutrition_analytics?.total_daily_calories_icmr || 1700} kcal ({preference})
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

          {/* SECTION D: CONDITIONAL VIEW CONTAINER (ONLY ONE AT A TIME) */}
          <div>
            {/* VIEW 1: Dedicated Malnutrition Risk & Clinical Predictor */}
            {activeView === 'malnutrition' && (
              <div className="animate-fadeIn">
                <MalnutritionPredictor
                  key={`tracker-malnutrition-${studentData.student?.id}`}
                  student={studentData?.student}
                  initialAvgCalories={
                    studentData?.nutrition_analytics?.machine_served_calories ||
                    studentData?.nutrition_analytics?.actual_school_calories_served ||
                    studentData?.nutrition_analytics?.avg_weekly_daily_calories ||
                    studentData?.nutrition_analytics?.todays_calories
                  }
                  onPredictionComplete={(pred) => {
                    if (pred.saved_to_db && pred.prediction?.risk_level) {
                      setStudentData((prev) => ({
                        ...prev,
                        student: {
                          ...prev.student,
                          risk_level: pred.prediction.risk_level,
                          current_bmi: pred.inputs?.calculated_bmi,
                          height: pred.inputs?.height,
                          weight: pred.inputs?.weight,
                        },
                      }));
                    }
                  }}
                />
              </div>
            )}

            {/* VIEW 2: Personalized Diet Recommendations */}
            {activeView === 'diet' && (
              <div className="animate-fadeIn">
                <DietRecommendationSection
                  key={`tracker-diet-${studentData.student?.id}`}
                  plan={studentData.diet_recommendation}
                  loading={loading}
                  currentPreference={preference}
                  onPreferenceChange={async (newPref) => {
                    setPreference(newPref);
                    if (studentData?.student?.id) {
                      try {
                        const res = await apiService.students.generateDietRecommendation(studentData.student.id, newPref);
                        if (res.success && res.data) {
                          setStudentData((prev) => ({
                            ...prev,
                            diet_recommendation: res.data,
                          }));
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}
                  onRefresh={async (pref) => {
                    if (studentData?.student?.id) {
                      try {
                        setLoading(true);
                        const res = await apiService.students.generateDietRecommendation(studentData.student.id, pref);
                        if (res.success && res.data) {
                          setStudentData((prev) => ({
                            ...prev,
                            diet_recommendation: res.data,
                          }));
                          toast.success('Regenerated personalized recommendations');
                        }
                      } catch {
                        toast.error('Failed to regenerate recommendations');
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                />
              </div>
            )}

            {/* VIEW 3: 7-Day Weekly Analysis & Parent Report Delivery */}
            {activeView === 'weekly' && (
              <div className="space-y-6 animate-fadeIn">
                <WeeklyNutritionAnalysisSection
                  report={studentData.weekly_analysis}
                  loading={loading}
                  onRefresh={async () => {
                    if (studentData?.student?.id) {
                      try {
                        setLoading(true);
                        const res = await apiService.students.generateWeeklyAnalysis(studentData.student.id);
                        if (res.success && res.data) {
                          setStudentData((prev) => ({
                            ...prev,
                            weekly_analysis: res.data,
                          }));
                          toast.success('Regenerated 7-day weekly analysis');
                        }
                      } catch {
                        toast.error('Failed to regenerate weekly analysis');
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                />

                <ParentReportDeliverySection
                  studentId={studentData.student?.id}
                  studentName={studentData.student?.name}
                  initialParentContact={
                    studentData.parent_contact || {
                      parent_name: studentData.student?.parent_name,
                      parent_email: studentData.student?.parent_email,
                      parent_phone: studentData.student?.parent_phone,
                      parent_email_verified: studentData.student?.parent_email_verified,
                      parent_report_consent: studentData.student?.parent_report_consent,
                    }
                  }
                  onContactUpdated={(updated) => {
                    setStudentData((prev) => ({
                      ...prev,
                      parent_contact: updated,
                      student: {
                        ...prev.student,
                        ...updated,
                      },
                    }));
                  }}
                />
              </div>
            )}
          </div>

          {/* SECTION E: Food Serving History */}
          {studentData.food_history && studentData.food_history.length > 0 && (
            <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-700/80 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <Calendar size={22} className="text-slate-400" />
                Food Serving History (Last {studentData.food_history.length} Dispensed Portions)
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/80">
                      <th className="text-left py-3 px-4 text-slate-300 font-bold uppercase text-xs">Date &amp; Time</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-bold uppercase text-xs">Food Item</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-bold uppercase text-xs">Dispensed Grams</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-bold uppercase text-xs">Energy (Calories)</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-bold uppercase text-xs">Protein</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentData.food_history.map((log, idx) => (
                      <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-slate-300 font-medium whitespace-nowrap">
                          {log.logged_at ? (
                            <div className="flex flex-col">
                              <span className="text-white font-bold">
                                {new Date(log.logged_at).toLocaleDateString('en-IN', {
                                  timeZone: 'Asia/Kolkata',
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 mt-0.5 font-semibold">
                                <Clock size={12} className="text-emerald-400 shrink-0" />
                                <span>
                                  {new Date(log.logged_at).toLocaleTimeString('en-IN', {
                                    timeZone: 'Asia/Kolkata',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true,
                                  })}
                                </span>
                                <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-sans font-bold">
                                  IST
                                </span>
                              </span>
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="py-3 px-4 text-white font-bold">{log.food_item}</td>
                        <td className="py-3 px-4 text-slate-200 font-medium">{log.served_grams}g</td>
                        <td className="py-3 px-4 text-orange-400 font-bold">{log.estimated_calories} kcal</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">
                          {log.protein !== undefined && log.protein !== null ? `${Number(log.protein).toFixed(1)}g` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return <MainLayout>{content}</MainLayout>;
}

export default StudentNutritionTracker;
