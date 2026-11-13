import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import { useDashboardData } from '../hooks/useDashboardData.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import apiService from '../../../services/apiService.js';
import {
  Users,
  UtensilsCrossed,
  AlertTriangle,
  Activity,
  UserPlus,
  Landmark,
  Radio,
  Clock,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';

function DashboardPage() {
  const { data, loading, error, refetch } = useDashboardData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [hardwareStatus, setHardwareStatus] = useState({
    mode: 'simulation',
    status: 'Ready (Simulated)',
    scaleConnected: false,
    rfidConnected: false,
  });

  const [recentStudents, setRecentStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Fetch quick hardware status and recent students
  useEffect(() => {
    let isMounted = true;

    async function fetchExtraData() {
      try {
        setLoadingStudents(true);
        const [hwRes, studRes] = await Promise.allSettled([
          apiService.hardware ? apiService.hardware.getStatus() : Promise.resolve({ data: null }),
          apiService.students.getAll(1, 5),
        ]);

        if (isMounted) {
          if (hwRes.status === 'fulfilled' && hwRes.value?.success) {
            setHardwareStatus({
              mode: hwRes.value.data?.hardwareMode ? 'live' : 'simulation',
              status: hwRes.value.data?.hardwareMode ? 'Connected' : 'Simulation Mode',
              scaleConnected: Boolean(hwRes.value.data?.scaleConnected),
              rfidConnected: Boolean(hwRes.value.data?.rfidConnected),
            });
          }

          if (studRes.status === 'fulfilled' && studRes.value?.success) {
            const list = Array.isArray(studRes.value.data)
              ? studRes.value.data
              : studRes.value.data?.students || [];
            setRecentStudents(list.slice(0, 5));
          }
        }
      } catch (e) {
        console.error('Error fetching dashboard extra data:', e);
      } finally {
        if (isMounted) setLoadingStudents(false);
      }
    }

    fetchExtraData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Formatted current date
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Extract KPI values
  const totalStudents = data?.kpis?.find((k) => k.id === 1)?.value ?? 0;
  const mealsServedToday = data?.kpis?.find((k) => k.id === 2)?.value ?? 0;
  const atRiskCount = data?.kpis?.find((k) => k.id === 3)?.value ?? 0;
  const avgBmi = data?.kpis?.find((k) => k.id === 4)?.value ?? 0;

  const activities = data?.activityFeed || [];
  const riskDist = data?.riskDistribution || [];
  const hasRiskData = riskDist.some((r) => r.value > 0);

  return (
    <MainLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        
        {/* Welcome & Context Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1.5">
                  <ShieldCheck size={14} /> PM POSHAN Nutritional Assurance System
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar size={13} /> {todayFormatted}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Welcome back, {user?.name || 'School Staff'}
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Institution: <strong className="text-slate-200">{user?.school_name || 'Govt. Model Primary School'}</strong> • Real-time dietary surveillance & pediatric growth monitoring.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/students/register"
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
              >
                <UserPlus size={16} />
                <span>+ Register Student</span>
              </Link>

              <Link
                to="/food-distribution"
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <UtensilsCrossed size={16} className="text-emerald-400" />
                <span>Meal Station</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Primary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* KPI 1: Total Students */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Enrolled</p>
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Users size={19} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <p className="text-3xl font-extrabold text-white tracking-tight">{totalStudents}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Registered pupils</p>
              </div>
              <Link
                to="/students"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                View all <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          {/* KPI 2: Meals Served Today */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Servings Today</p>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <UtensilsCrossed size={19} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <p className="text-3xl font-extrabold text-white tracking-tight">{mealsServedToday}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Confirmed meal distributions</p>
              </div>
              <Link
                to="/food-distribution"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                Log meal <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          {/* KPI 3: At-Risk Count */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Nutritional Review</p>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <AlertTriangle size={19} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <p className="text-3xl font-extrabold text-white tracking-tight">{atRiskCount}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Students needing screening</p>
              </div>
              <Link
                to="/alerts"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                Alerts <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          {/* KPI 4: Average BMI */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Cohort Avg. BMI</p>
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
                <Activity size={19} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <p className="text-3xl font-extrabold text-white tracking-tight">
                  {avgBmi > 0 ? avgBmi : '--'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Target: 15.0 - 20.0 kg/m²</p>
              </div>
              <Link
                to="/analytics"
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                Analytics <ChevronRight size={13} />
              </Link>
            </div>
          </div>

        </div>

        {/* Middle Section: Hardware Status Widget & Government Schemes Spotlight */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Hardware Connection Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Radio className="text-indigo-400" size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    Hardware Status
                  </h3>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  🔵 Simulation Mode
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                The smart mid-day meal station combines an HX711 precision load cell with an RC522 RFID card scanner. When physical devices are not plugged in via USB/UART, software simulation handles serving dispatches.
              </p>

              <div className="mt-5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                  <span className="text-slate-400">HX711 Load Cell Scale</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Active (Simulation)
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                  <span className="text-slate-400">RC522 RFID Card Reader</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Ready (Card Scan Enabled)
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                  <span className="text-slate-400">AI Random Forest Predictor</span>
                  <span className="text-indigo-400 font-semibold flex items-center gap-1">
                    <Sparkles size={13} /> Microservice Port 8000
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <Link
                to="/food-distribution"
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Open Meal Weighing Station</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* PM POSHAN Statutory Spotlight (2 cols) */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-emerald-950/20 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <Landmark size={14} /> PM POSHAN Statutory Standards
                </span>
                <Link
                  to="/government-schemes"
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  Explore all 5 schemes →
                </Link>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                National Calorie & Protein Norms for Mid-Day School Meals
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Mandated by the Ministry of Education, every school meal must fulfill specific energy and protein benchmarks based on the student's educational tier.
              </p>

              {/* Targets Comparison Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Primary Tier (Class I–V, Age ≤10)
                  </p>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-2xl font-extrabold text-white">450</span>
                    <span className="text-xs text-slate-400">Calories (kcal)</span>
                    <span className="text-2xl font-extrabold text-emerald-400 ml-auto">12g</span>
                    <span className="text-xs text-slate-400">Protein</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Foodgrain norm: 100g per child per day</p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Upper Primary Tier (Class VI–VIII, Age &gt;10)
                  </p>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-2xl font-extrabold text-white">700</span>
                    <span className="text-xs text-slate-400">Calories (kcal)</span>
                    <span className="text-2xl font-extrabold text-indigo-400 ml-auto">20g</span>
                    <span className="text-xs text-slate-400">Protein</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Foodgrain norm: 150g per child per day</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Info size={14} className="text-emerald-400" />
                Language compliance: Serving records represent verified meal distributions.
              </span>
              <Link
                to="/government-schemes"
                className="text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                Government Schemes Page →
              </Link>
            </div>
          </div>

        </div>

        {/* Lower Grid: Recent Student Registrations & Recent Meal Servings Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent Student Enrollments */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Recent Student Registrations
                </h3>
              </div>
              <Link
                to="/students/register"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                + Register <ChevronRight size={13} />
              </Link>
            </div>

            {loadingStudents ? (
              <div className="space-y-2 py-4">
                <div className="h-10 bg-slate-950/60 rounded-xl animate-pulse" />
                <div className="h-10 bg-slate-950/60 rounded-xl animate-pulse" />
              </div>
            ) : recentStudents.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80">
                <p className="text-xs text-slate-400">No students enrolled yet.</p>
                <Link
                  to="/students/register"
                  className="mt-2 inline-block text-xs text-emerald-400 font-semibold hover:underline"
                >
                  Enroll your first student now →
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => navigate(`/students/${student.id}`)}
                    className="p-3 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-2xl flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center">
                        {student.name ? student.name[0].toUpperCase() : 'S'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{student.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {student.admission_number || `RFID: ${student.rfid_card_id || '--'}`} • {student.gender} ({student.age}y)
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-semibold text-white">
                        BMI: {student.current_bmi || '--'}
                      </p>
                      <span className="text-[10px] text-emerald-400 font-medium">
                        {student.class_grade || 'Primary'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirmed Meal Distributions Activity */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UtensilsCrossed size={18} className="text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Recent Meal Distributions
                </h3>
              </div>
              <Link
                to="/food-distribution"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                Station Log <ChevronRight size={13} />
              </Link>
            </div>

            {activities.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80">
                <p className="text-xs text-slate-400">
                  No meal distributions recorded yet today.
                </p>
                <Link
                  to="/food-distribution"
                  className="mt-2 inline-block text-xs text-emerald-400 font-semibold hover:underline"
                >
                  Record meal at smart weighing station →
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activities.slice(0, 5).map((act, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                        <UtensilsCrossed size={15} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {act.studentName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {act.foodName || 'Mid-day meal'} ({act.quantity || 'Standard serving'})
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock size={11} />
                      {act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </MainLayout>
  );
}

export default DashboardPage;