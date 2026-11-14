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

    // Step 8: Build Balanced Desi Meal Plans (Breakfast & Dinner) matching Remaining Calories
    const desiMealPlans = buildDesiMealPlans(remainingDailyCalories);

    // Step 9: Assemble Structured Recommendation Plan
    const timestamp = new Date().toISOString();
    const planId = `rec_${sId}_${Date.now()}`;

    const structuredPlan = {
      success: true,
      plan_id: planId,
      student_id: sId,
      generated_at: timestamp,

      // NEW: Desi Meal Plans for Breakfast & Dinner matching remaining daily calories
      desi_meal_plans: desiMealPlans,
      current_meal_plan: isVegetarian ? desiMealPlans.veg : desiMealPlans.non_veg,

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
 * Build balanced Desi Indian meal plans for Breakfast and Dinner
 * strictly scaled to match the student's remaining daily ICMR calories.
 * 
 * @param {number} remainingCalories - Daily remaining ICMR calories after school serving
 * @returns {object} { veg, non_veg }
 */
export const buildDesiMealPlans = (remainingCalories) => {
  const rem = Math.max(0, Math.round(remainingCalories || 0));

  const generateForType = (isVeg) => {
    if (rem <= 0) {
      return {
        type: isVeg ? 'veg' : 'non_veg',
        type_label: isVeg ? 'Vegetarian' : 'Non-Vegetarian & Egg',
        total_remaining_calories: 0,
        total_recommended_calories: 0,
        total_recommended_protein_g: 0,
        is_fully_met: true,
        breakfast: {
          label: 'Morning Breakfast',
          desi_title: isVeg ? '🌅 Desi Morning Breakfast (Ghar Ka Nashta)' : '🌅 Desi High-Protein Breakfast (Ande & Nashta)',
          target_calories: 0,
          total_calories: 0,
          total_protein_g: 0,
          items: [],
        },
        dinner: {
          label: 'Evening Dinner',
          desi_title: isVeg ? '🌙 Evening Family Dinner (Roti, Daal & Sabzi)' : '🌙 Evening Wholesome Dinner (Chicken, Roti & Rice)',
          target_calories: 0,
          total_calories: 0,
          total_protein_g: 0,
          items: [],
        },
      };
    }

    // Split: Breakfast 40%, Dinner 60%
    const bTarget = Math.round(rem * 0.40);
    const dTarget = rem - bTarget;

    // Breakfast items
    let bItems = [];
    if (isVeg) {
      const c1 = Math.round(bTarget * 0.42); // Poha with Peanuts
      const c2 = Math.round(bTarget * 0.28); // Cow Milk
      const c3 = Math.round(bTarget * 0.18); // Banana
      const c4 = bTarget - (c1 + c2 + c3);   // Roasted Chana

      const g1 = Math.round(c1 / 1.6);
      const g2 = Math.round(c2 / 0.65);
      const g3 = Math.round(c3 / 0.90);
      const g4 = Math.round(c4 / 3.6);

      bItems = [
        {
          name: 'Desi Poha with Peanuts & Veggies',
          desi_name: 'पोहा / ಅವಲಕ್ಕಿ (Poha)',
          grams: g1,
          portion: `${g1}g (1.5 Plates)`,
          calories: c1,
          protein_g: parseFloat(((c1 / 1.6) * 0.045).toFixed(1)),
          description: 'Flaked rice tempered with mustard, roasted peanuts, and carrots for wholesome morning energy.',
          icon: 'poha',
        },
        {
          name: 'Warm Fresh Cow Milk',
          desi_name: 'गरम दूध / ಹಾಲು (Warm Milk)',
          grams: g2,
          portion: `${g2}ml (1 Glass)`,
          calories: c2,
          protein_g: parseFloat((g2 * 0.033).toFixed(1)),
          description: 'Calcium and bioavailable milk protein for healthy pediatric bone density.',
          icon: 'milk',
        },
        {
          name: 'Fresh Seasonal Banana',
          desi_name: 'ताज़ा केला / ಬಾಳೆಹಣ್ಣು (Banana)',
          grams: g3,
          portion: `${g3}g (1-2 Fruits)`,
          calories: c3,
          protein_g: parseFloat((g3 * 0.012).toFixed(1)),
          description: 'Rich in dietary potassium, vitamin B6, and natural quick-digesting carbohydrates.',
          icon: 'fruit',
        },
        {
          name: 'Roasted Bengal Gram (Chana)',
          desi_name: 'भुना चना / ಹುರಿಗಡಲೆ (Roasted Chana)',
          grams: g4,
          portion: `${g4}g (1 Handful)`,
          calories: c4,
          protein_g: parseFloat((g4 * 0.18).toFixed(1)),
          description: 'Traditional desi protein snack rich in dietary fiber and plant iron.',
          icon: 'chana',
        },
      ];
    } else {
      const c1 = Math.round(bTarget * 0.38); // Boiled Eggs
      const numEggs = Math.max(1, Math.round(c1 / 78));
      const adjC1 = numEggs * 78;
      const eggGrams = numEggs * 50;

      const remainingB = bTarget - adjC1;
      const adjC2 = Math.round(remainingB * 0.52); // Roti
      const adjC3 = Math.round(remainingB * 0.32); // Milk
      const adjC4 = remainingB - (adjC2 + adjC3);  // Fruit

      const numRotis = Math.max(1, Math.round(adjC2 / 105));
      const rotiGrams = numRotis * 35;
      const g3 = Math.round(adjC3 / 0.65);
      const g4 = Math.round(adjC4 / 0.90);

      bItems = [
        {
          name: 'Fresh Boiled Eggs / Egg Bhurji',
          desi_name: 'उबले अंडे / ಬೇಯಿಸಿದ ಮೊಟ್ಟೆ (Boiled Eggs)',
          grams: eggGrams,
          portion: `${numEggs} Whole ${numEggs === 1 ? 'Egg' : 'Eggs'} (${eggGrams}g)`,
          calories: adjC1,
          protein_g: parseFloat((numEggs * 6.3).toFixed(1)),
          description: 'Complete high-biological-value protein and essential choline for brain growth.',
          icon: 'egg',
        },
        {
          name: 'Whole Wheat Tawa Roti (Chapati)',
          desi_name: 'गरम तवा रोटी / ಚಪಾತಿ (Chapati)',
          grams: rotiGrams,
          portion: `${numRotis} ${numRotis === 1 ? 'Roti' : 'Rotis'} (${rotiGrams}g)`,
          calories: adjC2,
          protein_g: parseFloat((numRotis * 3.2).toFixed(1)),
          description: 'Whole wheat chapati offering complex carbohydrates and sustained morning stamina.',
          icon: 'roti',
        },
        {
          name: 'Warm Fresh Cow Milk',
          desi_name: 'गरम दूध / ಹಾಲು (Warm Milk)',
          grams: g3,
          portion: `${g3}ml (1 Cup)`,
          calories: adjC3,
          protein_g: parseFloat((g3 * 0.033).toFixed(1)),
          description: 'High-quality calcium for skeletal strength and neuromuscular health.',
          icon: 'milk',
        },
        {
          name: 'Fresh Seasonal Fruit (Banana)',
          desi_name: 'ताज़ा फल / ಹಣ್ಣು (Fruit)',
          grams: g4,
          portion: `${g4}g (1 Medium)`,
          calories: adjC4,
          protein_g: parseFloat((g4 * 0.012).toFixed(1)),
          description: 'Natural fruit sugars and dietary fiber for gastrointestinal balance.',
          icon: 'fruit',
        },
      ];
    }

    // Dinner items
    let dItems = [];
    if (isVeg) {
      const c1 = Math.round(dTarget * 0.35); // Roti
      const c2 = Math.round(dTarget * 0.28); // Daal
      const c3 = Math.round(dTarget * 0.22); // Rice
      const c4 = dTarget - (c1 + c2 + c3);   // Sabzi

      const numRotis = Math.max(1, Math.round(c1 / 105));
      const rotiGrams = numRotis * 35;
      const g2 = Math.round(c2 / 1.05);
      const g3 = Math.round(c3 / 1.30);
      const g4 = Math.round(c4 / 0.85);

      dItems = [
        {
          name: 'Fresh Wheat Roti (Phulka / Chapati)',
          desi_name: 'ताज़ा गेहूं रोटी / ಚಪಾತಿ (Phulka)',
          grams: rotiGrams,
          portion: `${numRotis} ${numRotis === 1 ? 'Roti' : 'Rotis'} (${rotiGrams}g)`,
          calories: c1,
          protein_g: parseFloat((numRotis * 3.2).toFixed(1)),
          description: 'Traditional stone-ground whole wheat rotis lightly topped with desi ghee.',
          icon: 'roti',
        },
        {
          name: 'Cooked Toor / Moong Daal Tadka',
          desi_name: 'तड़का दाल / ಬೇಳೆ ಸಾರು (Daal Tadka)',
          grams: g2,
          portion: `${g2}g (${(g2 / 150).toFixed(1)} Bowls)`,
          calories: c2,
          protein_g: parseFloat((g2 * 0.055).toFixed(1)),
          description: 'Traditional slow-cooked yellow lentils tempered with cumin, garlic, and turmeric.',
          icon: 'daal',
        },
        {
          name: 'Steamed Rice (Ghar Ka Chawal)',
          desi_name: 'गरम उबले चावल / ಅನ್ನ (Steamed Rice)',
          grams: g3,
          portion: `${g3}g (${(g3 / 150).toFixed(1)} Bowls)`,
          calories: c3,
          protein_g: parseFloat((g3 * 0.027).toFixed(1)),
          description: 'Steamed white rice providing complete amino acid profile when paired with daal.',
          icon: 'rice',
        },
        {
          name: 'Mixed Seasonal Sabzi / Bhaji',
          desi_name: 'सब्ज़ी / ಪಲ್ಯ (Vegetable Sabzi)',
          grams: g4,
          portion: `${g4}g (${(g4 / 150).toFixed(1)} Bowls)`,
          calories: c4,
          protein_g: parseFloat((g4 * 0.024).toFixed(1)),
          description: 'Local seasonal vegetables (green beans, carrots, potato, spinach) cooked in mild spices.',
          icon: 'sabzi',
        },
      ];
    } else {
      const c1 = Math.round(dTarget * 0.38); // Chicken Curry
      const c2 = Math.round(dTarget * 0.28); // Roti
      const c3 = Math.round(dTarget * 0.20); // Rice
      const c4 = dTarget - (c1 + c2 + c3);   // Daal

      const g1 = Math.round(c1 / 1.55);
      const numRotis = Math.max(1, Math.round(c2 / 105));
      const rotiGrams = numRotis * 35;
      const g3 = Math.round(c3 / 1.30);
      const g4 = Math.round(c4 / 1.05);

      dItems = [
        {
          name: 'Desi Chicken Curry (Tariwala Chicken)',
          desi_name: 'देसी चिकन करी / ಕೋಳಿ ಸಾರು (Chicken Curry)',
          grams: g1,
          portion: `${g1}g (${(g1 / 150).toFixed(1)} Bowls)`,
          calories: c1,
          protein_g: parseFloat((g1 * 0.14).toFixed(1)),
          description: 'Lean chicken stewed with onion, tomato, and mild Indian spices for dense animal protein.',
          icon: 'chicken',
        },
        {
          name: 'Fresh Wheat Roti (Phulka / Chapati)',
          desi_name: 'ताज़ा रोटी / ಚಪಾತಿ (Phulka)',
          grams: rotiGrams,
          portion: `${numRotis} ${numRotis === 1 ? 'Roti' : 'Rotis'} (${rotiGrams}g)`,
          calories: c2,
          protein_g: parseFloat((numRotis * 3.2).toFixed(1)),
          description: 'Fresh stone-ground wheat rotis providing energy-dense dietary complex carbs.',
          icon: 'roti',
        },
        {
          name: 'Steamed Rice (Ghar Ka Chawal)',
          desi_name: 'गरम उबले चावल / ಅನ್ನ (Steamed Rice)',
          grams: g3,
          portion: `${g3}g (${(g3 / 150).toFixed(1)} Bowls)`,
          calories: c3,
          protein_g: parseFloat((g3 * 0.027).toFixed(1)),
          description: 'Soft steamed rice that pairs perfectly with chicken curry and daal gravy.',
          icon: 'rice',
        },
        {
          name: 'Cooked Yellow Daal (Toor / Moong)',
          desi_name: 'तड़का दाल / ಬೇಳೆ ಸಾರು (Yellow Daal)',
          grams: g4,
          portion: `${g4}g (${(g4 / 150).toFixed(1)} Bowls)`,
          calories: c4,
          protein_g: parseFloat((g4 * 0.055).toFixed(1)),
          description: 'Digestive pulse gravy ensuring dietary fiber and mineral variety.',
          icon: 'daal',
        },
      ];
    }

    const bTotalCals = bItems.reduce((acc, it) => acc + it.calories, 0);
    const bTotalProtein = parseFloat(bItems.reduce((acc, it) => acc + it.protein_g, 0).toFixed(1));
    const dTotalCals = dItems.reduce((acc, it) => acc + it.calories, 0);
    const dTotalProtein = parseFloat(dItems.reduce((acc, it) => acc + it.protein_g, 0).toFixed(1));

    return {
      type: isVeg ? 'veg' : 'non_veg',
      type_label: isVeg ? 'Vegetarian' : 'Non-Vegetarian & Egg',
      total_remaining_calories: rem,
      total_recommended_calories: bTotalCals + dTotalCals,
      total_recommended_protein_g: parseFloat((bTotalProtein + dTotalProtein).toFixed(1)),
      is_match: (bTotalCals + dTotalCals) === rem,
      breakfast: {
        label: 'Morning Breakfast',
        desi_title: isVeg ? '🌅 Desi Morning Breakfast (Ghar Ka Nashta)' : '🌅 Desi High-Protein Breakfast (Ande & Nashta)',
        target_calories: bTarget,
        total_calories: bTotalCals,
        total_protein_g: bTotalProtein,
        items: bItems,
      },
      dinner: {
        label: 'Evening Dinner',
        desi_title: isVeg ? '🌙 Evening Family Dinner (Roti, Daal & Sabzi)' : '🌙 Evening Wholesome Dinner (Chicken, Roti & Rice)',
        target_calories: dTarget,
        total_calories: dTotalCals,
        total_protein_g: dTotalProtein,
        items: dItems,
      },
    };
  };

  return {
    veg: generateForType(true),
    non_veg: generateForType(false),
  };
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
  buildDesiMealPlans,
};

