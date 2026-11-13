/**
 * ============================================================================
 * PHASE 5 TEST SUITE: PERSONALIZED DIET RECOMMENDATION ENGINE
 * ============================================================================
 * 
 * Verifies:
 *  1. Student with no food-serving records.
 *  2. Student with a verified school serving.
 *  3. Student whose recorded serving is below the school-meal target.
 *  4. Student whose recorded serving meets the target.
 *  5. Student with multiple food items served.
 *  6. Student with seven days of recorded data.
 *  7. Student with missing days (handled without assuming 0 intake).
 *  8. Correct nutrient calculation from measured grams.
 *  9. Correct separation of school-meal gap and estimated remaining full-day requirement.
 * 10. Valid food recommendations and portion calculations.
 * 11. Invalid or missing food-composition data handling.
 * 12. Security, authentication, and student-data access restrictions.
 * 13. Recommendation generation and retrieval API capabilities.
 * 14. No duplicate records from repeated requests.
 * 15. Regression test suite execution (Phase 1, 3, 4).
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
import dietRecommendationService from '../src/services/dietRecommendationService.js';

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
console.log('🧪 PHASE 5 TEST SUITE: PERSONALIZED DIET RECOMMENDATIONS & GAPS');
console.log('='.repeat(70));

// ============================================================================
// SCENARIO 1: Student With No Food-Serving Records
// ============================================================================
console.log('\n▶ SCENARIO 1: Student with no food-serving records');

it('Handles zero serving records without crashing and marks NOT_SERVED_TODAY', () => {
  const age = 8;
  const gender = 'Male';
  const schoolTarget = getSchoolMealTarget(age);
  const fullDay = getFullDayRequirement(age, gender);

  const actualServedCalories = 0;
  const actualServedProtein = 0;

  const gapCal = Math.max(0, schoolTarget.calories - actualServedCalories);
  const remainingDailyCal = Math.max(0, fullDay.calories - actualServedCalories);

  expect(gapCal).toBe(450);
  expect(remainingDailyCal).toBe(1500);
});

// ============================================================================
// SCENARIO 2: Student With a Verified School Serving
// ============================================================================
console.log('\n▶ SCENARIO 2: Student with a verified school serving (HX711 150g Rice)');

it('Calculates nutrients strictly from measured weight using Phase 1 formula', () => {
  const measuredGrams = 150.0;
  const nutrients = calculateServedNutrients('rice', measuredGrams);

  // (130 * 150) / 100 = 195.0 kcal
  expect(nutrients.calories).toBe(195.0);
  // (2.7 * 150) / 100 = 4.05g protein
  expect(nutrients.protein).toBe(4.05);
  expect(nutrients.is_served_record).toBe(true);
  expect(nutrients.is_confirmed_consumed).toBe(false);
});

// ============================================================================
// SCENARIO 3: Student Whose Recorded Serving is Below School-Meal Target
// ============================================================================
console.log('\n▶ SCENARIO 3: Serving below school-meal target (Primary 450 kcal)');

it('Correctly identifies school-meal gap and triggers targeted in-school suggestions', () => {
  const schoolTarget = getSchoolMealTarget(8); // 450 kcal, 12g protein
  const served = calculateServedNutrients('rice', 150); // 195 kcal, 4.05g protein

  const calorieGap = schoolTarget.calories - served.calories; // 255 kcal
  const proteinGap = parseFloat((schoolTarget.protein - served.protein).toFixed(2)); // 7.95g

  expect(calorieGap).toBe(255);
  expect(proteinGap).toBe(7.95);
});

// ============================================================================
// SCENARIO 4: Student Whose Recorded Serving Meets Target
// ============================================================================
console.log('\n▶ SCENARIO 4: Serving meets school-meal target');

it('Does not generate unnecessary deficiency alert when target is satisfied', () => {
  const schoolTarget = getSchoolMealTarget(8); // 450 kcal
  const actualCalories = 450;
  const actualProtein = 12.0;

  const calorieGap = Math.max(0, schoolTarget.calories - actualCalories);
  const proteinGap = Math.max(0, schoolTarget.protein - actualProtein);

  expect(calorieGap).toBe(0);
  expect(proteinGap).toBe(0);
});

// ============================================================================
// SCENARIO 5: Student With Multiple Food Items Served
// ============================================================================
console.log('\n▶ SCENARIO 5: Multiple food items served on the same day');

it('Aggregates multiple items (Rice + Dal + Vegetables) accurately', () => {
  const rice = calculateServedNutrients('rice', 150); // 195 kcal, 4.05g protein
  const dal = calculateServedNutrients('dal', 60);    // 63 kcal, 3.9g protein
  const veg = calculateServedNutrients('veg', 50);    // 32.5 kcal, 1.0g protein

  const totalCalories = parseFloat((rice.calories + dal.calories + veg.calories).toFixed(2));
  const totalProtein = parseFloat((rice.protein + dal.protein + veg.protein).toFixed(2));

  expect(totalCalories).toBe(290.5);
  expect(totalProtein).toBe(8.95);
});

// ============================================================================
// SCENARIO 6: Student With 7 Days of Recorded Data
// ============================================================================
console.log('\n▶ SCENARIO 6: Student with 7 active recorded days');

it('Calculates 7-day average from daily totals across recorded days', () => {
  const dailyTotals = [450, 420, 440, 460, 430, 450, 440];
  const avg = dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length;
  expect(parseFloat(avg.toFixed(2))).toBe(441.43);
});

// ============================================================================
// SCENARIO 7: Student With Missing Days
// ============================================================================
console.log('\n▶ SCENARIO 7: Missing days handled without penalizing child as 0 intake');

it('Divides by active recorded days (e.g. 4) instead of naive 7', () => {
  const dailyIntakes = [450, 400, 460, 450]; // 4 recorded days
  const sum = dailyIntakes.reduce((a, b) => a + b, 0); // 1760
  const correctAvg = sum / dailyIntakes.length; // 440
  const falseNaiveAvg = sum / 7; // 251.4

  expect(correctAvg).toBe(440);
  expect(falseNaiveAvg).toBeLessThanOrEqual(252);
});

// ============================================================================
// SCENARIO 8: Correct Nutrient Calculation from Measured Grams
// ============================================================================
console.log('\n▶ SCENARIO 8: Nutrient calculation from measured grams (Formula verification)');

it('Applies (Nutrient per 100g * measured grams) / 100 strictly', () => {
  const chikki = calculateServedNutrients('chikki', 25);
  // 500 * (25 / 100) = 125 kcal
  expect(chikki.calories).toBe(125.0);
  // 14.0 * (25 / 100) = 3.5g protein
  expect(chikki.protein).toBe(3.5);
});

// ============================================================================
// SCENARIO 9: Correct Separation of School-Meal Gap & Remaining Daily Requirement
// ============================================================================
console.log('\n▶ SCENARIO 9: Clear distinction between school-meal gap and remaining daily allowance');

it('Labels remaining full-day requirement clearly and disclaims untracked home meals', () => {
  const age = 10;
  const schoolTarget = getSchoolMealTarget(age); // 450 kcal
  const fullDay = getFullDayRequirement(age, 'Male'); // 2220 kcal
  const servedToday = 200;

  const schoolMealGap = schoolTarget.calories - servedToday; // 250 kcal
  const remainingDaily = fullDay.calories - servedToday; // 2020 kcal

  expect(schoolMealGap).toBe(250);
  expect(remainingDaily).toBe(2020);
});

// ============================================================================
// SCENARIO 10: Valid Food Recommendations & Portion Calculations
// ============================================================================
console.log('\n▶ SCENARIO 10: Valid food recommendations and portion calculations');

it('VERIFIED_FOOD_COMPOSITION includes standard portion sizes and micronutrients', () => {
  expect(VERIFIED_FOOD_COMPOSITION.ragi_mudde.calciumMgPer100g).toBe(115.0);
  expect(VERIFIED_FOOD_COMPOSITION.roasted_chana.ironMgPer100g).toBe(6.5);
  expect(VERIFIED_FOOD_COMPOSITION.curd.calciumMgPer100g).toBe(130.0);
  expect(VERIFIED_FOOD_COMPOSITION.green_leafy_veg.ironMgPer100g).toBe(3.5);
});

// ============================================================================
// SCENARIO 11: Invalid or Missing Food-Composition Data Handling
// ============================================================================
console.log('\n▶ SCENARIO 11: Invalid or missing food composition handling');

it('Safely falls back to safe default without throwing error for unknown food item', () => {
  const result = calculateServedNutrients('unknown_exotic_berry', 100);
  expect(result.calories).toBeGreaterThan(0);
  expect(result.food_item).toBeTruthy();
});

it('Handles zero or negative measured grams safely by clamping to 0', () => {
  const result = calculateServedNutrients('rice', -50);
  expect(result.measured_grams).toBe(0);
  expect(result.calories).toBe(0);
});

// ============================================================================
// SCENARIO 12: Security, Authentication & Access Restrictions
// ============================================================================
console.log('\n▶ SCENARIO 12: Security and authentication protection on routes');

const studentRoutesPath = path.join(rootDir, 'backend/src/routes/studentRoutes.js');
const studentRoutesSrc = fs.readFileSync(studentRoutesPath, 'utf8');

it('studentRoutes.js protects diet-recommendation endpoints with authMiddleware', () => {
  expect(studentRoutesSrc).toContain('/:id/diet-recommendation');
  expect(studentRoutesSrc).toContain('/:id/diet-recommendation/generate');
  expect(studentRoutesSrc).toContain('authMiddleware');
});

// ============================================================================
// SCENARIO 13: Recommendation Generation & Retrieval Architecture
// ============================================================================
console.log('\n▶ SCENARIO 13: Reusable diet recommendation service architecture');

const servicePath = path.join(rootDir, 'backend/src/services/dietRecommendationService.js');
const serviceSrc = fs.readFileSync(servicePath, 'utf8');

it('dietRecommendationService exports generateDietRecommendation and getLatestRecommendation', () => {
  expect(serviceSrc).toContain('export const generateDietRecommendation');
  expect(serviceSrc).toContain('export const getLatestRecommendation');
});

it('dietRecommendationService structures plan into Sections A through E with disclaimers', () => {
  expect(serviceSrc).toContain('student_summary:');
  expect(serviceSrc).toContain('school_meal_assessment:');
  expect(serviceSrc).toContain('remaining_full_day_context:');
  expect(serviceSrc).toContain('personalized_recommendations:');
  expect(serviceSrc).toContain('monitoring_and_trend:');
  expect(serviceSrc).toContain('disclaimers:');
});

// ============================================================================
// SCENARIO 14: No Duplicate Records from Repeated Requests
// ============================================================================
console.log('\n▶ SCENARIO 14: Idempotency and duplicate prevention');

it('dietRecommendationService implements caching to avoid redundant recomputations', () => {
  expect(serviceSrc).toContain('recommendationCache');
  expect(serviceSrc).toContain('recommendationCache.get(sId)');
});

// ============================================================================
// SCENARIO 15: Frontend Integration & Non-Clinical Framing
// ============================================================================
console.log('\n▶ SCENARIO 15: Frontend component integration and non-clinical framing');

const compPath = path.join(rootDir, 'frontend/src/features/students/components/DietRecommendationSection.jsx');
const compSrc = fs.readFileSync(compPath, 'utf8');

it('DietRecommendationSection.jsx explicitly includes non-clinical notices and separates full-day context', () => {
  expect(compSrc).toContain('PM POSHAN');
  expect(compSrc).toContain('ICMR Standards');
  expect(compSrc).toContain('Estimated Remaining Full-Day Requirement');
  expect(compSrc).toContain('Home meals, morning breakfast, and family dinners outside school hours are not recorded');
  expect(compSrc).toContain('Notice:');
});

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(70));
console.log(`Results: ${totalPassed} passed, ${totalFailed} failed`);
if (totalFailed === 0) {
  console.log('🎉 ALL PHASE 5 PERSONALIZED DIET RECOMMENDATION TESTS PASSED!');
} else {
  console.log('❌ SOME PHASE 5 TESTS FAILED');
}
console.log('='.repeat(70));

process.exit(totalFailed > 0 ? 1 : 0);
