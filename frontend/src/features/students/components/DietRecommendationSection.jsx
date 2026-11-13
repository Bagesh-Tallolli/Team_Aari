import React, { useState } from 'react';
import { 
  Utensils, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Sparkles, 
  RefreshCw, 
  Clock, 
  ShieldCheck, 
  Heart, 
  Apple, 
  Flame, 
  Zap, 
  Activity 
} from 'lucide-react';
import Card from '../../../components/common/Card.jsx';
import Badge from '../../../components/common/Badge.jsx';

function DietRecommendationSection({ 
  plan, 
  loading, 
  onRefresh, 
  currentPreference = 'veg',
  onPreferenceChange 
}) {
  const [activeTab, setActiveTab] = useState('all');

  if (loading) {
    return (
      <Card variant="default" className="p-6">
        <div className="flex items-center justify-center py-12 space-x-3 text-slate-400">
          <RefreshCw size={24} className="animate-spin text-indigo-400" />
          <span className="text-base font-medium">Generating personalized diet recommendations...</span>
        </div>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card variant="default" className="p-6">
        <div className="text-center py-8">
          <Utensils size={36} className="mx-auto text-slate-500 mb-3" />
          <h3 className="text-lg font-bold text-white">No Recommendation Plan Available</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
            Recommendations require verified student profile data and recorded school food logs.
          </p>
          {onRefresh && (
            <button
              onClick={() => onRefresh(currentPreference)}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-md transition-colors"
            >
              Generate Recommendations
            </button>
          )}
        </div>
      </Card>
    );
  }

  const {
    student_summary = {},
    school_meal_assessment = {},
    remaining_full_day_context = {},
    nutrients_needing_attention = [],
    personalized_recommendations = [],
    monitoring_and_trend = {},
    auxiliary_ai_screening = null,
    generated_at: _generated_at = null,
  } = plan;

  const target = school_meal_assessment?.target || {};
  const actualServed = school_meal_assessment?.actual_served_today || {};
  const gap = school_meal_assessment?.gap_and_fulfillment || {};
  const fullDayReq = remaining_full_day_context?.full_day_requirement || {};
  const remainingEst = remaining_full_day_context?.estimated_remaining || {};

  const filteredSuggestions = activeTab === 'all'
    ? personalized_recommendations
    : personalized_recommendations.filter(item => item.domain === activeTab);

  return (
    <Card variant="default" className="space-y-6">
      
      {/* 1. Header with Controls & Generation Metadata */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Utensils size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Personalized Diet Recommendations
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  PM POSHAN &amp; ICMR Standards
                </span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Age-appropriate, verified nutritional gap analysis based strictly on actual school-meal records
              </p>
            </div>
          </div>
        </div>

        {/* Dietary preference & Regenerate button */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <div className="bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 flex text-xs font-semibold">
            <button
              onClick={() => onPreferenceChange && onPreferenceChange('veg')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                currentPreference === 'veg'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vegetarian
            </button>
            <button
              onClick={() => onPreferenceChange && onPreferenceChange('non_veg')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                currentPreference === 'non_veg'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Non-Vegetarian / Egg
            </button>
          </div>

          {onRefresh && (
            <button
              onClick={() => onRefresh(currentPreference)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg border border-indigo-500/40 shadow-sm transition-colors"
              title="Regenerate recommendation based on latest logs"
            >
              <RefreshCw size={13} />
              <span>Regenerate</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. School-Meal Assessment vs Mandated Benchmark */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Statutory Target */}
        <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>PM POSHAN Statutory Norm</span>
            <span className="font-mono text-indigo-400">{target.stage || 'Target'}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{target.calories_kcal || 450}</span>
            <span className="text-xs text-slate-400">kcal energy</span>
          </div>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between border-t border-slate-700/40 pt-2">
            <span className="text-slate-400">Mandated Protein:</span>
            <span className="font-bold text-white">{target.protein_g || 12.0}g</span>
          </div>
        </div>

        {/* Card 2: Actual School Served */}
        <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Actual Measured School Serving</span>
            <span className="font-mono text-emerald-400">HX711 Verified</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">{actualServed.calories_kcal || 0}</span>
            <span className="text-xs text-slate-400">kcal served</span>
          </div>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between border-t border-slate-700/40 pt-2">
            <span className="text-slate-400">Measured Protein:</span>
            <span className="font-bold text-emerald-300">{actualServed.protein_g || 0}g</span>
          </div>
        </div>

        {/* Card 3: School-Meal Fulfillment & Gap */}
        <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>School-Meal Goal Fulfillment</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              gap.status === 'GOAL_MET'
                ? 'bg-emerald-500/20 text-emerald-300'
                : (gap.status === 'NOT_SERVED_TODAY' ? 'bg-slate-700 text-slate-300' : 'bg-amber-500/20 text-amber-300')
            }`}>
              {gap.status === 'GOAL_MET' ? 'Target Met' : (gap.status === 'NOT_SERVED_TODAY' ? 'Not Served' : 'Portion Gap')}
            </span>
          </div>
          
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xl font-bold text-white">{gap.calorie_fulfillment_pct || 0}%</span>
            <span className="text-xs text-orange-400 font-semibold">
              {gap.calorie_gap_kcal > 0 ? `-${gap.calorie_gap_kcal} kcal gap` : '0 kcal gap'}
            </span>
          </div>

          <div className="w-full bg-slate-700/60 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                (gap.calorie_fulfillment_pct || 0) >= 100 
                  ? 'bg-emerald-400' 
                  : ((gap.calorie_fulfillment_pct || 0) >= 70 ? 'bg-amber-400' : 'bg-rose-400')
              }`}
              style={{ width: `${Math.min(gap.calorie_fulfillment_pct || 0, 100)}%` }}
            />
          </div>
        </div>

      </div>

      {/* 3. Estimated Remaining Full-Day Requirement Card (Separated & Disclaimed) */}
      <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/60 p-5 rounded-2xl border border-blue-500/30 shadow-md space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Info size={18} className="text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {remaining_full_day_context.label || 'Estimated Remaining Full-Day Requirement'}
            </h3>
          </div>
          <span className="text-xs text-blue-300 font-mono bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
            ICMR-NIN 2020 24-Hour Reference
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {remaining_full_day_context.accounting_note || 
            'Home meals, morning breakfast, and family dinners outside school hours are not recorded. This represents the remainder of the 24-hour ICMR reference allowance, NOT an in-school deficiency.'}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Remaining Energy</span>
            <span className="text-lg font-bold text-white">{remainingEst.calories_kcal || 0} <span className="text-xs font-normal text-slate-400">kcal</span></span>
            <span className="text-[10px] text-slate-500 block mt-0.5">of {fullDayReq.calories_kcal || 0} kcal RDA</span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Remaining Protein</span>
            <span className="text-lg font-bold text-indigo-300">{remainingEst.protein_g || 0} <span className="text-xs font-normal text-slate-400">g</span></span>
            <span className="text-[10px] text-slate-500 block mt-0.5">of {fullDayReq.protein_g || 0}g RDA</span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Remaining Iron</span>
            <span className="text-lg font-bold text-rose-300">{remainingEst.iron_mg || 0} <span className="text-xs font-normal text-slate-400">mg</span></span>
            <span className="text-[10px] text-slate-500 block mt-0.5">of {fullDayReq.iron_mg || 15}mg RDA</span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Remaining Calcium</span>
            <span className="text-lg font-bold text-amber-300">{remainingEst.calcium_mg || 0} <span className="text-xs font-normal text-slate-400">mg</span></span>
            <span className="text-[10px] text-slate-500 block mt-0.5">of {fullDayReq.calcium_mg || 700}mg RDA</span>
          </div>
        </div>
      </div>

      {/* 4. Nutrients Needing Attention (Targeted Highlights) */}
      {nutrients_needing_attention.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-400" />
            Nutritional Areas Requiring Monitoring
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {nutrients_needing_attention.map((item, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1 ${
                  item.priority === 'high' 
                    ? 'bg-rose-950/20 border-rose-500/30 text-rose-200' 
                    : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{item.nutrient}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-900/40">
                    {item.priority}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px]">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Personalized Food Suggestions Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" />
            Suggested Wholesome Food Options
          </h3>

          {/* Domain Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {[
              { id: 'all', label: 'All Suggestions' },
              { id: 'in_school_adjustment', label: 'In-School' },
              { id: 'supplementary_snack', label: 'Affordable Snacks' },
              { id: 'home_complement', label: 'Home Advisory' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredSuggestions.map((item, idx) => (
            <div 
              key={idx}
              className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/60 hover:border-indigo-500/40 transition-all space-y-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-mono text-indigo-400 uppercase block">
                    {item.domain_label || item.domain}
                  </span>
                  <h4 className="text-base font-bold text-white">{item.food_item}</h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 text-slate-300 border border-slate-700 whitespace-nowrap">
                  {item.portion_size}
                </span>
              </div>

              {/* Nutrients Pills */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1 bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                  <Flame size={12} />
                  {item.estimated_calories} kcal
                </span>
                <span className="flex items-center gap-1 bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 font-medium">
                  <Zap size={12} />
                  {item.estimated_protein}g protein
                </span>
                {item.estimated_iron_mg > 0 && (
                  <span className="bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded border border-rose-500/20 text-[11px]">
                    {item.estimated_iron_mg}mg iron
                  </span>
                )}
                {item.estimated_calcium_mg > 0 && (
                  <span className="bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/20 text-[11px]">
                    {item.estimated_calcium_mg}mg calcium
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-slate-700/50 space-y-1">
                <span className="text-[11px] font-semibold text-emerald-400 block">
                  Target: {item.target_gap_addressed}
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. 7-Day Trend & Auxiliary AI Screening */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-700/60">
        
        {/* Trend Info */}
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Activity size={14} className="text-emerald-400" />
              Previous 7-Day School Intake Trend
            </span>
            <span className="text-slate-400 font-mono">
              {monitoring_and_trend.recorded_school_days_count || 0}/7 Days Logged
            </span>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Daily Average Across Active Days:</span>
              <span className="font-bold text-white">{monitoring_and_trend.avg_daily_calories_kcal || 0} kcal/day</span>
            </div>
            {monitoring_and_trend.repeated_low_intake_flag && (
              <div className="mt-2 p-2 bg-rose-900/20 border border-rose-500/30 rounded text-rose-300 text-[11px]">
                ⚠️ {monitoring_and_trend.repeated_low_intake_reason}
              </div>
            )}
          </div>
        </div>

        {/* Auxiliary AI Pattern Screening */}
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-400" />
              Auxiliary Screening Pattern
            </span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">
              Random Forest
            </span>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Pattern Assessment:</span>
              <span className="font-bold text-white">{auxiliary_ai_screening?.status || student_summary.pediatric_screening?.label || 'Healthy Weight'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Classification Confidence:</span>
              <span className="font-mono text-slate-300">
                {auxiliary_ai_screening?.confidence ? `${(auxiliary_ai_screening.confidence * 100).toFixed(1)}%` : 'Rule-Based Evaluated'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 7. Clinical & Operational Disclaimers */}
      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-500 space-y-1">
        <p>
          <strong>Notice:</strong> This personalized recommendation engine is an educational and operational tool designed strictly for PM POSHAN Mid-Day Meal monitoring. It does NOT diagnose malnutrition or prescribe medical diets.
        </p>
        <p>
          Consult a qualified pediatrician or medical professional for clinical evaluations. Food recommendations respect verified state ingredients and general dietary preferences (Veg/Non-Veg); verify specific student food allergies prior to meal dispensation.
        </p>
      </div>

    </Card>
  );
}

export default DietRecommendationSection;

