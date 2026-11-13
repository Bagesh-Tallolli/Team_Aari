import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';
import studentModel from '../models/studentModel.js';
import weeklyNutritionReportModel from '../models/weeklyNutritionReportModel.js';
import * as predictionService from './predictionService.js';
import {
  getSchoolMealTarget,
  getFullDayRequirement,
  assessPediatricBmi,
  calculateServedNutrients,
} from '../config/nutritionStandards.js';

/**
 * ============================================================================
 * Weekly AI-Based Student Nutrition Analysis Service (Phase 6)
 * ============================================================================
 * 
 * CORE ARCHITECTURAL PRINCIPLES:
 * 1. 100% Real PostgreSQL Data: Analyses actual confirmed food servings over previous 7 days.
 * 2. Proper Daily Aggregation: Multi-item meals on the same date are summed first.
 * 3. Accurate Average: Average daily intake = Total nutrient / Number of recorded days (N).
 *    NEVER divide by 7 if fewer days were recorded!
 * 4. Distinct Domains:
 *    - Actual School Servings (HX711 verified weight measurements)
 *    - PM POSHAN Mandated Allocation (450 kcal Primary / 700 kcal Upper Primary)
 *    - Full-Day ICMR-NIN RDA Reference
 * 5. Transparent Framing:
 *    - Remaining daily energy is explicitly labeled "Estimated remaining full-day requirement after recorded school serving"
 *    - Explicit disclaimer that unrecorded home meals mean the remainder is NOT an actual nutritional deficiency.
 * 6. Auxiliary AI: Random Forest model serves as an assistive screening indicator only,
 *    clearly decoupled from rule-based statutory compliance.
 */

// In-memory cache for fast repeat lookups within the same session
const analysisMemoryCache = new Map();

/**
 * Helper to format a Date as YYYY-MM-DD
 */
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Helper to get day name
 */
const getDayName = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long' });
};

/**
 * Generate 7-day calendar dates array ending on endDateStr
 */
export const getSevenDayDateRange = (endDateStr) => {
  const end = new Date(endDateStr + 'T00:00:00');
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
};

/**
 * Pure calculation helper: calculate daily aggregates and weekly averages
 * Exposed for rigorous unit testing without DB dependence.
 */
export const calculateWeeklyIntakeMetrics = (dailyBreakdown, schoolMealTarget, fullDayRequirement) => {
  const recordedDays = dailyBreakdown.filter((d) => d.is_recorded);
  const recordedDaysCount = recordedDays.length;

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  let totalIron = 0;
  let totalCalcium = 0;
  let totalItemsCount = 0;

  dailyBreakdown.forEach((d) => {
    if (d.is_recorded) {
      totalCalories += d.calories;
      totalProtein += d.protein;
      totalCarbs += d.carbs;
      totalFats += d.fats;
      totalIron += d.iron_mg;
      totalCalcium += d.calcium_mg;
      totalItemsCount += d.meals_count;
    }
  });

  // CRITICAL: Divide by recordedDaysCount, NEVER by 7 if fewer days recorded
  const avgDailyCalories = recordedDaysCount > 0 ? Number((totalCalories / recordedDaysCount).toFixed(2)) : 0;
  const avgDailyProtein = recordedDaysCount > 0 ? Number((totalProtein / recordedDaysCount).toFixed(2)) : 0;
  const avgDailyCarbs = recordedDaysCount > 0 ? Number((totalCarbs / recordedDaysCount).toFixed(2)) : 0;
  const avgDailyFats = recordedDaysCount > 0 ? Number((totalFats / recordedDaysCount).toFixed(2)) : 0;
  const avgDailyIron = recordedDaysCount > 0 ? Number((totalIron / recordedDaysCount).toFixed(2)) : 0;
  const avgDailyCalcium = recordedDaysCount > 0 ? Number((totalCalcium / recordedDaysCount).toFixed(2)) : 0;

  // PM POSHAN Fulfillment
  const targetCalories = schoolMealTarget.calories;
  const targetProtein = schoolMealTarget.protein;

  const calorieFulfillmentPct = recordedDaysCount > 0 && targetCalories > 0
    ? Math.round((avgDailyCalories / targetCalories) * 100)
    : 0;

  const proteinFulfillmentPct = recordedDaysCount > 0 && targetProtein > 0
    ? Math.round((avgDailyProtein / targetProtein) * 100)
    : 0;

  const calorieGap = Number(Math.max(0, targetCalories - avgDailyCalories).toFixed(2));
  const proteinGap = Number(Math.max(0, targetProtein - avgDailyProtein).toFixed(2));

  const daysTargetMet = dailyBreakdown.filter((d) => d.is_recorded && d.calories >= targetCalories).length;
  const daysTargetBelow = dailyBreakdown.filter((d) => d.is_recorded && d.calories < targetCalories).length;
  const missingRecordDays = 7 - recordedDaysCount;

  // Full-Day Remaining Context
  const remainingDailyCalories = Number(Math.max(0, fullDayRequirement.calories - avgDailyCalories).toFixed(2));
  const remainingDailyProtein = Number(Math.max(0, fullDayRequirement.protein - avgDailyProtein).toFixed(2));

  return {
    recorded_days_count: recordedDaysCount,
    data_completeness_pct: Math.round((recordedDaysCount / 7) * 100),
    totals: {
      calories: Number(totalCalories.toFixed(2)),
      protein: Number(totalProtein.toFixed(2)),
      carbs: Number(totalCarbs.toFixed(2)),
      fats: Number(totalFats.toFixed(2)),
      iron_mg: Number(totalIron.toFixed(2)),
      calcium_mg: Number(totalCalcium.toFixed(2)),
      items_count: totalItemsCount,
    },
    averages: {
      avg_daily_calories: avgDailyCalories,
      avg_daily_protein: avgDailyProtein,
      avg_daily_carbs: avgDailyCarbs,
      avg_daily_fats: avgDailyFats,
      avg_daily_iron_mg: avgDailyIron,
      avg_daily_calcium_mg: avgDailyCalcium,
    },
    pm_poshan: {
      target_category: schoolMealTarget.stage || 'PM POSHAN Statutory Norm',
      target_calories: targetCalories,
      target_protein: targetProtein,
      target_iron_mg: schoolMealTarget.iron_mg || 4.0,
      target_calcium_mg: schoolMealTarget.calcium_mg || 150.0,
      calorie_fulfillment_pct: calorieFulfillmentPct,
      protein_fulfillment_pct: proteinFulfillmentPct,
      calorie_gap: calorieGap,
      protein_gap: proteinGap,
      days_met: daysTargetMet,
      days_below: daysTargetBelow,
      missing_days: missingRecordDays,
      status: recordedDaysCount === 0
        ? 'NO_RECORDS'
        : calorieFulfillmentPct >= 95
          ? 'TARGET_SATISFIED'
          : calorieFulfillmentPct >= 75
            ? 'MODERATE_INTAKE'
            : 'LOW_INTAKE',
    },
    full_day_context: {
      reference_standard: 'ICMR-NIN 2020 RDA / EER',
      full_day_calories_required: fullDayRequirement.calories,
      full_day_protein_required: fullDayRequirement.protein,
      full_day_iron_required_mg: fullDayRequirement.iron_mg || 15.0,
      full_day_calcium_required_mg: fullDayRequirement.calcium_mg || 600.0,
      estimated_remaining_daily_calories: remainingDailyCalories,
      estimated_remaining_daily_protein: remainingDailyProtein,
      disclaimer_label: 'Estimated remaining full-day requirement after recorded school serving',
      disclaimer_text:
        'School meals under PM POSHAN provide approximately 1/3 of daily calories and 1/2 of daily protein. Home meals, breakfast, snacks, and dinner are unrecorded in this system. The remaining daily requirement must NOT be interpreted as an actual child nutritional deficiency or malnutrition.',
    },
  };
};

/**
 * Determine weekly rule-based risk category
 */
export const classifyWeeklyRisk = (recordedDaysCount, calorieFulfillmentPct, proteinFulfillmentPct, pediatricAssessment) => {
  const cat = (pediatricAssessment?.category || '').toLowerCase();

  if (recordedDaysCount < 2) {
    return {
      category: 'Insufficient records for reliable weekly analysis',
      level: 'moderate',
      reason: `Only ${recordedDaysCount} day(s) recorded in the 7-day period. At least 2 recorded days are required for reliable weekly assessment.`,
      action_needed: 'Monitor school attendance and ensure student RFID card is scanned during mid-day meal service.',
    };
  }

  if (cat.includes('severe_thinness') || cat.includes('severe thinness') || cat.includes('thinness') || cat.includes('obese') || cat.includes('obesity')) {
    return {
      category: 'Pediatric screening follow-up recommended',
      level: 'high',
      reason: `Anthropometric growth screening indicates ${pediatricAssessment.label || pediatricAssessment.category}. Clinical evaluation recommended.`,
      action_needed: 'Refer to school health medical officer or primary health centre (PHC) for clinical assessment and dietary counseling.',
    };
  }

  if (recordedDaysCount >= 3 && calorieFulfillmentPct < 70) {
    return {
      category: 'Repeated low school-meal intake',
      level: 'high',
      reason: `Recorded school meal intake consistently below 70% of PM POSHAN target (${calorieFulfillmentPct}% fulfilled over ${recordedDaysCount} days).`,
      action_needed: 'Encourage full meal portion consumption and discuss food acceptance with child and parents.',
    };
  }

  if (calorieFulfillmentPct < 80 || proteinFulfillmentPct < 80) {
    return {
      category: 'Attention required',
      level: 'moderate',
      reason: `School-meal intake is below statutory benchmark (Calorie: ${calorieFulfillmentPct}%, Protein: ${proteinFulfillmentPct}%).`,
      action_needed: 'Review daily portion sizes and supplement with nutritious school snacks (e.g. chana or chikki).',
    };
  }

  return {
    category: 'Normal monitoring',
    level: 'healthy',
    reason: `Statutory school-meal target met consistently (${calorieFulfillmentPct}% fulfillment) with healthy growth parameters.`,
    action_needed: 'Maintain routine mid-day meal participation and ongoing monitoring.',
  };
};

/**
 * Compare current report metrics against prior report
 */
export const compareWeeklyTrends = (currentAvgCalories, currentDaysCount, priorReport) => {
  if (!priorReport || !priorReport.avg_daily_calories) {
    return {
      direction: 'Insufficient data to determine a trend',
      badge: 'neutral',
      icon: '—',
      diff_calories: 0,
      diff_pct: 0,
      summary: 'No prior weekly report available for trend comparison.',
      prior_period_end: null,
    };
  }

  const prevDays = Number(priorReport.recorded_days_count || 0);
  const prevCalories = parseFloat(priorReport.avg_daily_calories || 0);

  if (currentDaysCount < 2 || prevDays < 2) {
    return {
      direction: 'Insufficient data to determine a trend',
      badge: 'neutral',
      icon: '—',
      diff_calories: 0,
      diff_pct: 0,
      summary: `Insufficient active days (${currentDaysCount} current, ${prevDays} prior) to establish a statistically reliable trend.`,
      prior_period_end: priorReport.report_period_end,
    };
  }

  const diffCalories = Number((currentAvgCalories - prevCalories).toFixed(2));
  const diffPct = prevCalories > 0 ? Number(((diffCalories / prevCalories) * 100).toFixed(1)) : 0;

  if (diffPct > 5) {
    return {
      direction: 'Improving',
      badge: 'positive',
      icon: '↗',
      diff_calories: diffCalories,
      diff_pct: diffPct,
      summary: `Weekly average intake increased by ${diffPct}% (+${diffCalories} kcal/day) compared to previous week ending ${priorReport.report_period_end}.`,
      prior_period_end: priorReport.report_period_end,
    };
  }

  if (diffPct < -5) {
    return {
      direction: 'Declining',
      badge: 'warning',
      icon: '↘',
      diff_calories: diffCalories,
      diff_pct: diffPct,
      summary: `Weekly average intake decreased by ${Math.abs(diffPct)}% (${diffCalories} kcal/day) compared to previous week ending ${priorReport.report_period_end}.`,
      prior_period_end: priorReport.report_period_end,
    };
  }

  return {
    direction: 'Relatively stable',
    badge: 'neutral',
    icon: '→',
    diff_calories: diffCalories,
    diff_pct: diffPct,
    summary: `Weekly average intake is relatively stable (${diffPct >= 0 ? '+' : ''}${diffPct}% change) compared to previous week ending ${priorReport.report_period_end}.`,
    prior_period_end: priorReport.report_period_end,
  };
};

/**
 * Generate parent-friendly summary narrative (Phase 7 compatible)
 */
export const buildParentSummary = (studentName, metrics, riskClass, trend) => {
  const { recorded_days_count, pm_poshan, full_day_context } = metrics;
  const name = studentName || 'Your child';

  let attendanceText = '';
  if (recorded_days_count === 0) {
    attendanceText = `${name} did not have any recorded school meals during the past 7 days.`;
  } else {
    attendanceText = `${name} received school mid-day meals on ${recorded_days_count} of 7 days this week.`;
  }

  let intakeText = '';
  if (recorded_days_count > 0) {
    intakeText = `On recorded school days, average meal intake was ${metrics.averages.avg_daily_calories} kcal (${pm_poshan.calorie_fulfillment_pct}% of the PM POSHAN statutory norm) and ${metrics.averages.avg_daily_protein}g protein.`;
  }

  const adviceText = riskClass.action_needed;
  const reminderText = `Reminder: School meals provide 1/3 of daily calories. Nutritious home breakfast and evening meals remain essential to meet the remaining daily requirement of ~${full_day_context.estimated_remaining_daily_calories} kcal.`;

  return `${attendanceText} ${intakeText} ${adviceText} ${reminderText}`.trim();
};

/**
 * Main Service: Generate or fetch weekly nutrition analysis for a student
 * 
 * @param {number} studentId
 * @param {object} options { endDate, forceRefresh, preference }
 * @returns {Promise<object>} Complete weekly report
 */
export const generateWeeklyAnalysis = async (studentId, options = {}) => {
  if (!studentId) {
    throw new AppError('Student ID is required', HTTP_STATUS.BAD_REQUEST);
  }

  const sId = parseInt(studentId, 10);
  if (isNaN(sId)) {
    throw new AppError('Invalid Student ID format', HTTP_STATUS.BAD_REQUEST);
  }

  const endDateStr = options.endDate ? formatDate(options.endDate) : formatDate(new Date());
  const dates = getSevenDayDateRange(endDateStr);
  const startDateStr = dates[0];
  const cacheKey = `${sId}_${startDateStr}_${endDateStr}`;

  // Check in-memory cache if not forced
  if (!options.forceRefresh && analysisMemoryCache.has(cacheKey)) {
    const cached = analysisMemoryCache.get(cacheKey);
    logger.debug(`⚡ Returning memory-cached weekly report for student ${sId}`);
    return cached;
  }

  // Check PostgreSQL persistence if not forced
  if (!options.forceRefresh) {
    const existingDbReport = await weeklyNutritionReportModel.getLatestReportByStudent(sId);
    if (existingDbReport && existingDbReport.report_period_end === endDateStr) {
      logger.debug(`💾 Returning DB-cached weekly report for student ${sId} ending ${endDateStr}`);
      const parsed = typeof existingDbReport.report_data === 'string'
        ? JSON.parse(existingDbReport.report_data)
        : existingDbReport.report_data;
      parsed.report_id = existingDbReport.id;
      parsed.from_db_cache = true;
      analysisMemoryCache.set(cacheKey, parsed);
      return parsed;
    }
  }

  logger.info(`📊 Generating fresh weekly nutrition analysis for student ${sId} (${startDateStr} to ${endDateStr})`);

  // Step 1: Retrieve student profile
  const student = await studentModel.getStudentById(sId);
  if (!student) {
    throw new AppError('Student not found', HTTP_STATUS.NOT_FOUND);
  }

  const age = Number(student.age) || 10;
  const gender = student.gender || 'Male';
  const height = parseFloat(student.height) || 120.0;
  const weight = parseFloat(student.weight) || 25.0;
  const heightM = height / 100.0;
  const currentBmi = parseFloat((weight / (heightM * heightM)).toFixed(2));

  // Step 2: Standards & pediatric screening
  const pediatricAssessment = assessPediatricBmi(age, gender, currentBmi);
  const schoolMealTarget = getSchoolMealTarget(age);
  const fullDayRequirement = getFullDayRequirement(age, gender);

  // Step 3: Query 7-day food logs from PostgreSQL
  const foodLogsQuery = await query(
    `SELECT id, student_id, food_item, served_grams, estimated_calories, protein, carbs, fats, logged_at
     FROM food_logs
     WHERE student_id = $1
       AND DATE(logged_at) >= $2
       AND DATE(logged_at) <= $3
     ORDER BY logged_at ASC`,
    [sId, startDateStr, endDateStr]
  );

  const rawLogs = foodLogsQuery.rows || [];

  // Step 4: Group food logs by calendar date (multi-item meals summed per day)
  const logsByDate = new Map();
  dates.forEach((dateStr) => {
    logsByDate.set(dateStr, []);
  });

  rawLogs.forEach((log) => {
    const logDateStr = formatDate(log.logged_at);
    if (logsByDate.has(logDateStr)) {
      logsByDate.get(logDateStr).push(log);
    }
  });

  // Step 5: Build 7-day daily breakdown
  const dailyBreakdown = dates.map((dateStr) => {
    const dayLogs = logsByDate.get(dateStr) || [];
    const isRecorded = dayLogs.length > 0;
    const dayName = getDayName(dateStr);

    let dayCalories = 0;
    let dayProtein = 0;
    let dayCarbs = 0;
    let dayFats = 0;
    let dayIron = 0;
    let dayCalcium = 0;
    const items = [];

    dayLogs.forEach((log) => {
      const servedGrams = parseFloat(log.served_grams) || 0;
      const calcNutrients = calculateServedNutrients(log.food_item, servedGrams);

      const calories = parseFloat(log.estimated_calories) || calcNutrients.calories || 0;
      const protein = parseFloat(log.protein) || calcNutrients.protein || 0;
      const carbs = parseFloat(log.carbs) || calcNutrients.carbs || 0;
      const fats = parseFloat(log.fats) || calcNutrients.fats || 0;
      const iron = calcNutrients.iron_mg || 0;
      const calcium = calcNutrients.calcium_mg || 0;

      dayCalories += calories;
      dayProtein += protein;
      dayCarbs += carbs;
      dayFats += fats;
      dayIron += iron;
      dayCalcium += calcium;

      items.push({
        food_item: log.food_item,
        served_grams: servedGrams,
        calories: Number(calories.toFixed(2)),
        protein: Number(protein.toFixed(2)),
        carbs: Number(carbs.toFixed(2)),
        fats: Number(fats.toFixed(2)),
        iron_mg: Number(iron.toFixed(2)),
        calcium_mg: Number(calcium.toFixed(2)),
        logged_at: log.logged_at,
      });
    });

    const roundedCal = Number(dayCalories.toFixed(2));
    const roundedProt = Number(dayProtein.toFixed(2));
    const fulfillmentPct = isRecorded && schoolMealTarget.calories > 0
      ? Math.round((roundedCal / schoolMealTarget.calories) * 100)
      : 0;

    return {
      date: dateStr,
      day_of_week: dayName,
      is_recorded: isRecorded,
      meals_count: dayLogs.length,
      calories: roundedCal,
      protein: roundedProt,
      carbs: Number(dayCarbs.toFixed(2)),
      fats: Number(dayFats.toFixed(2)),
      iron_mg: Number(dayIron.toFixed(2)),
      calcium_mg: Number(dayCalcium.toFixed(2)),
      fulfillment_pct: fulfillmentPct,
      met_school_target: isRecorded && roundedCal >= schoolMealTarget.calories,
      items,
    };
  });

  // Step 6: Compute weekly intake metrics
  const metrics = calculateWeeklyIntakeMetrics(dailyBreakdown, schoolMealTarget, fullDayRequirement);

  // Step 7: Rule-based weekly risk classification
  const riskClass = classifyWeeklyRisk(
    metrics.recorded_days_count,
    metrics.pm_poshan.calorie_fulfillment_pct,
    metrics.pm_poshan.protein_fulfillment_pct,
    pediatricAssessment
  );

  // Step 8: Auxiliary AI Risk Screening (Random Forest)
  let aiAuxiliary = {
    status: 'Unavailable',
    confidence: null,
    model_type: 'Random Forest (Auxiliary Screening)',
    is_fallback: true,
    disclaimer: 'AI inference is an experimental statistical screening indicator. It does not replace pediatric assessment or statutory school monitoring.',
  };

  try {
    const aiPrediction = await predictionService.getPrediction(sId, student.food_preference || 'veg');
    if (aiPrediction) {
      aiAuxiliary = {
        status: aiPrediction.status || 'Healthy',
        confidence: aiPrediction.confidence || null,
        probabilities: aiPrediction.probabilities || null,
        model_type: 'Random Forest (Auxiliary Screening)',
        is_fallback: aiPrediction.pipeline_status === 'model_unavailable',
        reason: aiPrediction.reason || null,
        disclaimer: 'AI inference is an experimental statistical screening indicator. It does not replace pediatric assessment or statutory school monitoring.',
      };
    }
  } catch (aiErr) {
    logger.warn(`⚠️ Auxiliary AI screening call skipped/failed: ${aiErr.message}`);
  }

  // Step 9: Week-over-week trend comparison
  const priorReport = await weeklyNutritionReportModel.getPreviousReport(sId, startDateStr);
  const trend = compareWeeklyTrends(metrics.averages.avg_daily_calories, metrics.recorded_days_count, priorReport);

  // Step 10: Parent Summary Narrative (Phase 7 ready)
  const parentSummary = buildParentSummary(student.name, metrics, riskClass, trend);

  // Step 11: Assemble full structured report object
  const reportPayload = {
    report_id: null,
    generated_at: new Date().toISOString(),
    student: {
      id: student.id,
      name: student.name,
      age,
      gender,
      height_cm: height,
      weight_kg: weight,
      current_bmi: currentBmi,
      rfid_card_id: student.rfid_card_id,
      food_preference: student.food_preference || 'Vegetarian',
    },
    period: {
      start_date: startDateStr,
      end_date: endDateStr,
      total_days: 7,
      recorded_days_count: metrics.recorded_days_count,
      missing_days_count: metrics.pm_poshan.missing_days,
      data_completeness_pct: metrics.data_completeness_pct,
    },
    school_meal_intake: {
      total_period_calories: metrics.totals.calories,
      total_period_protein: metrics.totals.protein,
      total_period_carbs: metrics.totals.carbs,
      total_period_fats: metrics.totals.fats,
      total_period_iron_mg: metrics.totals.iron_mg,
      total_period_calcium_mg: metrics.totals.calcium_mg,
      total_items_served: metrics.totals.items_count,
      avg_daily_calories: metrics.averages.avg_daily_calories,
      avg_daily_protein: metrics.averages.avg_daily_protein,
      avg_daily_carbs: metrics.averages.avg_daily_carbs,
      avg_daily_fats: metrics.averages.avg_daily_fats,
      avg_daily_iron_mg: metrics.averages.avg_daily_iron_mg,
      avg_daily_calcium_mg: metrics.averages.avg_daily_calcium_mg,
    },
    pm_poshan_target: metrics.pm_poshan,
    full_day_context: metrics.full_day_context,
    anthropometric_screening: {
      height_cm: height,
      weight_kg: weight,
      bmi: currentBmi,
      screening_category: pediatricAssessment.category,
      screening_label: pediatricAssessment.label,
      z_score_range: pediatricAssessment.zScoreRange,
      reference_standard: pediatricAssessment.standardsSource || 'WHO Growth Reference 5-19 Years',
      clinical_note: 'Screening aid only. Not a medical diagnosis. Growth monitoring and clinical examination take precedence.',
    },
    ai_risk_assessment: {
      rule_based: {
        category: riskClass.category,
        level: riskClass.level,
        reason: riskClass.reason,
        action_needed: riskClass.action_needed,
      },
      ai_auxiliary: aiAuxiliary,
    },
    daily_breakdown: dailyBreakdown,
    trend_analysis: trend,
    parent_summary: parentSummary,
    disclaimers: {
      statutory_notice: 'PM POSHAN provides 1/3 of daily calorie requirements and 1/2 of daily protein requirements. Home meals are unrecorded.',
      clinical_notice: 'All nutritional metrics, BMI assessments, and AI risk predictions are supportive screening indicators and do NOT constitute a clinical medical diagnosis.',
    },
  };

  // Step 12: Persist non-destructively to PostgreSQL
  try {
    const saved = await weeklyNutritionReportModel.saveReport({
      student_id: sId,
      report_period_start: startDateStr,
      report_period_end: endDateStr,
      report_data: reportPayload,
      recorded_days_count: metrics.recorded_days_count,
      avg_daily_calories: metrics.averages.avg_daily_calories,
      avg_daily_protein: metrics.averages.avg_daily_protein,
      target_fulfillment_pct: metrics.pm_poshan.calorie_fulfillment_pct,
      risk_category: riskClass.category,
    });
    reportPayload.report_id = saved.id;
  } catch (saveErr) {
    logger.warn(`⚠️ Failed to persist report to DB: ${saveErr.message}; returning generated payload`);
  }

  // Update in-memory cache
  analysisMemoryCache.set(cacheKey, reportPayload);

  return reportPayload;
};

/**
 * Get the latest weekly report for a student
 */
export const getLatestWeeklyAnalysis = async (studentId) => {
  return generateWeeklyAnalysis(studentId, { forceRefresh: false });
};

/**
 * Get weekly report by primary ID
 */
export const getWeeklyAnalysisById = async (reportId) => {
  const rId = parseInt(reportId, 10);
  if (isNaN(rId)) {
    throw new AppError('Invalid Report ID format', HTTP_STATUS.BAD_REQUEST);
  }

  const record = await weeklyNutritionReportModel.getReportById(rId);
  if (!record) {
    throw new AppError('Weekly nutrition report not found', HTTP_STATUS.NOT_FOUND);
  }

  const parsed = typeof record.report_data === 'string'
    ? JSON.parse(record.report_data)
    : record.report_data;
  parsed.report_id = record.id;
  return parsed;
};

/**
 * Get trends for a weekly report
 */
export const getWeeklyTrends = async (reportId) => {
  const report = await getWeeklyAnalysisById(reportId);
  return {
    report_id: report.report_id,
    student_id: report.student?.id,
    period: report.period,
    trend_analysis: report.trend_analysis,
    averages: report.school_meal_intake,
    pm_poshan: report.pm_poshan_target,
  };
};

export default {
  getSevenDayDateRange,
  calculateWeeklyIntakeMetrics,
  classifyWeeklyRisk,
  compareWeeklyTrends,
  buildParentSummary,
  generateWeeklyAnalysis,
  getLatestWeeklyAnalysis,
  getWeeklyAnalysisById,
  getWeeklyTrends,
};

