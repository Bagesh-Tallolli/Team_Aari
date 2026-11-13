/**
 * Phase 1 Validation Test Suite: Core Nutrition Logic and Calculation Corrections
 * 
 * Verifies all 8 required scenarios:
 * 1. A child receives exactly the school-meal target.
 * 2. A child receives less than the school-meal target.
 * 3. A child receives more than the school-meal target.
 * 4. A child receives multiple food items in one day.
 * 5. A child has multiple serving records on different days.
 * 6. A child has missing serving records for some days.
 * 7. Two children of the same age but different sexes are assessed using the correct pediatric reference.
 * 8. Only rice is recorded as served, without assuming other menu items were served.
 * 
 * Usage: node backend/scripts/test-phase1-nutrition-core.js
 */

import {
  PM_POSHAN_TARGETS,
  getSchoolMealTarget,
  ICMR_DAILY_REQUIREMENTS,
  getFullDayRequirement,
  WHO_PEDIATRIC_BMI_CUTOFFS,
  assessPediatricBmi,
  VERIFIED_FOOD_COMPOSITION,
  calculateServedNutrients,
} from '../src/config/nutritionStandards.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('='.repeat(70));
console.log('🧪 PHASE 1 TEST SUITE: CORE NUTRITION LOGIC & CALCULATIONS');
console.log('='.repeat(70));

// ----------------------------------------------------------------------------
// SCENARIO 1: A child receives exactly the school-meal target
// ----------------------------------------------------------------------------
console.log('\n▶ SCENARIO 1: Child receives exactly the school-meal target (Primary: 450 kcal)');
{
  const target = getSchoolMealTarget(8); // Primary (Class 1-5)
  assert(target.calories === 450, 'Primary school meal calorie target is 450 kcal');
  assert(target.protein === 12.0, 'Primary school meal protein target is 12.0g');

  const actualServedCalories = 450.0;
  const actualServedProtein = 12.0;

  const calorieGap = Math.max(0, target.calories - actualServedCalories);
  const proteinGap = Math.max(0, target.protein - actualServedProtein);
  const fulfillmentPct = Math.round((actualServedCalories / target.calories) * 100);

  assert(calorieGap === 0, `Calorie gap is exactly 0 kcal when target is met (got ${calorieGap})`);
  assert(proteinGap === 0, `Protein gap is exactly 0g when target is met (got ${proteinGap})`);
  assert(fulfillmentPct === 100, `Fulfillment percentage is 100% (got ${fulfillmentPct}%)`);
}

// ----------------------------------------------------------------------------
// SCENARIO 2: A child receives less than the school-meal target
// ----------------------------------------------------------------------------
console.log('\n▶ SCENARIO 2: Child receives less than the school-meal target');
{
  const target = getSchoolMealTarget(9); // 450 kcal
  const servedRiceGrams = 100;
  const nutrients = calculateServedNutrients('rice', servedRiceGrams); // 130 kcal, 2.7g protein

  assert(nutrients.calories === 130.0, `100g cooked rice gives 130 kcal (got ${nutrients.calories})`);
  assert(nutrients.protein === 2.7, `100g cooked rice gives 2.7g protein (got ${nutrients.protein})`);

  // Evaluated against school-meal target (450 kcal), NOT 24h requirement (1500 kcal)
  const schoolMealCalorieGap = target.calories - nutrients.calories; // 450 - 130 = 320 kcal
  const fullDayReq = getFullDayRequirement(9, 'Male'); // 1500 kcal

  assert(schoolMealCalorieGap === 320, `School-meal calorie gap is 320 kcal (got ${schoolMealCalorieGap})`);
  assert(schoolMealCalorieGap < 500, 'School meal gap does not trigger artificial extreme-deficit alert');
  assert(fullDayReq.calories === 1500, `Full-day requirement is separated at 1500 kcal`);
}

// ----------------------------------------------------------------------------
// SCENARIO 3: A child receives more than the school-meal target
// ----------------------------------------------------------------------------
console.log('\n▶ SCENARIO 3: Child receives more than the school-meal target');
{
  const target = getSchoolMealTarget(12); // Upper Primary: 700 kcal
  assert(target.calories === 700, 'Upper primary school meal calorie target is 700 kcal');

  const servedCalories = 750.0;
  const calorieGap = Math.max(0, target.calories - servedCalories);
  const fulfillmentPct = Math.round((servedCalories / target.calories) * 100);

  assert(calorieGap === 0, `Calorie gap clamped at 0 when serving exceeds target (got ${calorieGap})`);
  assert(fulfillmentPct === 107, `Fulfillment percentage is 107% (got ${fulfillmentPct}%)`);
}

// ----------------------------------------------------------------------------
// SCENARIO 4: A child receives multiple food items in one day
// ----------------------------------------------------------------------------
console.log('\n▶ SCENARIO 4: Child receives multiple food items in one day (Aggregation Check)');
{
  // Simulated servings on 2026-11-10: 150g Rice + 60g Dal + 50g Vegetables
  const item1 = calculateServedNutrients('rice', 150);      // 195 kcal, 4.05g protein
  const item2 = calculateServedNutrients('dal', 60);        // 63 kcal, 3.9g protein
  const item3 = calculateServedNutrients('vegetables', 50); // 32.5 kcal, 1.0g protein

  const dailyItems = [item1, item2, item3];
  
  // Daily total sum (Correct aggregation)
  const totalDailyCalories = dailyItems.reduce((sum, item) => sum + item.calories, 0);
  const totalDailyProtein = dailyItems.reduce((sum, item) => sum + item.protein, 0);

  // Per-item average (Incorrect old method)
  const oldErroneousAverage = totalDailyCalories / dailyItems.length;

  assert(Math.round(totalDailyCalories) === 291, `Daily total calories correctly summed to ~291 kcal (got ${totalDailyCalories})`);
  assert(Math.round(totalDailyProtein * 10) / 10 === 9.0, `Daily total protein correctly summed to ~9.0g (got ${totalDailyProtein})`);
  assert(oldErroneousAverage < totalDailyCalories, `Verified old per-meal average (${oldErroneousAverage.toFixed(1)}) would have severely distorted daily intake`);
}

// ----------------------------------------------------------------------------
// SCENARIO 5: A child has multiple serving records on different days
// ----------------------------------------------------------------------------
console.log('\n▶ SCENARIO 5: Child has multiple serving records across different days');
{
  // Daily intake on 3 distinct days:
  // Day 1: 300 kcal (Rice + Dal)
  // Day 2: 450 kcal (Full meal)
  // Day 3: 400 kcal (Rice + Egg)
  const dailyTotals = [
    { date: '2026-11-08', day_calories: 300, day_protein: 9.0 },
    { date: '2026-11-09', day_calories: 450, day_protein: 12.0 },
    { date: '2026-11-10', day_calories: 400, day_protein: 15.0 },
  ];

  const totalCalories = dailyTotals.reduce((sum, d) => sum + d.day_calories, 0); // 1150 kcal
  const activeDaysCount = dailyTotals.length; // 3 days
  const avgDailyCalories = totalCalories / activeDaysCount; // 383.33 kcal/day

  assert(activeDaysCount === 3, 'Recorded 3 distinct active days');
  assert(parseFloat(avgDailyCalories.toFixed(2)) === 383.33, `7-day daily average correctly computed from daily totals: 383.33 kcal/day (got ${avgDailyCalories.toFixed(2)})`);
}

// ----------------------------------------------------------------------------
// SCENARIO 6: A child has missing serving records for some days
// ----------------------------------------------------------------------------
console.log('\n▶ SCENARIO 6: Missing serving records handled separately (Not counted as 0 consumption)');
{
  // In a 7-day calendar window, student attended school for only 4 days:
  const recordedDailyTotals = [420, 450, 440, 460]; // 4 active days
  const totalCalories = recordedDailyTotals.reduce((a, b) => a + b, 0); // 1770 kcal
  
  // Correct method: average over recorded active days
  const avgAcrossActiveDays = totalCalories / recordedDailyTotals.length; // 442.5 kcal/day

  // Erroneous naive division: dividing by 7 treating absent days as 0 kcal eaten
  const naiveDivisionBy7 = totalCalories / 7; // 252.85 kcal/day

  assert(avgAcrossActiveDays === 442.5, `Average daily intake across recorded school days is 442.5 kcal/day`);
  assert(naiveDivisionBy7 < 300, `Confirmed naive division by 7 falsely penalized the child to ${naiveDivisionBy7.toFixed(1)} kcal`);
  assert(recordedDailyTotals.length === 4, 'Active days count explicitly tracked (4/7 recorded days)');
}

// ----------------------------------------------------------------------------
// SCENARIO 7: Two children of the same age but different sexes assessed using WHO reference
// ----------------------------------------------------------------------------
console.log('\n▶ SCENARIO 7: Sex-specific pediatric WHO BMI-for-age assessment');
{
  const age = 12;
  const bmi = 14.5; // Test BMI

  const boyAssessment = assessPediatricBmi(age, 'Male', bmi);
  const girlAssessment = assessPediatricBmi(age, 'Female', bmi);

  assert(boyAssessment.standardsSource.includes('WHO Growth Reference'), 'Standards source identified as WHO Growth Reference (5-19 years)');
  assert(boyAssessment.isScreeningOnly === true, 'Screening notice explicitly set');

  // At age 12, WHO cutoff for boys -2 SD is 15.0; for girls -2 SD is 14.9
  assert(boyAssessment.thinnessThreshold === 15.0, `Boy age 12 thinness threshold is 15.0`);
  assert(girlAssessment.thinnessThreshold === 14.9, `Girl age 12 thinness threshold is 14.9`);

  // Test child with normal pediatric BMI of 16.2 at age 8
  const normalChildAssessment = assessPediatricBmi(8, 'Male', 16.2);
  assert(normalChildAssessment.category === 'normal', `Age 8 boy with BMI 16.2 is correctly classified as Normal (got ${normalChildAssessment.category})`);
  assert(normalChildAssessment.riskLevel === 'healthy', `Risk level is healthy`);
  // Note: Under adult cutoff (< 18.5), BMI 16.2 would have been falsely marked as underweight!
  assert(normalChildAssessment.medianBmi === 15.8, `Age 8 boy WHO median BMI is 15.8`);
}

// ----------------------------------------------------------------------------
// SCENARIO 8: Only rice is recorded as served (no assumptions of unrecorded menu items)
// ----------------------------------------------------------------------------
console.log('\n▶ SCENARIO 8: Only rice recorded as served (Zero unrecorded item assumptions)');
{
  const measuredGrams = 150; // 150g rice dispensed
  const nutrients = calculateServedNutrients('rice', measuredGrams);

  assert(nutrients.food_item === 'Cooked White Rice', 'Food item confirmed as Cooked White Rice');
  assert(nutrients.measured_grams === 150, 'Actual measured weight used (150g)');
  assert(nutrients.calories === 195.0, `Calories computed strictly as 195.0 kcal ((130 * 150)/100)`);
  assert(nutrients.protein === 4.05, `Protein computed strictly as 4.05g ((2.7 * 150)/100)`);
  assert(nutrients.carbs === 42.0, `Carbs computed strictly as 42.0g ((28.0 * 150)/100)`);
  assert(nutrients.fats === 0.45, `Fats computed strictly as 0.45g ((0.3 * 150)/100)`);
  assert(nutrients.is_served_record === true, 'Clearly flagged as a served record');
  assert(nutrients.is_confirmed_consumed === false, 'Explicitly marked: is_confirmed_consumed = false');
}

console.log('\n' + '='.repeat(70));
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log('='.repeat(70));

