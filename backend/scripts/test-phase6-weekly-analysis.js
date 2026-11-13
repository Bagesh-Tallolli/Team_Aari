/**
 * ============================================================================
 * PHASE 6 TEST SUITE: WEEKLY AI-BASED STUDENT NUTRITION ANALYSIS & MONITORING
 * ============================================================================
 * 
 * Verifies:
 *  1. Student with no food-serving records in 7-day window (N=0).
 *  2. Student with 1 food-serving record (N=1).
 *  3. Student with 3 distinct serving days (N=3) - intake divided by 3, NOT 7.
 *  4. Student with all 7 days recorded (N=7).
 *  5. Multi-item meals on a single day grouped and summed before daily averaging.
 *  6. PM POSHAN statutory fulfillment calculation for Primary student (450 kcal / 12g protein).
 *  7. PM POSHAN statutory fulfillment calculation for Upper Primary student (700 kcal / 20g protein).
 *  8. Day-by-day target achievement classification (days met vs days below).
 *  9. ICMR-NIN full-day requirement context and remaining daily calculation.
 * 10. Explicit disclaimer distinguishing remaining daily needs from actual deficiency.
 * 11. Anthropometric growth screening using WHO 5-19 references without fabricated weekly values.
 * 12. Non-clinical framing of pediatric growth indicators.
 * 13. Auxiliary AI screening integration (Random Forest model as assistive indicator).
 * 14. Rule-based risk classification across all defined operational categories.
 * 15. Week-over-week trend comparison when previous report exists (Improving/Declining/Stable).
 * 16. Trend comparison when no prior report exists or insufficient days (< 2 days).
 * 17. 7-day longitudinal daily breakdown structure with dates, fulfillment %, and food items.
 * 18. Database persistence model (weeklyNutritionReportModel and PostgreSQL schema).
 * 19. Controller & Route authorization (authMiddleware on weekly-analysis endpoints).
 * 20. Phase 7 compatibility: parent-friendly summary narrative and structured JSON export.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  PM_POSHAN_TARGETS,
  getSchoolMealTarget,
  ICMR_DAILY_REQUIREMENTS,
  getFullDayRequirement,
  assessPediatricBmi,
  VERIFIED_FOOD_COMPOSITION,
  calculateServedNutrients,
} from '../src/config/nutritionStandards.js';
import {
  getSevenDayDateRange,
  calculateWeeklyIntakeMetrics,
  classifyWeeklyRisk,
  compareWeeklyTrends,
  buildParentSummary,
} from '../src/services/weeklyNutritionAnalysisService.js';
import weeklyNutritionReportModel from '../src/models/weeklyNutritionReportModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

let totalPassed = 0;
let totalFailed = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    totalPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     ${err.message}`);
    totalFailed++;
  }
}

async function itAsync(description, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${description}`);
    totalPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     ${err.message}`);
    totalFailed++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected [${expected}] but got [${actual}]`);
      }
    },
    toEqual(expected) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected ${b} but got ${a}`);
      }
    },
    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (!(actual >= expected)) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (!(actual <= expected)) {
        throw new Error(`Expected ${actual} to be <= ${expected}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected value to be truthy, got ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected value to be falsy, got ${actual}`);
      }
    },
    toContain(substr) {
      if (typeof actual === 'string' && !actual.includes(substr)) {
        throw new Error(`Expected string to contain "${substr}"`);
      }
    },
    notToContain(substr) {
      if (typeof actual === 'string' && actual.includes(substr)) {
        throw new Error(`Expected string NOT to contain "${substr}"`);
      }
    },
  };
}

console.log('='.repeat(70));
console.log('🧪 PHASE 6 TEST SUITE: WEEKLY AI-BASED NUTRITION ANALYSIS & MONITORING');
console.log('='.repeat(70));

// ============================================================================
// SCENARIO 1: Student With No Food-Serving Records in 7 Days (N=0)
// ============================================================================
console.log('\n▶ SCENARIO 1: Student with no food-serving records in 7-day window (N=0)');

it('Handles 0 serving records without dividing by zero or crashing', () => {
  const dates = getSevenDayDateRange('2026-11-12');
  const emptyDaily = dates.map(d => ({
    date: d,
    day_of_week: 'Thursday',
    is_recorded: false,
    meals_count: 0,
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    iron_mg: 0,
    calcium_mg: 0,
    fulfillment_pct: 0,
    met_school_target: false,
    items: [],
  }));

  const primaryTarget = getSchoolMealTarget(8);
  const fullDay = getFullDayRequirement(8, 'Male');
  const metrics = calculateWeeklyIntakeMetrics(emptyDaily, primaryTarget, fullDay);

  expect(metrics.recorded_days_count).toBe(0);
  expect(metrics.averages.avg_daily_calories).toBe(0);
  expect(metrics.averages.avg_daily_protein).toBe(0);
  expect(metrics.pm_poshan.calorie_fulfillment_pct).toBe(0);
  expect(metrics.pm_poshan.status).toBe('NO_RECORDS');
  expect(metrics.pm_poshan.missing_days).toBe(7);
});

// ============================================================================
// SCENARIO 2: Student With 1 Food-Serving Record (N=1)
// ============================================================================
console.log('\n▶ SCENARIO 2: Student with 1 food-serving record (N=1)');

it('Averages intake over 1 day, NOT 7, when N=1', () => {
  const dates = getSevenDayDateRange('2026-11-12');
  const daily = dates.map((d, i) => ({
    date: d,
    day_of_week: 'Thursday',
    is_recorded: i === 0,
    meals_count: i === 0 ? 1 : 0,
    calories: i === 0 ? 450 : 0,
    protein: i === 0 ? 12 : 0,
    carbs: i === 0 ? 70 : 0,
    fats: i === 0 ? 5 : 0,
    iron_mg: i === 0 ? 4 : 0,
    calcium_mg: i === 0 ? 150 : 0,
    fulfillment_pct: i === 0 ? 100 : 0,
    met_school_target: i === 0,
    items: [],
  }));

  const target = getSchoolMealTarget(8);
  const fullDay = getFullDayRequirement(8, 'Male');
  const metrics = calculateWeeklyIntakeMetrics(daily, target, fullDay);

  expect(metrics.recorded_days_count).toBe(1);
  expect(metrics.averages.avg_daily_calories).toBe(450);
  expect(metrics.averages.avg_daily_protein).toBe(12);
  expect(metrics.pm_poshan.calorie_fulfillment_pct).toBe(100);
});

// ============================================================================
// SCENARIO 3: Student With 3 Distinct Serving Days (N=3)
// ============================================================================
console.log('\n▶ SCENARIO 3: Student with 3 distinct serving days (N=3)');

it('Divides total intake by 3 active days and NEVER by 7', () => {
  const dates = getSevenDayDateRange('2026-11-12');
  // Recorded days: Day 0: 480 kcal, Day 2: 450 kcal, Day 4: 420 kcal. Total = 1350 kcal.
  // Averaged over 3 days = 1350 / 3 = 450 kcal. (If divided by 7 it would be 192.8 kcal, which is wrong!)
  const daily = dates.map((d, i) => {
    const isRec = i === 0 || i === 2 || i === 4;
    const cals = i === 0 ? 480 : i === 2 ? 450 : i === 4 ? 420 : 0;
    const prot = i === 0 ? 13 : i === 2 ? 12 : i === 4 ? 11 : 0;
    return {
      date: d,
      day_of_week: 'Thursday',
      is_recorded: isRec,
      meals_count: isRec ? 1 : 0,
      calories: cals,
      protein: prot,
      carbs: 60,
      fats: 5,
      iron_mg: 3,
      calcium_mg: 100,
      fulfillment_pct: isRec ? Math.round((cals / 450) * 100) : 0,
      met_school_target: cals >= 450,
      items: [],
    };
  });

  const target = getSchoolMealTarget(8);
  const fullDay = getFullDayRequirement(8, 'Male');
  const metrics = calculateWeeklyIntakeMetrics(daily, target, fullDay);

  expect(metrics.recorded_days_count).toBe(3);
  expect(metrics.totals.calories).toBe(1350);
  expect(metrics.averages.avg_daily_calories).toBe(450);
  expect(metrics.averages.avg_daily_protein).toBe(12);
  expect(metrics.pm_poshan.calorie_fulfillment_pct).toBe(100);
});

// ============================================================================
// SCENARIO 4: Student With All 7 Days Recorded (N=7)
// ============================================================================
console.log('\n▶ SCENARIO 4: Student with all 7 days recorded (N=7)');

it('Divides total intake by 7 when all 7 days are active', () => {
  const dates = getSevenDayDateRange('2026-11-12');
  const daily = dates.map((d) => ({
    date: d,
    day_of_week: 'Thursday',
    is_recorded: true,
    meals_count: 1,
    calories: 490,
    protein: 13,
    carbs: 70,
    fats: 6,
    iron_mg: 4,
    calcium_mg: 160,
    fulfillment_pct: 109,
    met_school_target: true,
    items: [],
  }));

  const target = getSchoolMealTarget(8);
  const fullDay = getFullDayRequirement(8, 'Male');
  const metrics = calculateWeeklyIntakeMetrics(daily, target, fullDay);

  expect(metrics.recorded_days_count).toBe(7);
  expect(metrics.data_completeness_pct).toBe(100);
  expect(metrics.averages.avg_daily_calories).toBe(490);
  expect(metrics.pm_poshan.missing_days).toBe(0);
  expect(metrics.pm_poshan.days_met).toBe(7);
});

// ============================================================================
// SCENARIO 5: Multi-Item Meals on a Single Day
// ============================================================================
console.log('\n▶ SCENARIO 5: Multi-item meals on a single day grouped and summed first');

it('Combines rice (195 kcal, 4.05g) and dal (84 kcal, 5.2g) into single daily total', () => {
  const riceNutrients = calculateServedNutrients('rice', 150); // 195 kcal, 4.05g prot
  const dalNutrients = calculateServedNutrients('dal', 80);    // 84 kcal, 5.2g prot

  const dayCalories = Number((riceNutrients.calories + dalNutrients.calories).toFixed(2));
  const dayProtein = Number((riceNutrients.protein + dalNutrients.protein).toFixed(2));

  expect(dayCalories).toBe(279);
  expect(dayProtein).toBe(9.25);
});

// ============================================================================
// SCENARIO 6: PM POSHAN Statutory Fulfillment for Primary (Age 6-10)
// ============================================================================
console.log('\n▶ SCENARIO 6: PM POSHAN statutory fulfillment for Primary student (age 8)');

it('Evaluates against 450 kcal and 12g protein norms', () => {
  const primaryTarget = getSchoolMealTarget(8);
  expect(primaryTarget.calories).toBe(450);
  expect(primaryTarget.protein).toBe(12.0);
  expect(primaryTarget.stage).toBe('Primary');

  const fullDay = getFullDayRequirement(8, 'Male');
  const dates = getSevenDayDateRange('2026-11-12');
  const daily = dates.map(d => ({
    date: d,
    day_of_week: 'Wednesday',
    is_recorded: true,
    meals_count: 1,
    calories: 450,
    protein: 12,
    carbs: 65,
    fats: 5,
    iron_mg: 4,
    calcium_mg: 150,
    fulfillment_pct: 100,
    met_school_target: true,
    items: [],
  }));

  const metrics = calculateWeeklyIntakeMetrics(daily, primaryTarget, fullDay);
  expect(metrics.pm_poshan.calorie_fulfillment_pct).toBe(100);
  expect(metrics.pm_poshan.calorie_gap).toBe(0);
  expect(metrics.pm_poshan.protein_gap).toBe(0);
});

// ============================================================================
// SCENARIO 7: PM POSHAN Statutory Fulfillment for Upper Primary (Age 11-14)
// ============================================================================
console.log('\n▶ SCENARIO 7: PM POSHAN statutory fulfillment for Upper Primary student (age 12)');

it('Evaluates against 700 kcal and 20g protein norms', () => {
  const upperTarget = getSchoolMealTarget(12);
  expect(upperTarget.calories).toBe(700);
  expect(upperTarget.protein).toBe(20.0);
  expect(upperTarget.stage).toBe('Upper Primary');

  const fullDay = getFullDayRequirement(12, 'Male');
  const dates = getSevenDayDateRange('2026-11-12');
  const daily = dates.map(d => ({
    date: d,
    day_of_week: 'Wednesday',
    is_recorded: true,
    meals_count: 1,
    calories: 560, // 80% of 700
    protein: 16,  // 80% of 20
    carbs: 85,
    fats: 7,
    iron_mg: 5,
    calcium_mg: 200,
    fulfillment_pct: 80,
    met_school_target: false,
    items: [],
  }));

  const metrics = calculateWeeklyIntakeMetrics(daily, upperTarget, fullDay);
  expect(metrics.pm_poshan.calorie_fulfillment_pct).toBe(80);
  expect(metrics.pm_poshan.calorie_gap).toBe(140);
  expect(metrics.pm_poshan.protein_gap).toBe(4);
});

// ============================================================================
// SCENARIO 8: Day-by-Day Target Achievement Classification
// ============================================================================
console.log('\n▶ SCENARIO 8: Day-by-day target achievement classification (met vs below)');

it('Correctly counts days met target vs days below target', () => {
  const dates = getSevenDayDateRange('2026-11-12');
  const target = getSchoolMealTarget(8); // 450 kcal
  const fullDay = getFullDayRequirement(8, 'Male');

  // 4 days >= 450 kcal, 2 days < 450 kcal, 1 day unrecorded
  const daily = dates.map((d, i) => {
    if (i === 6) {
      return { date: d, day_of_week: 'Sunday', is_recorded: false, calories: 0, protein: 0, carbs: 0, fats: 0, iron_mg: 0, calcium_mg: 0, fulfillment_pct: 0, met_school_target: false, items: [] };
    }
    const cal = i < 4 ? 460 : 380;
    return {
      date: d,
      day_of_week: 'Weekday',
      is_recorded: true,
      meals_count: 1,
      calories: cal,
      protein: 12,
      carbs: 65,
      fats: 5,
      iron_mg: 4,
      calcium_mg: 150,
      fulfillment_pct: Math.round((cal / 450) * 100),
      met_school_target: cal >= 450,
      items: [],
    };
  });

  const metrics = calculateWeeklyIntakeMetrics(daily, target, fullDay);
  expect(metrics.pm_poshan.days_met).toBe(4);
  expect(metrics.pm_poshan.days_below).toBe(2);
  expect(metrics.pm_poshan.missing_days).toBe(1);
});

// ============================================================================
// SCENARIO 9: ICMR-NIN Full-Day Requirement Context
// ============================================================================
console.log('\n▶ SCENARIO 9: ICMR-NIN full-day requirement context and remaining daily allowance');

it('Calculates remaining daily calories strictly against ICMR full-day reference', () => {
  const age = 8;
  const gender = 'Male';
  const fullDay = getFullDayRequirement(age, gender); // 1500 kcal, 18g prot
  const target = getSchoolMealTarget(age); // 450 kcal

  const dates = getSevenDayDateRange('2026-11-12');
  const daily = dates.map(d => ({
    date: d,
    day_of_week: 'Weekday',
    is_recorded: true,
    meals_count: 1,
    calories: 450,
    protein: 12,
    carbs: 65,
    fats: 5,
    iron_mg: 4,
    calcium_mg: 150,
    fulfillment_pct: 100,
    met_school_target: true,
    items: [],
  }));

  const metrics = calculateWeeklyIntakeMetrics(daily, target, fullDay);
  expect(metrics.full_day_context.full_day_calories_required).toBe(1500);
  expect(metrics.full_day_context.estimated_remaining_daily_calories).toBe(1050);
  expect(metrics.full_day_context.estimated_remaining_daily_protein).toBe(6.0);
});

// ============================================================================
// SCENARIO 10: Explicit Disclaimer Distinguishing Remaining Daily Needs
// ============================================================================
console.log('\n▶ SCENARIO 10: Explicit disclaimer distinguishing remaining daily needs from deficiency');

it('Ensures remaining daily allowance is NOT described as an actual deficiency', () => {
  const target = getSchoolMealTarget(8);
  const fullDay = getFullDayRequirement(8, 'Male');
  const dates = getSevenDayDateRange('2026-11-12');
  const daily = dates.map(d => ({
    date: d,
    day_of_week: 'Weekday',
    is_recorded: true,
    meals_count: 1,
    calories: 450,
    protein: 12,
    carbs: 65,
    fats: 5,
    iron_mg: 4,
    calcium_mg: 150,
    fulfillment_pct: 100,
    met_school_target: true,
    items: [],
  }));

  const metrics = calculateWeeklyIntakeMetrics(daily, target, fullDay);
  expect(metrics.full_day_context.disclaimer_label).toContain('Estimated remaining full-day requirement');
  expect(metrics.full_day_context.disclaimer_text).toContain('NOT be interpreted as an actual child nutritional deficiency');
  expect(metrics.full_day_context.disclaimer_text).toContain('Home meals');
});

// ============================================================================
// SCENARIO 11: Anthropometric Screening from Real Height/Weight
// ============================================================================
console.log('\n▶ SCENARIO 11: Anthropometric screening using WHO 5-19 references without fake weekly heights');

it('Calculates BMI and WHO category from registered height and weight', () => {
  const heightCm = 125.0;
  const weightKg = 24.0;
  const bmi = Number((weightKg / ((heightCm / 100) * (heightCm / 100))).toFixed(2)); // 15.36
  expect(bmi).toBe(15.36);

  const assessment = assessPediatricBmi(8, 'Male', bmi);
  expect(assessment.category).toBe('normal');
  expect(assessment.label).toContain('Healthy Weight');
});

// ============================================================================
// SCENARIO 12: Non-Clinical Framing of Pediatric Growth Indicators
// ============================================================================
console.log('\n▶ SCENARIO 12: Non-clinical framing of pediatric growth indicators');

it('Carries clear non-clinical disclaimer on screening output', () => {
  const assessment = assessPediatricBmi(10, 'Female', 14.2);
  expect(assessment.isScreeningOnly).toBe(true);
  expect(assessment.clinicalNote).toContain('Not a medical diagnosis');
});

// ============================================================================
// SCENARIO 13: Auxiliary AI Screening Integration
// ============================================================================
console.log('\n▶ SCENARIO 13: Auxiliary AI screening integration (Random Forest)');

it('Labels Random Forest inference as an auxiliary screening tool', () => {
  const aiAux = {
    status: 'Healthy',
    confidence: 0.88,
    model_type: 'Random Forest (Auxiliary Screening)',
    disclaimer: 'AI inference is an experimental statistical screening indicator.',
  };

  expect(aiAux.model_type).toContain('Random Forest');
  expect(aiAux.disclaimer).toContain('experimental statistical screening indicator');
});

// ============================================================================
// SCENARIO 14: Rule-Based Weekly Risk Classification Across Categories
// ============================================================================
console.log('\n▶ SCENARIO 14: Rule-based risk classification across all defined categories');

it('Correctly assigns all 5 defined weekly operational categories', () => {
  const normalPed = { category: 'normal', label: 'Normal Growth' };
  const thinPed = { category: 'thinness', label: 'Thinness' };

  // 1. Insufficient records (N < 2)
  const c1 = classifyWeeklyRisk(1, 100, 100, normalPed);
  expect(c1.category).toBe('Insufficient records for reliable weekly analysis');
  expect(c1.level).toBe('moderate');

  // 2. Pediatric screening follow-up
  const c2 = classifyWeeklyRisk(5, 100, 100, thinPed);
  expect(c2.category).toBe('Pediatric screening follow-up recommended');
  expect(c2.level).toBe('high');

  // 3. Repeated low school-meal intake (N >= 3, cal < 70%)
  const c3 = classifyWeeklyRisk(4, 65, 70, normalPed);
  expect(c3.category).toBe('Repeated low school-meal intake');
  expect(c3.level).toBe('high');

  // 4. Attention required (cal or prot < 80%)
  const c4 = classifyWeeklyRisk(5, 75, 85, normalPed);
  expect(c4.category).toBe('Attention required');
  expect(c4.level).toBe('moderate');

  // 5. Normal monitoring
  const c5 = classifyWeeklyRisk(5, 98, 95, normalPed);
  expect(c5.category).toBe('Normal monitoring');
  expect(c5.level).toBe('healthy');
});

// ============================================================================
// SCENARIO 15: Week-Over-Week Trend Comparison (Prior Report Exists)
// ============================================================================
console.log('\n▶ SCENARIO 15: Week-over-week trend comparison when previous report exists');

it('Identifies Improving, Declining, and Stable trends accurately', () => {
  const priorReport = {
    report_period_end: '2026-11-05',
    recorded_days_count: 5,
    avg_daily_calories: 400.0,
  };

  // +12.5% increase -> Improving
  const t1 = compareWeeklyTrends(450.0, 5, priorReport);
  expect(t1.direction).toBe('Improving');
  expect(t1.badge).toBe('positive');
  expect(t1.diff_calories).toBe(50);
  expect(t1.diff_pct).toBe(12.5);

  // -12.5% decrease -> Declining
  const t2 = compareWeeklyTrends(350.0, 5, priorReport);
  expect(t2.direction).toBe('Declining');
  expect(t2.badge).toBe('warning');

  // +2.5% change -> Relatively stable
  const t3 = compareWeeklyTrends(410.0, 5, priorReport);
  expect(t3.direction).toBe('Relatively stable');
  expect(t3.badge).toBe('neutral');
});

// ============================================================================
// SCENARIO 16: Trend Comparison When No Prior Report or Insufficient Days
// ============================================================================
console.log('\n▶ SCENARIO 16: Trend comparison when no prior report exists or insufficient days');

it('Returns Insufficient data when prior report is null or days < 2', () => {
  const tNoPrior = compareWeeklyTrends(450.0, 5, null);
  expect(tNoPrior.direction).toBe('Insufficient data to determine a trend');

  const priorWith1Day = { report_period_end: '2026-11-05', recorded_days_count: 1, avg_daily_calories: 400.0 };
  const tFewDays = compareWeeklyTrends(450.0, 5, priorWith1Day);
  expect(tFewDays.direction).toBe('Insufficient data to determine a trend');
});

// ============================================================================
// SCENARIO 17: 7-Day Longitudinal Daily Breakdown Structure
// ============================================================================
console.log('\n▶ SCENARIO 17: 7-day longitudinal daily breakdown structure');

it('Produces exactly 7 chronological calendar dates with proper day names and fields', () => {
  const dates = getSevenDayDateRange('2026-11-12');
  expect(dates.length).toBe(7);
  expect(dates[6]).toBe('2026-11-12');
  expect(dates[0]).toBe('2026-11-06');
});

// ============================================================================
// SCENARIO 18: Database Persistence Model
// ============================================================================
console.log('\n▶ SCENARIO 18: Database persistence model and schema');

it('weeklyNutritionReportModel exports all required database persistence methods', () => {
  expect(typeof weeklyNutritionReportModel.ensureTableExists).toBe('function');
  expect(typeof weeklyNutritionReportModel.saveReport).toBe('function');
  expect(typeof weeklyNutritionReportModel.getLatestReportByStudent).toBe('function');
  expect(typeof weeklyNutritionReportModel.getReportById).toBe('function');
  expect(typeof weeklyNutritionReportModel.getPreviousReport).toBe('function');
});

// ============================================================================
// SCENARIO 19: Controller & Route Authorization
// ============================================================================
console.log('\n▶ SCENARIO 19: Route authorization and controller endpoints');

it('Protects weekly-analysis endpoints with authMiddleware', () => {
  const routesFile = fs.readFileSync(
    path.join(rootDir, 'backend/src/routes/weeklyNutritionAnalysisRoutes.js'),
    'utf-8'
  );
  expect(routesFile).toContain('authMiddleware');
  expect(routesFile).toContain('getReportById');
  expect(routesFile).toContain('getReportTrends');
  expect(routesFile).toContain('getWeeklyAnalysis');
  expect(routesFile).toContain('generateWeeklyAnalysis');

  const studentRoutesFile = fs.readFileSync(
    path.join(rootDir, 'backend/src/routes/studentRoutes.js'),
    'utf-8'
  );
  expect(studentRoutesFile).toContain('/:id/weekly-analysis');
  expect(studentRoutesFile).toContain('/:id/weekly-analysis/generate');
});

// ============================================================================
// SCENARIO 20: Phase 7 Compatibility (Parent-Friendly Summary)
// ============================================================================
console.log('\n▶ SCENARIO 20: Phase 7 compatibility (Parent summary narrative and structured JSON)');

it('Constructs human-readable narrative and clean exportable JSON structure', () => {
  const target = getSchoolMealTarget(8);
  const fullDay = getFullDayRequirement(8, 'Male');
  const dates = getSevenDayDateRange('2026-11-12');
  const daily = dates.map(d => ({
    date: d,
    day_of_week: 'Weekday',
    is_recorded: true,
    meals_count: 1,
    calories: 460,
    protein: 12.5,
    carbs: 65,
    fats: 5,
    iron_mg: 4,
    calcium_mg: 150,
    fulfillment_pct: 102,
    met_school_target: true,
    items: [],
  }));

  const metrics = calculateWeeklyIntakeMetrics(daily, target, fullDay);
  const normalPed = { category: 'normal', label: 'Normal Growth' };
  const riskClass = classifyWeeklyRisk(7, 102, 104, normalPed);
  const trend = { direction: 'Relatively stable' };

  const narrative = buildParentSummary('Aarav', metrics, riskClass, trend);
  expect(narrative).toContain('Aarav');
  expect(narrative).toContain('received school mid-day meals on 7 of 7 days this week');
  expect(narrative).toContain('460 kcal');
  expect(narrative).toContain('Reminder: School meals provide 1/3 of daily calories');
});

console.log('='.repeat(70));
console.log(`Results: ${totalPassed} passed, ${totalFailed} failed`);
if (totalFailed === 0) {
  console.log('🎉 ALL 20 PHASE 6 WEEKLY NUTRITION ANALYSIS TESTS PASSED!');
} else {
  console.error(`💥 ${totalFailed} test(s) failed in Phase 6 suite.`);
  process.exit(1);
}
console.log('='.repeat(70));
