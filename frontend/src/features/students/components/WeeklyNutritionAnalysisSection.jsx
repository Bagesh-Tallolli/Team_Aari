import React, { useState } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Activity,
  Flame,
  Zap,
  ShieldCheck,
  Award,
  Heart,
  Clock,
  ChevronRight,
  Sparkles,
  BarChart2,
  FileText
} from 'lucide-react';
import Card from '../../../components/common/Card.jsx';
import Badge from '../../../components/common/Badge.jsx';

function WeeklyNutritionAnalysisSection({
  report,
  loading,
  onRefresh,
}) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);

  // Safe fallback for report data and dailyBreakdown to prevent any ReferenceError or crash
  const safeReport = report && typeof report === 'object' ? report : {};
  const dailyBreakdown = Array.isArray(safeReport.daily_breakdown)
    ? safeReport.daily_breakdown
    : (Array.isArray(safeReport.dailyBreakdown) ? safeReport.dailyBreakdown : []);

  if (loading) {
    return (
      <Card variant="default" className="p-6">
        <div className="flex flex-col items-center justify-center py-12 space-y-3 text-slate-400">
          <RefreshCw size={28} className="animate-spin text-indigo-400" />
          <span className="text-base font-medium">Generating 7-day longitudinal nutrition analysis...</span>
          <p className="text-xs text-slate-500">Querying PostgreSQL serving records &amp; evaluating PM POSHAN benchmarks</p>
        </div>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card variant="default" className="p-6">
        <div className="text-center py-8">
          <Calendar size={36} className="mx-auto text-slate-500 mb-3" />
          <h3 className="text-lg font-bold text-white">No Weekly Nutrition Report Available</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
            Generate a 7-day longitudinal analysis based on confirmed food-serving records from PostgreSQL.
          </p>
          {onRefresh && (
            <button
              onClick={() => onRefresh()}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-md transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={14} />
              <span>Generate Weekly Analysis</span>
            </button>
          )}
        </div>
      </Card>
    );
  }

  const {
    student = {},
    period = {},
    school_meal_intake = {},
    pm_poshan_target = {},
    full_day_context = {},
    anthropometric_screening = {},
    ai_risk_assessment = {},
    trend_analysis = {},
    parent_summary: parentSummary = safeReport.parentSummary || '',
    disclaimers = {},
    from_db_cache: _from_db_cache = false,
  } = safeReport;

  const ruleRisk = ai_risk_assessment.rule_based || {};
  const aiAux = ai_risk_assessment.ai_auxiliary || {};

  const getTrendIcon = (direction) => {
    if (direction === 'Improving') return <TrendingUp size={16} className="text-emerald-400" />;
    if (direction === 'Declining') return <TrendingDown size={16} className="text-amber-400" />;
    return <Minus size={16} className="text-slate-400" />;
  };

  const getTrendBadgeColor = (badge) => {
    if (badge === 'positive') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (badge === 'warning') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
  };

  const getRiskBadgeColor = (level) => {
    if (level === 'healthy') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (level === 'moderate') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (level === 'high') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
  };

  return (
    <Card variant="default" className="space-y-6">
      
      {/* 1. Header with Period & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Weekly Nutrition Analysis &amp; Monitoring
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                  7-Day Longitudinal
                </span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Monitoring actual mid-day meal intake, PM POSHAN statutory fulfillment, and WHO pediatric growth
              </p>
            </div>
          </div>
        </div>

        {/* Action button & period tags */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs text-slate-300 font-mono">
            <Clock size={13} className="text-slate-400" />
            <span>{period.start_date} → {period.end_date}</span>
          </div>

          <div className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
            period.recorded_days_count >= 5
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : period.recorded_days_count >= 2
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {period.recorded_days_count} / 7 Days Active ({period.data_completeness_pct}%)
          </div>

          {onRefresh && (
            <button
              onClick={() => onRefresh(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg border border-indigo-500/40 shadow-sm transition-colors"
              title="Re-run 7-day calculations from fresh database records"
            >
              <RefreshCw size={13} />
              <span>Regenerate</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Key Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric A: Rule-Based Weekly Risk */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Weekly Status Flag</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${getRiskBadgeColor(ruleRisk.level)}`}>
              {ruleRisk.level ? ruleRisk.level.toUpperCase() : 'MONITOR'}
            </span>
          </div>
          <div className="text-sm font-bold text-white">
            {ruleRisk.category || 'Normal monitoring'}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
            {ruleRisk.reason || 'Consistently meets statutory criteria.'}
          </p>
        </div>

        {/* Metric B: PM POSHAN Statutory Fulfillment */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">School Meal Energy</span>
            <span className="text-[11px] text-indigo-400 font-semibold">
              {pm_poshan_target.calorie_fulfillment_pct || 0}% Target
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {school_meal_intake.avg_daily_calories || 0}
            </span>
            <span className="text-xs text-slate-400">
              / {pm_poshan_target.target_calories || 450} kcal avg
            </span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                (pm_poshan_target.calorie_fulfillment_pct || 0) >= 95
                  ? 'bg-emerald-400'
                  : (pm_poshan_target.calorie_fulfillment_pct || 0) >= 75
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
              style={{ width: `${Math.min(100, pm_poshan_target.calorie_fulfillment_pct || 0)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 flex justify-between">
            <span>Met: {pm_poshan_target.days_met || 0} days</span>
            <span>Below: {pm_poshan_target.days_below || 0} days</span>
          </div>
        </div>

        {/* Metric C: Anthropometric Screening */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Growth Screening</span>
            <span className="text-[10px] text-slate-400 bg-slate-700/60 px-1.5 py-0.5 rounded">
              WHO 5-19
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              BMI {anthropometric_screening.bmi || student.current_bmi || '—'}
            </span>
            <span className="text-xs text-slate-400">
              ({student.height_cm || student.height || 0}cm, {student.weight_kg || student.weight || 0}kg)
            </span>
          </div>
          <div className="text-xs font-semibold text-emerald-300">
            {anthropometric_screening.screening_label || anthropometric_screening.screening_category || 'Healthy Growth'}
          </div>
          <p className="text-[10px] text-slate-400 italic">
            Screening indicator only • Not a clinical diagnosis
          </p>
        </div>

        {/* Metric D: Week-Over-Week Trend */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Weekly Trend</span>
            <div className="flex items-center gap-1">
              {getTrendIcon(trend_analysis.direction)}
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${getTrendBadgeColor(trend_analysis.badge)}`}>
                {trend_analysis.direction || 'Stable'}
              </span>
            </div>
          </div>
          <div className="text-sm font-bold text-white">
            {trend_analysis.diff_pct ? `${trend_analysis.diff_pct > 0 ? '+' : ''}${trend_analysis.diff_pct}%` : '0%'}
            <span className="text-xs font-normal text-slate-400 ml-1.5">vs prior week</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
            {trend_analysis.summary || 'Consistent meal intake recorded.'}
          </p>
        </div>

      </div>

      {/* 3. Daily Breakdown: 7-Day Interactive Longitudinal Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart2 size={16} className="text-indigo-400" />
            7-Day Longitudinal Daily Breakdown
          </h3>
          <span className="text-xs text-slate-400">
            Click any day to inspect food items served
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
          {dailyBreakdown.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            const targetCal = pm_poshan_target.target_calories || 450;
            const pct = targetCal > 0 ? Math.round((day.calories / targetCal) * 100) : 0;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDayIndex(isSelected ? null : idx)}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'bg-indigo-900/30 border-indigo-500/60 ring-1 ring-indigo-500'
                    : day.is_recorded
                    ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80'
                    : 'bg-slate-800/30 hover:bg-slate-800/50 border-dashed border-slate-700/50 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">
                    {day.day_of_week?.slice(0, 3)}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    day.is_recorded
                      ? day.met_school_target
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                      : 'bg-slate-700/60 text-slate-400'
                  }`}>
                    {day.is_recorded ? `${pct}%` : 'Unrecorded'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 font-mono mb-2">
                  {day.date.slice(5)}
                </div>

                {day.is_recorded ? (
                  <div className="space-y-1.5">
                    <div className="text-sm font-bold text-white flex items-baseline gap-1">
                      <span>{day.calories}</span>
                      <span className="text-[10px] text-slate-400 font-normal">kcal</span>
                    </div>
                    <div className="text-xs text-indigo-300 font-medium">
                      {day.protein}g <span className="text-[10px] text-slate-400">protein</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-1 overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full ${
                          day.met_school_target ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 pt-0.5 truncate">
                      {day.meals_count} item(s) logged
                    </div>
                  </div>
                ) : (
                  <div className="py-3 text-center text-slate-500 text-xs">
                    No School Meal
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day Inspector Drawer */}
        {selectedDayIndex !== null && dailyBreakdown[selectedDayIndex] && (
          <div className="p-4 rounded-xl bg-slate-800/90 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-indigo-400" />
                <span className="text-sm font-bold text-white">
                  {dailyBreakdown[selectedDayIndex].day_of_week}, {dailyBreakdown[selectedDayIndex].date}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  dailyBreakdown[selectedDayIndex].is_recorded
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {dailyBreakdown[selectedDayIndex].is_recorded ? 'Meal Recorded' : 'No Serving Logged'}
                </span>
              </div>
              <button
                onClick={() => setSelectedDayIndex(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close ✕
              </button>
            </div>

            {dailyBreakdown[selectedDayIndex].is_recorded ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-900/50 border border-slate-700/50">
                    <span className="text-slate-400">Total Calories:</span>
                    <span className="font-bold text-white ml-1.5">{dailyBreakdown[selectedDayIndex].calories} kcal</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/50 border border-slate-700/50">
                    <span className="text-slate-400">Total Protein:</span>
                    <span className="font-bold text-indigo-300 ml-1.5">{dailyBreakdown[selectedDayIndex].protein} g</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/50 border border-slate-700/50">
                    <span className="text-slate-400">Iron (IFCT):</span>
                    <span className="font-bold text-amber-300 ml-1.5">{dailyBreakdown[selectedDayIndex].iron_mg} mg</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/50 border border-slate-700/50">
                    <span className="text-slate-400">Calcium (IFCT):</span>
                    <span className="font-bold text-cyan-300 ml-1.5">{dailyBreakdown[selectedDayIndex].calcium_mg} mg</span>
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-300">Measured Food Items:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {dailyBreakdown[selectedDayIndex].items?.map((item, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white capitalize">{item.food_item}</div>
                        <div className="text-slate-400 text-[11px]">{item.served_grams}g measured serving</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-indigo-300">{item.calories} kcal</div>
                        <div className="text-slate-400 text-[11px]">{item.protein}g protein</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No school meal transaction recorded on this date. School might have been closed, or the student did not scan RFID.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 4. PM POSHAN vs Full-Day Reference Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Left Column: School-Meal Norm (PM POSHAN) */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Award size={16} className="text-amber-400" />
              PM POSHAN School-Meal Statutory Allocation
            </h4>
            <span className="text-xs font-medium text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {pm_poshan_target.target_category || 'Primary'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Statutory mid-day meal mandate designed to deliver 1/3 of daily energy and 1/2 of daily protein.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Energy Benchmark</span>
              <span className="text-base font-bold text-white">{pm_poshan_target.target_calories} kcal</span>
              <span className="text-[11px] text-slate-400 block mt-1">
                Actual avg: <strong className="text-indigo-300">{school_meal_intake.avg_daily_calories} kcal</strong>
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Protein Benchmark</span>
              <span className="text-base font-bold text-white">{pm_poshan_target.target_protein} g</span>
              <span className="text-[11px] text-slate-400 block mt-1">
                Actual avg: <strong className="text-indigo-300">{school_meal_intake.avg_daily_protein} g</strong>
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-xs space-y-1">
            <div className="flex justify-between font-semibold text-slate-300">
              <span>Statutory Compliance Rate:</span>
              <span className="text-indigo-300">{pm_poshan_target.calorie_fulfillment_pct}%</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Remaining school meal gap:</span>
              <span>{pm_poshan_target.calorie_gap} kcal / {pm_poshan_target.protein_gap}g protein</span>
            </div>
          </div>
        </div>

        {/* Right Column: Full-Day Reference (ICMR-NIN 2020 RDA) */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Heart size={16} className="text-rose-400" />
              Full-Day Requirement &amp; Untracked Home Meals
            </h4>
            <span className="text-xs font-medium text-slate-300 bg-slate-700/50 px-2 py-0.5 rounded border border-slate-600/50">
              ICMR-NIN 2020
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Total 24-hour estimated energy requirement for student's age ({student.age}y, {student.gender}).
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Total Full-Day Requirement</span>
              <span className="text-base font-bold text-white">{full_day_context.full_day_calories_required} kcal</span>
              <span className="text-[11px] text-slate-400 block mt-1">
                Protein: {full_day_context.full_day_protein_required} g/day
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Remaining Daily Requirement</span>
              <span className="text-base font-bold text-amber-300">~{full_day_context.estimated_remaining_daily_calories} kcal</span>
              <span className="text-[11px] text-slate-400 block mt-1">
                Protein: ~{full_day_context.estimated_remaining_daily_protein} g
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
            <div className="flex items-start gap-1.5 font-semibold text-amber-300 mb-0.5">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>{full_day_context.disclaimer_label}</span>
            </div>
            <p className="text-[11px] text-amber-200/80">
              {full_day_context.disclaimer_text}
            </p>
          </div>
        </div>

      </div>

      {/* 5. Auxiliary AI Screening Section (Random Forest Model) */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" />
            <h4 className="text-sm font-bold text-white">Auxiliary AI Risk Screening</h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              Random Forest Model
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {aiAux.reason || 'Auxiliary machine learning model evaluated with 17 student nutrition & growth features.'}
          </p>
          <p className="text-[10px] text-slate-500 italic">
            {aiAux.disclaimer || 'Auxiliary indicator only. Does not replace statutory school monitoring or pediatric clinical judgment.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
          <div className="text-right">
            <div className="text-xs text-slate-400">Screening Result</div>
            <div className="text-sm font-bold text-white capitalize">{aiAux.status || 'Healthy'}</div>
          </div>
          {aiAux.confidence ? (
            <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-300">
              {Math.round(aiAux.confidence * 100)}% Conf.
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded bg-slate-700/50 border border-slate-600/50 text-[11px] text-slate-300">
              Rule-Assisted
            </div>
          )}
        </div>
      </div>

      {/* 6. Parent-Friendly Summary Narrative (Phase 7 Preview) */}
      {parentSummary && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/30 via-slate-800/60 to-slate-800/30 border border-indigo-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} />
              Parent Communication Summary (Phase 7 Ready)
            </h4>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              School Report Card Note
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            "{parentSummary}"
          </p>
        </div>
      )}

      {/* 7. Statutory & Non-Clinical Footer Disclaimers */}
      <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <p>
          <strong className="text-slate-300">PM POSHAN Statutory Framework:</strong> {disclaimers.statutory_notice}
        </p>
        <p>
          <strong className="text-slate-300">Non-Clinical Screening Disclaimer:</strong> {disclaimers.clinical_notice}
        </p>
      </div>

    </Card>
  );
}

export default WeeklyNutritionAnalysisSection;

