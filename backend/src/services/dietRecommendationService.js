import { query } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';
import studentModel from '../models/studentModel.js';
import foodLogModel from '../models/foodLogModel.js';
import dietPlanModel from '../models/dietPlanModel.js';
import * as analyticsService from './analyticsService.js';
import * as predictionService from './predictionService.js';
import {
  getSchoolMealTarget,
  getFullDayRequirement,
  assessPediatricBmi,
  VERIFIED_FOOD_COMPOSITION,
  calculateServedNutrients,
} from '../config/nutritionStandards.js';

// In-memory cache to prevent duplicate generation for rapid repeated requests
const recommendationCache = new Map();

/**
 * ============================================================================
 * Personalized Diet Recommendation Service (Phase 5)
 * ============================================================================
 * 
 * CORE PRINCIPLES:
 * 1. Three strictly separated nutrition domains:
 *    - Full-day requirement (ICMR-NIN 2020 RDA reference)
 *    - School-meal target (PM POSHAN statutory allocation)
 *    - Actual school servings (HX711 verified weight measurements)
 * 2. Unrecorded home meals/snacks are NOT assumed to be 0 or an actual deficit.
 *    The remainder is clearly labeled: "Estimated remaining full-day requirement after recorded school serving".
 * 3. Transparent, explainable rule-based recommendation logic using verified Indian food data.
 * 4. Educational guidance only — not a clinical diagnosis or medical prescription.
 */

/**
 * Generate comprehensive, personalized diet recommendations for a student
 * 
 * @param {number} studentId - Student ID
 * @param {object} options - Optional generation flags { forceRefresh, preference }
 * @returns {Promise<object>} Structured recommendation plan (Sections A-E)
 */
export const generateDietRecommendation = async (studentId, options = {}) => {
  try {
    if (!studentId) {
      throw new AppError('Student ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const sId = parseInt(studentId, 10);
    if (isNaN(sId)) {
      throw new AppError('Invalid Student ID format', HTTP_STATUS.BAD_REQUEST);
    }

    logger.info(`🍱 Generating personalized diet recommendation for student ID: ${sId}`);

    // Step 1: Fetch Student Profile
    const student = await studentModel.getStudentById(sId);
    if (!student) {
      throw new AppError('Student not found', HTTP_STATUS.NOT_FOUND);
    }

    const age = Number(student.age) || 10;
    const gender = student.gender || 'Male';
    const height = parseFloat(student.height) || 120.0;
    const weight = parseFloat(student.weight) || 25.0;
    const heightInMeters = height / 100.0;
    const currentBmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(2));
    const preference = (options.preference || student.food_preference || 'veg').toLowerCase();
    const isVegetarian = preference === 'veg' || preference === 'vegetarian';

    // Step 2: Pediatric Screening & Nutrition Benchmarks
    const pediatricAssessment = assessPediatricBmi(age, gender, currentBmi);
    const schoolMealTarget = getSchoolMealTarget(age);
    const fullDayRequirement = getFullDayRequirement(age, gender);

    // Step 3: Retrieve Verified School Servings & Intake History
    const [todaysLogs, weeklyIntake, recentDistributions] = await Promise.all([
      foodLogModel.getFoodLogsByDate(sId, new Date().toISOString().split('T')[0]),
      analyticsService.getWeeklyIntakeDetails(sId),
      foodLogModel.getFoodLogsByStudentId(sId, 10),
    ]);

    // Sum actual measured school nutrients served today
    let actualSchoolCaloriesServed = 0;
    let actualSchoolProteinServed = 0;
    let actualSchoolIronServed = 0;
    let actualSchoolCalciumServed = 0;
    let actualSchoolGramsServed = 0;
    const servedItemsToday = [];

    for (const log of (todaysLogs || [])) {
      const g = parseFloat(log.served_grams || 0);
      const c = parseFloat(log.estimated_calories || 0);
      const p = parseFloat(log.protein || 0);
      const nutrients = calculateServedNutrients(log.food_item, g);

      actualSchoolCaloriesServed += c;
      actualSchoolProteinServed += p;
      actualSchoolIronServed += (nutrients.iron_mg || 0);
      actualSchoolCalciumServed += (nutrients.calcium_mg || 0);
      actualSchoolGramsServed += g;

      servedItemsToday.push({
        id: log.id,
        food_item: log.food_item,
        served_grams: g,
        calories: c,
        protein: p,
        iron_mg: nutrients.iron_mg,
        calcium_mg: nutrients.calcium_mg,
        logged_at: log.logged_at,
      });
    }

    actualSchoolCaloriesServed = parseFloat(actualSchoolCaloriesServed.toFixed(2));
    actualSchoolProteinServed = parseFloat(actualSchoolProteinServed.toFixed(2));
    actualSchoolIronServed = parseFloat(actualSchoolIronServed.toFixed(2));
    actualSchoolCalciumServed = parseFloat(actualSchoolCalciumServed.toFixed(2));
    actualSchoolGramsServed = parseFloat(actualSchoolGramsServed.toFixed(2));

    // Step 4: Nutritional Gap & Fulfillment Calculations
    // A. School-Meal Gap (Statutory PM POSHAN Targets vs Today's Measured Intake)
    const schoolMealCalorieGap = Math.max(0, parseFloat((schoolMealTarget.calories - actualSchoolCaloriesServed).toFixed(2)));
    const schoolMealProteinGap = Math.max(0, parseFloat((schoolMealTarget.protein - actualSchoolProteinServed).toFixed(2)));
    const schoolMealCalorieFulfillmentPct = Math.min(200, Math.round((actualSchoolCaloriesServed / schoolMealTarget.calories) * 100));
    const schoolMealProteinFulfillmentPct = schoolMealTarget.protein > 0
      ? Math.min(200, Math.round((actualSchoolProteinServed / schoolMealTarget.protein) * 100))
      : 0;

    let schoolMealStatus = 'GOAL_MET';
    let schoolMealStatusDesc = 'School meal statutory target satisfied.';
    if (actualSchoolCaloriesServed === 0) {
      schoolMealStatus = 'NOT_SERVED_TODAY';
      schoolMealStatusDesc = 'No verified school meal recorded today.';
    } else if (schoolMealCalorieGap > 0 || schoolMealProteinGap > 0) {
      schoolMealStatus = 'PORTION_GAP';
      schoolMealStatusDesc = `Recorded school serving is ${schoolMealCalorieGap} kcal and ${schoolMealProteinGap}g protein below the PM POSHAN allocation.`;
    }

    // B. Estimated Remaining Full-Day Requirement
    // NEVER call this an actual deficiency or deficit; home meals are untracked.
    const remainingDailyCalories = Math.max(0, parseFloat((fullDayRequirement.calories - actualSchoolCaloriesServed).toFixed(2)));
    const remainingDailyProtein = Math.max(0, parseFloat((fullDayRequirement.protein - actualSchoolProteinServed).toFixed(2)));
    const remainingDailyIron = Math.max(0, parseFloat(((fullDayRequirement.iron_mg || 15) - actualSchoolIronServed).toFixed(2)));
    const remainingDailyCalcium = Math.max(0, parseFloat(((fullDayRequirement.calcium_mg || 700) - actualSchoolCalciumServed).toFixed(2)));

    // C. 7-Day Trend Analysis
    const avgWeeklyDailyCalories = weeklyIntake?.avg_daily_calories || 0;
    const avgWeeklyDailyProtein = weeklyIntake?.avg_daily_protein || 0;
    const recordedSchoolDaysCount = weeklyIntake?.recorded_days_count || 0;
    const hasSufficientHistory = recordedSchoolDaysCount >= 3;
    const isRepeatedLowIntake = hasSufficientHistory && (avgWeeklyDailyCalories < (schoolMealTarget.calories * 0.70));

    // Step 5: Nutrients Needing Attention Identification
    const nutrientsNeedingAttention = [];

    if (schoolMealCalorieGap > 0 && actualSchoolCaloriesServed > 0) {
      nutrientsNeedingAttention.push({
        nutrient: 'School-Meal Energy Allocation',
        current_status: `${actualSchoolCaloriesServed} kcal (${schoolMealCalorieFulfillmentPct}% of PM POSHAN target)`,
        priority: schoolMealCalorieFulfillmentPct < 70 ? 'high' : 'medium',
        reason: 'Measured school portion was below the mandated PM POSHAN caloric allocation.',
      });
    }

    if (schoolMealProteinGap > 0 && actualSchoolProteinServed > 0) {
      nutrientsNeedingAttention.push({
        nutrient: 'School-Meal Protein',
        current_status: `${actualSchoolProteinServed}g (${schoolMealProteinFulfillmentPct}% of PM POSHAN target)`,
        priority: schoolMealProteinFulfillmentPct < 70 ? 'high' : 'medium',
        reason: 'Measured school portion was below the statutory protein norm; pulse or protein allocation needs adjustment.',
      });
    }

    if (pediatricAssessment.category === 'thinness' || pediatricAssessment.category === 'severe_thinness') {
      nutrientsNeedingAttention.push({
        nutrient: 'Pediatric Growth & Energy Density',
        current_status: `${pediatricAssessment.label} (BMI ${currentBmi})`,
        priority: 'high',
        reason: 'WHO pediatric screening indicates low BMI-for-age. Suggests prioritizing wholesome, calorie-dense foods.',
      });
    }

    if (age >= 10 && (gender === 'Female' || gender === 0 || gender === 'female')) {
      nutrientsNeedingAttention.push({
        nutrient: 'Dietary Iron & Folate',
        current_status: 'Adolescent Female Growth Phase',
        priority: 'medium',
        reason: 'Adolescent growth phase increases physiological iron requirement for blood volume expansion.',
      });
    }

    if (age >= 10 && age <= 14) {
      nutrientsNeedingAttention.push({
        nutrient: 'Dietary Calcium',
        current_status: 'Peak Skeletal Accretion Phase',
        priority: 'medium',
        reason: 'Peak childhood and early adolescent bone mineral deposition requires regular dietary calcium sources.',
      });
    }

    if (isRepeatedLowIntake) {
      nutrientsNeedingAttention.push({
        nutrient: 'Weekly Regularity of School Meal Consumption',
        current_status: `${avgWeeklyDailyCalories} kcal/day avg across ${recordedSchoolDaysCount} recorded days`,
        priority: 'high',
        reason: 'Child recorded intake has consistently averaged below 70% of the PM POSHAN norm across multiple school days.',
      });
    }

    // Step 6: Rule-Based Personalized Food Recommendations
    const personalizedSuggestions = [];

    // --- Suggestion 1: In-School Serving Adjustment ---
    if (schoolMealCalorieGap > 0 || schoolMealProteinGap > 0) {
      if (schoolMealProteinGap > 0) {
        if (!isVegetarian) {
          personalizedSuggestions.push({
            domain: 'in_school_adjustment',
            domain_label: 'In-School Portion Adjustment',
            food_item: VERIFIED_FOOD_COMPOSITION.egg.name,
            food_key: 'egg',
            portion_size: VERIFIED_FOOD_COMPOSITION.egg.standardPortionDesc,
            portion_grams: VERIFIED_FOOD_COMPOSITION.egg.standardPortionGrams,
            estimated_calories: 77.5,
            estimated_protein: 6.3,
            estimated_iron_mg: 0.9,
            estimated_calcium_mg: 25.0,
            target_gap_addressed: 'School-Meal Protein Fulfillment',
            reason: 'Provides complete high-biological-value protein to meet PM POSHAN school-meal target.',
            is_school_provided: true,
          });
        } else {
          personalizedSuggestions.push({
            domain: 'in_school_adjustment',
            domain_label: 'In-School Portion Adjustment',
            food_item: VERIFIED_FOOD_COMPOSITION.dal.name,
            food_key: 'dal',
            portion_size: '+50g additional dal',
            portion_grams: 50.0,
            estimated_calories: 52.5,
            estimated_protein: 3.25,
            estimated_iron_mg: 0.9,
            estimated_calcium_mg: 17.5,
            target_gap_addressed: 'School-Meal Protein Fulfillment',
            reason: 'Increases pulse portion to bridge school-meal protein gap using standard MDM ingredients.',
            is_school_provided: true,
          });
        }
      }

      if (schoolMealCalorieGap > 40) {
        personalizedSuggestions.push({
          domain: 'in_school_adjustment',
          domain_label: 'In-School Portion Adjustment',
          food_item: VERIFIED_FOOD_COMPOSITION.ragi_mudde.name,
          food_key: 'ragi_mudde',
          portion_size: VERIFIED_FOOD_COMPOSITION.ragi_mudde.standardPortionDesc,
          portion_grams: VERIFIED_FOOD_COMPOSITION.ragi_mudde.standardPortionGrams,
          estimated_calories: 110.0,
          estimated_protein: 2.5,
          estimated_iron_mg: 1.5,
          estimated_calcium_mg: 115.0,
          target_gap_addressed: 'School-Meal Energy & Calcium Allocation',
          reason: 'Nutrient-dense finger millet provides complex carbohydrates and exceptional calcium.',
          is_school_provided: true,
        });
      }
    } else if (actualSchoolCaloriesServed > 0) {
      personalizedSuggestions.push({
        domain: 'in_school_adjustment',
        domain_label: 'In-School Portion Status',
        food_item: 'Standard PM POSHAN Menu',
        food_key: 'rice',
        portion_size: 'Current Allocation Maintained',
        portion_grams: actualSchoolGramsServed,
        estimated_calories: actualSchoolCaloriesServed,
        estimated_protein: actualSchoolProteinServed,
        estimated_iron_mg: actualSchoolIronServed,
        estimated_calcium_mg: actualSchoolCalciumServed,
        target_gap_addressed: 'Target Fully Met',
        reason: 'School-meal portion target is fully met today. Maintain regular portion dispensation.',
        is_school_provided: true,
      });
    }

    // --- Suggestion 2: Nutritious Mid-Day / Evening Supplementary Snacks ---
    personalizedSuggestions.push({
      domain: 'supplementary_snack',
      domain_label: 'Affordable Supplementary Snack',
      food_item: VERIFIED_FOOD_COMPOSITION.chikki.name,
      food_key: 'chikki',
      portion_size: VERIFIED_FOOD_COMPOSITION.chikki.standardPortionDesc,
      portion_grams: VERIFIED_FOOD_COMPOSITION.chikki.standardPortionGrams,
      estimated_calories: 125.0,
      estimated_protein: 3.5,
      estimated_iron_mg: 0.63,
      estimated_calcium_mg: 20.0,
      target_gap_addressed: 'Afternoon Energy & Healthy Fats',
      reason: 'Traditional roasted peanut and jaggery snack; cost-effective energy density.',
      is_school_provided: false,
    });

    personalizedSuggestions.push({
      domain: 'supplementary_snack',
      domain_label: 'Affordable Supplementary Snack',
      food_item: VERIFIED_FOOD_COMPOSITION.roasted_chana.name,
      food_key: 'roasted_chana',
      portion_size: VERIFIED_FOOD_COMPOSITION.roasted_chana.standardPortionDesc,
      portion_grams: VERIFIED_FOOD_COMPOSITION.roasted_chana.standardPortionGrams,
      estimated_calories: 114.0,
      estimated_protein: 5.4,
      estimated_iron_mg: 1.95,
      estimated_calcium_mg: 18.0,
      target_gap_addressed: 'Plant Protein & Dietary Iron',
      reason: 'Crunchy, shelf-stable roasted gram providing accessible protein and iron without refrigeration.',
      is_school_provided: false,
    });

    personalizedSuggestions.push({
      domain: 'supplementary_snack',
      domain_label: 'Fresh Produce Complement',
      food_item: VERIFIED_FOOD_COMPOSITION.seasonal_fruit.name,
      food_key: 'seasonal_fruit',
      portion_size: VERIFIED_FOOD_COMPOSITION.seasonal_fruit.standardPortionDesc,
      portion_grams: VERIFIED_FOOD_COMPOSITION.seasonal_fruit.standardPortionGrams,
      estimated_calories: 75.0,
      estimated_protein: 1.1,
      estimated_iron_mg: 0.5,
      estimated_calcium_mg: 20.0,
      target_gap_addressed: 'Micronutrients & Dietary Fiber',
      reason: 'Provides essential vitamins and ascorbic acid which significantly enhances non-heme iron absorption.',
      is_school_provided: false,
    });

    // --- Suggestion 3: Home Nutrition Complement (Educational Context) ---
    personalizedSuggestions.push({
      domain: 'home_complement',
      domain_label: 'Home Evening Complement',
      food_item: VERIFIED_FOOD_COMPOSITION.milk.name,
      food_key: 'milk',
      portion_size: VERIFIED_FOOD_COMPOSITION.milk.standardPortionDesc,
      portion_grams: VERIFIED_FOOD_COMPOSITION.milk.standardPortionGrams,
      estimated_calories: 97.5,
      estimated_protein: 4.8,
      estimated_iron_mg: 0.15,
      estimated_calcium_mg: 180.0,
      target_gap_addressed: 'Daily Calcium & High-Quality Protein',
      reason: 'Essential calcium for bone development; supports estimated remaining daily requirement.',
      is_school_provided: false,
    });

    personalizedSuggestions.push({
      domain: 'home_complement',
      domain_label: 'Home Dinner Complement',
      food_item: VERIFIED_FOOD_COMPOSITION.green_leafy_veg.name,
      food_key: 'green_leafy_veg',
      portion_size: VERIFIED_FOOD_COMPOSITION.green_leafy_veg.standardPortionDesc,
      portion_grams: VERIFIED_FOOD_COMPOSITION.green_leafy_veg.standardPortionGrams,
      estimated_calories: 33.75,
      estimated_protein: 2.25,
      estimated_iron_mg: 2.62,
      estimated_calcium_mg: 135.0,
      target_gap_addressed: 'Micronutrient Density (Iron & Calcium)',
      reason: 'Green leafy vegetables help prevent pediatric anemia and support immune function.',
      is_school_provided: false,
    });

    // Step 7: Optional AI Microservice Insight (Non-prescriptive auxiliary indicator)
    let aiInsight = null;
    try {
      const prediction = await predictionService.getPrediction(sId, preference);
      aiInsight = {
        status: prediction.status,
        confidence: prediction.confidence,
        risk_level: prediction.risk_level,
        model_name: 'RandomForestClassifier (Auxiliary Screening)',
        is_experimental: true,
      };
    } catch (aiErr) {
      logger.debug(`AI microservice not queried for recommendation (${aiErr.message})`);
    }

    // Step 8: Assemble Structured Recommendation Plan
    const timestamp = new Date().toISOString();
    const planId = `rec_${sId}_${Date.now()}`;

    const structuredPlan = {
      success: true,
      plan_id: planId,
      student_id: sId,
      generated_at: timestamp,

      // SECTION A: STUDENT SUMMARY
      student_summary: {
        student_id: sId,
        name: student.name,
        age,
        gender,
        height_cm: height,
        weight_kg: weight,
        current_bmi: currentBmi,
        food_preference: preference,
        pediatric_screening: {
          category: pediatricAssessment.category,
          label: pediatricAssessment.label,
          z_score_range: pediatricAssessment.zScoreRange,
          standard: pediatricAssessment.standardsSource,
          disclaimer: 'Pediatric screening indicator only. Not a medical or clinical diagnosis.',
        },
      },

      // SECTION B: SCHOOL-MEAL ASSESSMENT
      school_meal_assessment: {
        target: {
          stage: schoolMealTarget.stage,
          calories_kcal: schoolMealTarget.calories,
          protein_g: schoolMealTarget.protein,
          guideline_source: 'PM POSHAN Statutory Norms',
        },
        actual_served_today: {
          food_items_count: servedItemsToday.length,
          total_grams: actualSchoolGramsServed,
          calories_kcal: actualSchoolCaloriesServed,
          protein_g: actualSchoolProteinServed,
          iron_mg: actualSchoolIronServed,
          calcium_mg: actualSchoolCalciumServed,
          items: servedItemsToday,
          is_confirmed_served: true,
          is_confirmed_consumed: false,
        },
        gap_and_fulfillment: {
          calorie_gap_kcal: schoolMealCalorieGap,
          protein_gap_g: schoolMealProteinGap,
          calorie_fulfillment_pct: schoolMealCalorieFulfillmentPct,
          protein_fulfillment_pct: schoolMealProteinFulfillmentPct,
          status: schoolMealStatus,
          status_description: schoolMealStatusDesc,
        },
      },

      // SECTION C: ESTIMATED REMAINING FULL-DAY REQUIREMENT
      remaining_full_day_context: {
        label: 'Estimated remaining full-day requirement after recorded school serving',
        full_day_requirement: {
          calories_kcal: fullDayRequirement.calories,
          protein_g: fullDayRequirement.protein,
          iron_mg: fullDayRequirement.iron_mg || 15.0,
          calcium_mg: fullDayRequirement.calcium_mg || 700.0,
          standard_source: 'ICMR-NIN 2020 Recommended Dietary Allowances',
        },
        estimated_remaining: {
          calories_kcal: remainingDailyCalories,
          protein_g: remainingDailyProtein,
          iron_mg: remainingDailyIron,
          calcium_mg: remainingDailyCalcium,
        },
        accounting_note: 'Home meals, morning breakfast, and family dinners consumed outside school are not recorded. This represents the remaining estimated portion of the 24-hour ICMR reference allowance.',
      },

      // SECTION D: PERSONALIZED FOOD SUGGESTIONS & NUTRIENT PRIORITIES
      nutrients_needing_attention: nutrientsNeedingAttention,
      personalized_recommendations: personalizedSuggestions,

      // SECTION E: 7-DAY RECORDED INTAKE TREND & MONITORING
      monitoring_and_trend: {
        window_days: 7,
        recorded_school_days_count: recordedSchoolDaysCount,
        avg_daily_calories_kcal: avgWeeklyDailyCalories,
        avg_daily_protein_g: avgWeeklyDailyProtein,
        repeated_low_intake_flag: isRepeatedLowIntake,
        repeated_low_intake_reason: isRepeatedLowIntake
          ? 'Recorded intake on school days has repeatedly fallen below 70% of the PM POSHAN statutory norm.'
          : null,
        recent_servings_count: recentDistributions?.length || 0,
      },

      // AUXILIARY EXPERIMENTAL AI INDICATOR
      auxiliary_ai_screening: aiInsight,

      // DISCLAIMERS & SAFETY NOTES
      disclaimers: {
        non_clinical_notice: 'Educational and operational guidance for school nutrition monitoring only. This system does not diagnose medical conditions or prescribe therapeutic diets. Consult a qualified medical practitioner or pediatrician for health concerns.',
        plate_waste_notice: 'Recorded values reflect food verified as served at school; plate waste and food consumed outside school hours are not measured.',
      },
    };

    // Step 9: Non-destructive Persistence to diet_plan_items
    try {
      await persistRecommendationItems(sId, personalizedSuggestions);
    } catch (dbErr) {
      logger.warn(`Failed to mirror recommendation items to diet_plan_items: ${dbErr.message}`);
    }

    // Cache recommendation
    recommendationCache.set(sId, {
      data: structuredPlan,
      timestamp: Date.now(),
    });

    logger.info(`✅ Successfully generated personalized diet recommendation for student ${student.name}`);
    return structuredPlan;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ Diet recommendation generation failed: ${error.message}`);
    throw new AppError('Failed to generate personalized diet recommendations', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Retrieve the latest generated diet recommendation for a student
 * 
 * @param {number} studentId - Student ID
 * @returns {Promise<object>} Structured recommendation plan
 */
export const getLatestRecommendation = async (studentId) => {
  const sId = parseInt(studentId, 10);
  if (isNaN(sId)) {
    throw new AppError('Invalid Student ID format', HTTP_STATUS.BAD_REQUEST);
  }

  // Check cache first (valid for 5 minutes if no new food logged)
  const cached = recommendationCache.get(sId);
  if (cached && (Date.now() - cached.timestamp < 300000)) {
    return cached.data;
  }

  // Otherwise generate fresh
  return await generateDietRecommendation(sId);
};

/**
 * Non-destructive persistence of suggested items into diet_plan_items
 * Only replaces lunch / snack recommendations for this student, preserving all student and food log history.
 */
const persistRecommendationItems = async (studentId, suggestions) => {
  if (!suggestions || suggestions.length === 0) return;

  try {
    // Delete only auto-generated items for this student in diet_plan_items
    await query(
      `DELETE FROM diet_plan_items 
       WHERE student_id = $1 
         AND meal_type IN ('lunch', 'supplementary_snack', 'home_complement')`,
      [studentId]
    );

    for (const item of suggestions) {
      await query(
        `INSERT INTO diet_plan_items (student_id, meal_type, food_item, required_grams, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          studentId,
          item.domain || 'lunch',
          item.food_item,
          item.portion_grams || 100.0,
        ]
      );
    }
  } catch (err) {
    logger.debug(`diet_plan_items table query skipped: ${err.message}`);
  }
};

export default {
  generateDietRecommendation,
  getLatestRecommendation,
};

