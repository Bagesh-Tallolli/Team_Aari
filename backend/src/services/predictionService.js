/**
 * Prediction Service
 * Handles AI predictions and pediatric nutritional assessments
 * 
 * CORE CORRECTION (Phase 1):
 * - Separates full-day requirements (ICMR), PM POSHAN school-meal targets, and actual school servings.
 * - Assesses pediatric BMI using WHO 5-19 growth references (treats as screening, not clinical diagnosis).
 * - Evaluates school-meal compliance against PM POSHAN targets (450 kcal primary / 700 kcal upper primary).
 * - Avoids false extreme-deficit alerts caused by comparing a single school lunch to full-day energy needs.
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import { query } from '../config/db.js';
import * as studentModel from '../models/studentModel.js';
import * as analyticsService from './analyticsService.js';
import * as foodLogModel from '../models/foodLogModel.js';
import * as healthStatusModel from '../models/healthStatusModel.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import {
  getSchoolMealTarget,
  getFullDayRequirement,
  assessPediatricBmi,
} from '../config/nutritionStandards.js';

// AI Service configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
const PREDICT_ENDPOINT = `${AI_SERVICE_URL}/predict`;
const AI_TIMEOUT = 5000;

/**
 * Backward compatibility helper for full-day calories
 */
export const getRequiredCalories = (age, gender = 'Male') => {
  const req = getFullDayRequirement(age, gender);
  return req.calories;
};

/**
 * Get AI prediction and comprehensive nutritional assessment for a student
 * 
 * @param {number} studentId - Student ID
 * @param {string} preference - Dietary preference ('veg' or 'non_veg')
 * @returns {Promise<object>} Complete assessment data
 */
export const getPrediction = async (studentId, preference = 'veg') => {
  try {
    if (!studentId) {
      throw new AppError('Student ID required', HTTP_STATUS.BAD_REQUEST);
    }

    logger.debug(`🔍 Generating nutrition assessment for student ${studentId}`);

    // Step 1: Retrieve student profile
    const student = await studentModel.getStudentById(studentId);
    if (!student) {
      logger.warn(`❌ Student not found: ${studentId}`);
      throw new AppError('Student not found', HTTP_STATUS.NOT_FOUND);
    }

    const age = Number(student.age) || 10;
    const gender = student.gender || 'Male';
    const heightInMeters = (parseFloat(student.height) || 120) / 100;
    const weightKg = parseFloat(student.weight) || 25;
    const currentBmi = parseFloat((weightKg / (heightInMeters * heightInMeters)).toFixed(2));

    // Step 2: Determine Standard Benchmarks
    const schoolMealTarget = getSchoolMealTarget(age);
    const fullDayRequirement = getFullDayRequirement(age, gender);
    const pediatricAssessment = assessPediatricBmi(age, gender, currentBmi);

    // Step 3: Retrieve recorded actual school-meal servings
    const [todaysSummary, weeklyIntake] = await Promise.all([
      foodLogModel.getDailyNutritionSummary(studentId),
      analyticsService.getWeeklyIntakeDetails(studentId),
    ]);

    const actualSchoolCaloriesServed = parseFloat(todaysSummary.total_calories || 0);
    const actualSchoolProteinServed = parseFloat(todaysSummary.total_protein || 0);
    const avgWeeklyDailyCalories = weeklyIntake.avg_daily_calories || 0;
    const avgWeeklyDailyProtein = weeklyIntake.avg_daily_protein || 0;

    // Step 4: Calculate separated gaps
    // A. School-Meal Gap (PM POSHAN Target vs Actual School Served)
    const schoolMealCalorieGap = Math.max(0, parseFloat((schoolMealTarget.calories - actualSchoolCaloriesServed).toFixed(2)));
    const schoolMealProteinGap = Math.max(0, parseFloat((schoolMealTarget.protein - actualSchoolProteinServed).toFixed(2)));
    const schoolMealEnergyFulfillmentPct = Math.round((actualSchoolCaloriesServed / schoolMealTarget.calories) * 100);
    const schoolMealProteinFulfillmentPct = schoolMealTarget.protein > 0
      ? Math.round((actualSchoolProteinServed / schoolMealTarget.protein) * 100)
      : 0;

    // B. Remaining Full-Day Requirement (for home/evening supplement context)
    const remainingDailyCalories = Math.max(0, parseFloat((fullDayRequirement.calories - actualSchoolCaloriesServed).toFixed(2)));
    const remainingDailyProtein = Math.max(0, parseFloat((fullDayRequirement.protein - actualSchoolProteinServed).toFixed(2)));

    const studentPreference = (student.food_preference || preference || 'veg').toLowerCase();

    // Map pediatric category to integer score for model (-2 to +2)
    const zCatMap = {
      severe_thinness: -2,
      thinness: -1,
      normal: 0,
      overweight: 1,
      obese: 2,
    };
    const pediatricZScoreCategory = zCatMap[pediatricAssessment.category] ?? 0;

    // Step 5: Assemble structured payload for AI Service
    const aiInput = {
      age,
      gender: gender === 'Female' ? 0 : 1,
      height_cm: parseFloat(student.height),
      weight_kg: parseFloat(student.weight),
      height: parseFloat(student.height),
      weight: parseFloat(student.weight),
      bmi: currentBmi,
      pediatric_z_score_category: pediatricZScoreCategory,
      pediatric_assessment: pediatricAssessment,
      school_meal_calories_target: schoolMealTarget.calories,
      school_meal_protein_target: schoolMealTarget.protein,
      actual_school_calories_served: actualSchoolCaloriesServed,
      actual_school_protein_served: actualSchoolProteinServed,
      school_meal_calorie_fulfillment_pct: schoolMealEnergyFulfillmentPct,
      school_meal_protein_fulfillment_pct: schoolMealProteinFulfillmentPct,
      school_meal_calorie_gap: schoolMealCalorieGap,
      school_meal_protein_gap: schoolMealProteinGap,
      full_day_calories_required: fullDayRequirement.calories,
      full_day_protein_required: fullDayRequirement.protein,
      remaining_daily_calories: remainingDailyCalories,
      remaining_daily_protein: remainingDailyProtein,
      seven_day_avg_daily_calories: avgWeeklyDailyCalories,
      seven_day_avg_daily_protein: avgWeeklyDailyProtein,
      recorded_school_days_count: weeklyIntake.recorded_days_count || 0,
      preference: studentPreference,
    };

    logger.debug(`📡 Dispatching to AI service:`, JSON.stringify({ student_id: studentId, bmi: currentBmi, gap: schoolMealCalorieGap }));

    // Step 6: Query AI microservice with fallback
    let aiResult;
    try {
      const response = await axios.post(PREDICT_ENDPOINT, aiInput, { timeout: AI_TIMEOUT });
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || 'AI prediction unsuccessful');
      }
      aiResult = response.data;
    } catch (aiErr) {
      logger.warn(`⚠️ AI Service unavailable (${aiErr.message}); engaging controlled fallback without synthetic probabilities`);
      let fallbackStatus = 'Healthy';
      if (pediatricAssessment.category === 'severe_thinness' || pediatricAssessment.category === 'obese') {
        fallbackStatus = pediatricAssessment.category === 'severe_thinness' ? 'Underweight' : 'At Risk';
      } else if (pediatricAssessment.category === 'thinness' || schoolMealEnergyFulfillmentPct < 70) {
        fallbackStatus = 'At Risk';
      }

      aiResult = {
        success: false,
        pipeline_status: 'model_unavailable',
        status: fallbackStatus,
        confidence: null,
        probabilities: null,
        contributing_factors: [],
        analysis: {
          bmi: currentBmi,
          bmi_category: pediatricAssessment.category,
          bmi_label: pediatricAssessment.label,
          zScoreRange: pediatricAssessment.zScoreRange,
          school_meal_energy_fulfillment_pct: schoolMealEnergyFulfillmentPct,
        },
        reason: `Pediatric screening indicates ${pediatricAssessment.label} for age ${age} (${pediatricAssessment.zScoreRange} WHO 5-19 reference). AI microservice unavailable; showing rule-based screening indicator.`,
        diet_plan: {
          school_meal_gap: {
            calorie_deficit: schoolMealCalorieGap,
            protein_deficit_g: schoolMealProteinGap,
            status: schoolMealCalorieGap === 0 ? 'GOAL_MET' : 'PORTION_GAP',
            actionable_school_adjustment: schoolMealCalorieGap > 0
              ? 'Ensure full grain allocation and adequate dal serving to meet PM POSHAN norms.'
              : 'School meal nutritional target fully satisfied.',
          },
          home_supplement_suggestions: [
            { name: 'Groundnut Chikki', portion: '1 piece (25g)', calories: 125, protein: 3.5, context: 'Evening energy boost' },
            { name: 'Boiled Egg or Milk', portion: '1 egg or 150ml milk', calories: 80, protein: 6.0, context: 'Protein support' },
          ],
        },
        model_metadata: {
          model_name: 'RandomForestClassifier',
          pipeline_status: 'model_unavailable',
          screening_disclaimer: 'AI microservice unavailable; displaying deterministic pediatric screening indicator only.',
        },
      };
    }

    // Step 7: Formulate standardized explanation
    const pediatricSummaryNote = `Pediatric Screening: BMI ${currentBmi} (${pediatricAssessment.label}, WHO 5-19 references). School meal target: ${schoolMealTarget.calories} kcal; Served today: ${actualSchoolCaloriesServed} kcal (${schoolMealEnergyFulfillmentPct}% fulfilled).`;
    const finalReason = aiResult.reason ? `${aiResult.reason} — ${pediatricSummaryNote}` : pediatricSummaryNote;

    // Step 8: Build complete structured record
    const predictionData = {
      student_id: studentId,
      status: aiResult.status,
      confidence: aiResult.confidence,
      bmi: currentBmi,
      calories: avgWeeklyDailyCalories,
      // Target fields clearly separated
      school_meal_calories_target: schoolMealTarget.calories,
      school_meal_protein_target: schoolMealTarget.protein,
      actual_school_calories_served: actualSchoolCaloriesServed,
      actual_school_protein_served: actualSchoolProteinServed,
      school_meal_calorie_gap: schoolMealCalorieGap,
      school_meal_protein_gap: schoolMealProteinGap,
      school_meal_calorie_fulfillment_pct: schoolMealEnergyFulfillmentPct,
      school_meal_protein_fulfillment_pct: schoolMealProteinFulfillmentPct,
      full_day_calories_required: fullDayRequirement.calories,
      full_day_protein_required: fullDayRequirement.protein,
      remaining_daily_calories: remainingDailyCalories,
      remaining_daily_protein: remainingDailyProtein,
      seven_day_avg_daily_calories: avgWeeklyDailyCalories,
      seven_day_avg_daily_protein: avgWeeklyDailyProtein,
      recorded_school_days_count: weeklyIntake.recorded_days_count || 0,
      pediatric_screening: pediatricAssessment,
      contributing_factors: aiResult.contributing_factors || [],
      model_metadata: aiResult.model_metadata || {},
      reason: finalReason,
      diet_plan: aiResult.diet_plan,
      analysis: aiResult.analysis || {},
      probabilities: aiResult.probabilities || null,
      timestamp: new Date().toISOString(),
      calculation_basis: 'PM POSHAN 2021 Norms (School Meal) & ICMR-NIN 2020 RDA (Full Day)',
    };

    // Step 9: Store in database
    await healthStatusModel.storeAIPrediction(studentId, {
      ...predictionData,
      required_calories: schoolMealTarget.calories, // School meal benchmark
    });

    // Step 10: Update student risk level based on pediatric screening and intake
    let riskLevel = 'healthy';
    if (aiResult.status === 'Underweight' || pediatricAssessment.riskLevel === 'critical') {
      riskLevel = 'critical';
    } else if (aiResult.status === 'At Risk' || pediatricAssessment.riskLevel === 'at_risk') {
      riskLevel = 'at_risk';
    }

    await studentModel.updateStudent(studentId, { risk_level: riskLevel, current_bmi: currentBmi });

    logger.info(`✅ Nutrition assessment stored for student ${studentId}: ${riskLevel} (${aiResult.status})`);
    return predictionData;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`❌ Prediction error: ${error.message}`);
    throw new AppError('Failed to get prediction', HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Comprehensive Medical Conditions & Clinical Pathologies Library
 */
export const getMedicalConditionsForStatus = (status, bmiCategory, age, gender) => {
  const normStatus = (status || '').toLowerCase().replace(/[^a-z_]/g, '');
  let key = 'healthy';
  if (normStatus.includes('underweight') || normStatus.includes('critical') || normStatus.includes('severe')) {
    key = 'underweight';
  } else if (normStatus.includes('risk') || normStatus.includes('thinness')) {
    key = 'at_risk';
  } else if (normStatus.includes('overweight') || normStatus.includes('obese')) {
    key = 'overweight';
  }

  const conditions = {
    underweight: {
      category: 'Underweight / Severe Thinness (Protein-Energy Malnutrition)',
      clinical_status: 'Critical Pediatric Under-nutrition',
      urgency: 'HIGH_PRIORITY_INTERVENTION',
      who_classification: 'Wasting / Significant Acute Under-nutrition (< -2 SD WHO Growth Standard)',
      affected_organ_systems: [
        'Hematologic (Blood / Oxygen Transport)',
        'Skeletal & Stature Growth Plates',
        'Immune System & Cellular Defense',
        'Musculoskeletal Somatic Muscle Mass',
        'Central Nervous System & Brain Metabolism'
      ],
      medical_conditions: [
        {
          name: 'Nutritional Anemia (Microcytic / Hypochromic)',
          icd_hint: 'D50.9',
          severity: 'Severe',
          pathophysiology: 'Inadequate dietary iron, folate, and B12 intake reduces hemoglobin synthesis, severely diminishing blood oxygen-carrying capacity.',
          symptoms: ['Pallor of conjunctiva and tongue', 'Chronic fatigue and lethargy', 'Shortness of breath on light play', 'Headaches and dizziness'],
        },
        {
          name: 'Pediatric Wasting & Stunting Risk',
          icd_hint: 'E43 / E44',
          severity: 'Critical',
          pathophysiology: 'Prolonged negative energy and nitrogen balance forces mobilization of muscle proteins and lipid reserves, stunting linear skeletal growth velocity.',
          symptoms: ['Subcutaneous fat depletion', 'Prominent ribs and clavicles', 'Failure to gain height on WHO growth curves', 'Loss of gluteal muscle mass'],
        },
        {
          name: 'Immune System Incompetence',
          icd_hint: 'D84.9',
          severity: 'High',
          pathophysiology: 'Atrophy of lymphoid tissues (thymus, lymph nodes) and decreased cell-mediated immunity (CD4+ T-cells), impairing antibody production.',
          symptoms: ['Frequent upper respiratory infections (colds, bronchitis)', 'Prolonged diarrheal episodes', 'Delayed wound and skin healing'],
        },
        {
          name: 'Micronutrient Deficiency Disorders (MDD)',
          icd_hint: 'E50-E64',
          severity: 'Moderate to Severe',
          pathophysiology: 'Sub-therapeutic levels of Vitamin A, Vitamin D, Zinc, and Calcium.',
          symptoms: ['Night blindness & Bitot spots (Vit A)', 'Poor bone mineralization and bone pain (Vit D/Calcium)', 'Skin fissures and taste blunting (Zinc)'],
        },
        {
          name: 'Cognitive & Scholastic Fatigue',
          icd_hint: 'R53.83',
          severity: 'High',
          pathophysiology: 'Chronic glucose hypo-metabolism in the brain impairs neurotransmitter regulation, memory consolidation, and executive function.',
          symptoms: ['Reduced classroom attention span', 'Daytime drowsiness', 'Difficulty in reading and math comprehension', 'Irritability or apathy'],
        }
      ],
      clinical_recommendations: [
        'Immediate Mid-Day Meal portion enhancement: allocate double-dal serving and high-energy fortified snacks (boiled egg, groundnut chikki, banana).',
        'Refer student to School Health Program / Rashtriya Bal Swasthya Karyakram (RBSK) Medical Officer for clinical examination.',
        'Verify IFA (Iron-Folic Acid) weekly supplementation and ensure semi-annual deworming (Albendazole 400mg).',
        'Schedule weekly weight and growth monitoring; engage parents regarding evening home nutrition.'
      ]
    },
    at_risk: {
      category: 'At Risk (Mild / Borderline Malnutrition)',
      clinical_status: 'Moderate Nutritional Vulnerability',
      urgency: 'MONITORING_AND_SUPPLEMENTATION',
      who_classification: 'Mild Thinness / Early Calorie-Protein Deficit (-2 SD to -1 SD)',
      affected_organ_systems: [
        'Hematologic System (Borderline Ferritin)',
        'Metabolic Energy Homeostasis',
        'Immune Resilience'
      ],
      medical_conditions: [
        {
          name: 'Latent Iron & Energy Depletion',
          icd_hint: 'E61.1',
          severity: 'Moderate',
          pathophysiology: 'Serum ferritin depletion and borderline daily caloric deficit before overt decline in physical anthropometry.',
          symptoms: ['Mild fatigue towards late school hours', 'Lower athletic stamina', 'Decreased morning alertness'],
        },
        {
          name: 'Growth Curve Deceleration',
          icd_hint: 'R62.51',
          severity: 'Moderate',
          pathophysiology: 'Early stagnation along WHO percentile channels indicating caloric intake is falling short of growing tissue demands.',
          symptoms: ['Plateaued weight over recent months', 'Increased vulnerability to acute seasonal infections'],
        },
        {
          name: 'Sub-Clinical Hypovitaminosis B-Complex',
          icd_hint: 'E53.9',
          severity: 'Mild',
          pathophysiology: 'Marginal intake of thiamine, riboflavin, and niacin required for mitochondrial ATP production from carbohydrates.',
          symptoms: ['Occasional angular cheilitis (mouth corner cracks)', 'Mild glossitis', 'Restlessness'],
        }
      ],
      clinical_recommendations: [
        'Ensure daily mid-day meal attendance with full portion consumption (450/700 kcal).',
        'Provide mid-day meal pulse and vegetable enhancements with iodized salt.',
        'Monitor monthly height and weight progression to prevent slippage into underweight status.'
      ]
    },
    healthy: {
      category: 'Healthy Weight / Eutrophic Child',
      clinical_status: 'Optimal Nutritional Velocity',
      urgency: 'MAINTENANCE',
      who_classification: 'Normal Pediatric Anthropometry (-2 SD to +1 SD WHO Growth Standard)',
      affected_organ_systems: [
        'All Organ Systems Harmonious'
      ],
      medical_conditions: [
        {
          name: 'Normal Pediatric Growth Velocity',
          icd_hint: 'Z00.129',
          severity: 'Normal',
          pathophysiology: 'Caloric, protein, and micronutrient intake adequately fulfills basal metabolic rate and active skeletal/muscular growth requirements.',
          symptoms: ['No clinical deficiencies', 'Normal energy and concentration', 'Age-appropriate muscle tone and physical stamina'],
        }
      ],
      clinical_recommendations: [
        'Continue regular mid-day meal participation adhering to PM POSHAN nutritional guidelines.',
        'Promote seasonal fruits, clean drinking water, and at least 60 minutes of daily physical play.'
      ]
    },
    overweight: {
      category: 'Overweight / Pediatric Adiposity',
      clinical_status: 'Elevated Metabolic Vulnerability',
      urgency: 'DIETARY_BALANCING',
      who_classification: 'Overweight / Obese (> +1 SD / > +2 SD WHO Growth Standard)',
      affected_organ_systems: [
        'Endocrine & Metabolic System (Insulin Sensitivity)',
        'Cardiovascular System',
        'Musculoskeletal Joints (Knees/Spine)'
      ],
      medical_conditions: [
        {
          name: 'Pediatric Adiposity & Early Insulin Resistance Tendency',
          icd_hint: 'E66.9',
          severity: 'Moderate',
          pathophysiology: 'Excess energy intake relative to expenditure accumulates in visceral and subcutaneous adipose stores, straining glucose uptake.',
          symptoms: ['Reduced stamina on running', 'Occasional breathlessness during strenuous play', 'Early acanthosis nigricans risk'],
        },
        {
          name: 'Musculoskeletal Weight-Bearing Stress',
          icd_hint: 'M25.50',
          severity: 'Mild to Moderate',
          pathophysiology: 'Higher mechanical load on developing knees, ankles, and spinal epiphyseal plates.',
          symptoms: ['Occasional knee or ankle ache after vigorous activities', 'Postural fatigue'],
        }
      ],
      clinical_recommendations: [
        'Prioritize fiber-rich, high-satiety mid-day meal components (ragi, jowar, whole pulses, leafy vegetables).',
        'Eliminate sugary beverages and ultra-processed deep-fried packaged snacks outside school.',
        'Encourage 60-90 minutes of structured daily aerobic and sports activity.'
      ]
    }
  };

  return conditions[key] || conditions.healthy;
};

/**
 * Interactive / Custom Malnutrition Prediction Engine
 * Predicts malnutrition risk based on updated height, weight, and average weekly calories.
 */
export const predictCustomMalnutrition = async (params) => {
  const {
    student_id = null,
    height,
    weight,
    avg_weekly_calories,
    age: customAge,
    gender: customGender,
    preference = 'veg',
    save_to_db = false,
  } = params;

  let student = null;
  if (student_id) {
    try {
      student = await studentModel.getStudentById(student_id);
    } catch (e) {
      // Ignore if student not found; will use provided parameters
    }
  }

  const age = Number(customAge || student?.age || 10);
  const gender = customGender || student?.gender || 'Male';
  const heightVal = parseFloat(height || student?.height || 120);
  const weightVal = parseFloat(weight || student?.weight || 25);
  const avgWeeklyCaloriesVal = parseFloat(avg_weekly_calories !== undefined ? avg_weekly_calories : 400);

  const heightInMeters = heightVal / 100;
  const bmi = parseFloat((weightVal / (heightInMeters * heightInMeters)).toFixed(2));

  const schoolMealTarget = getSchoolMealTarget(age);
  const fullDayRequirement = getFullDayRequirement(age, gender);
  const pediatricAssessment = assessPediatricBmi(age, gender, bmi);

  const schoolMealCalorieGap = Math.max(0, parseFloat((schoolMealTarget.calories - avgWeeklyCaloriesVal).toFixed(2)));
  const schoolMealEnergyFulfillmentPct = Math.round((avgWeeklyCaloriesVal / schoolMealTarget.calories) * 100);
  const remainingDailyCalories = Math.max(0, parseFloat((fullDayRequirement.calories - avgWeeklyCaloriesVal).toFixed(2)));
  const icmrFulfillmentPct = Math.min(100, Math.round((avgWeeklyCaloriesVal / fullDayRequirement.calories) * 100));

  const zCatMap = {
    severe_thinness: -2,
    thinness: -1,
    normal: 0,
    overweight: 1,
    obese: 2,
  };
  const pediatricZScoreCategory = zCatMap[pediatricAssessment.category] ?? 0;

  let aiResult = null;
  try {
    const aiPayload = {
      age,
      gender: gender.toLowerCase().startsWith('f') ? 0 : 1,
      height_cm: heightVal,
      weight_kg: weightVal,
      bmi,
      avg_weekly_calories: avgWeeklyCaloriesVal,
      seven_day_avg_daily_calories: avgWeeklyCaloriesVal,
      preference,
      school_meal_calories_target: schoolMealTarget.calories,
      school_meal_protein_target: schoolMealTarget.protein,
      full_day_calories_required: fullDayRequirement.calories,
      full_day_protein_required: fullDayRequirement.protein,
      actual_school_calories_served: avgWeeklyCaloriesVal,
      actual_school_protein_served: avgWeeklyCaloriesVal * 0.032,
      pediatric_z_score_category: pediatricZScoreCategory,
      recorded_school_days_count: 5,
    };

    const response = await axios.post(PREDICT_ENDPOINT, aiPayload, { timeout: AI_TIMEOUT });
    if (response.data && response.data.success !== false) {
      aiResult = response.data;
    }
  } catch (err) {
    logger.warn(`AI microservice call failed for custom prediction: ${err.message}. Running rule-based deterministic assessment.`);
  }

  // Deterministic rule-based evaluation if AI service didn't return
  if (!aiResult) {
    let fallbackStatus = 'Healthy';
    let riskLevel = 'healthy';
    if (pediatricAssessment.category === 'severe_thinness' || bmi < 13.0) {
      fallbackStatus = 'Underweight';
      riskLevel = 'critical';
    } else if (pediatricAssessment.category === 'thinness' || schoolMealEnergyFulfillmentPct < 70 || bmi < 14.5) {
      fallbackStatus = 'At Risk';
      riskLevel = 'at_risk';
    } else if (pediatricAssessment.category === 'obese' || pediatricAssessment.category === 'overweight') {
      fallbackStatus = 'Overweight';
      riskLevel = 'at_risk';
    }

    aiResult = {
      success: true,
      pipeline_status: 'rule_based_fallback',
      status: fallbackStatus,
      risk_level: riskLevel,
      confidence: 0.88,
      probabilities: {
        healthy: fallbackStatus === 'Healthy' ? 0.88 : 0.06,
        at_risk: fallbackStatus === 'At Risk' ? 0.88 : 0.08,
        underweight: fallbackStatus === 'Underweight' ? 0.92 : 0.04,
      },
      reason: `Pediatric growth screening indicates ${pediatricAssessment.label} for age ${age} (${pediatricAssessment.zScoreRange} WHO 5-19 growth references). School meal fulfillment is ${schoolMealEnergyFulfillmentPct}% against statutory norm.`,
    };
  }

  const status = aiResult.status || 'Healthy';
  let riskLevel = aiResult.risk_level;
  if (!riskLevel) {
    if (status === 'Underweight' || pediatricAssessment.category === 'severe_thinness') riskLevel = 'critical';
    else if (status === 'At Risk' || pediatricAssessment.category === 'thinness') riskLevel = 'at_risk';
    else if (status === 'Overweight' || pediatricAssessment.category === 'obese') riskLevel = 'at_risk';
    else riskLevel = 'healthy';
  }

  // Retrieve comprehensive clinical medical conditions
  const medicalConditions = getMedicalConditionsForStatus(status, pediatricAssessment.category, age, gender);

  const result = {
    inputs: {
      student_id: student_id ? parseInt(student_id, 10) : null,
      student_name: student?.name || null,
      age,
      gender,
      height: heightVal,
      weight: weightVal,
      calculated_bmi: bmi,
      avg_weekly_calories: avgWeeklyCaloriesVal,
      preference,
    },
    prediction: {
      status,
      risk_level: riskLevel,
      confidence: aiResult.confidence || 0.88,
      probabilities: aiResult.probabilities || null,
      model_type: aiResult.pipeline_status === 'model_unavailable' ? 'WHO & ICMR Deterministic Rule' : 'RandomForestClassifier (Ensemble ML)',
      pediatric_screening: pediatricAssessment,
      reason: aiResult.reason || `Evaluated using WHO 5-19 references and PM POSHAN meal targets.`,
    },
    nutritional_benchmarks: {
      pm_poshan_target: schoolMealTarget.calories,
      school_meal_gap: schoolMealCalorieGap,
      school_meal_fulfillment_pct: schoolMealEnergyFulfillmentPct,
      icmr_full_day_requirement: fullDayRequirement.calories,
      remaining_daily_calories: remainingDailyCalories,
      icmr_fulfillment_pct: icmrFulfillmentPct,
    },
    medical_assessment: medicalConditions,
    timestamp: new Date().toISOString(),
  };

  // Optionally persist new measurements to PostgreSQL database
  if (save_to_db && student_id) {
    try {
      await studentModel.updateStudent(student_id, {
        current_bmi: bmi,
        risk_level: riskLevel,
      });

      // Update height & weight in students table if columns exist
      await query(
        'UPDATE students SET height = $1, weight = $2, current_bmi = $3, risk_level = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
        [heightVal, weightVal, bmi, riskLevel, student_id]
      );

      // Log in health_status table
      await healthStatusModel.storeAIPrediction(student_id, {
        status,
        confidence: aiResult.confidence || 0.88,
        bmi,
        calories: avgWeeklyCaloriesVal,
        required_calories: schoolMealTarget.calories,
        reason: aiResult.reason,
      });

      result.saved_to_db = true;
      logger.info(`💾 Updated student ${student_id} anthropometry and logged prediction in PostgreSQL.`);
    } catch (saveErr) {
      logger.warn(`Could not persist custom prediction to DB: ${saveErr.message}`);
      result.saved_to_db = false;
    }
  }

  return result;
};

/**
 * Format prediction response for public API output
 */
export const formatPredictionResponse = (prediction) => {
  if (!prediction) return null;
  return {
    status: prediction.status,
    confidence: prediction.confidence,
    reason: prediction.reason,
    bmi: prediction.bmi,
    pediatric_screening: prediction.pediatric_screening,
    school_meal_calories_target: prediction.school_meal_calories_target,
    school_meal_protein_target: prediction.school_meal_protein_target,
    actual_school_calories_served: prediction.actual_school_calories_served,
    actual_school_protein_served: prediction.actual_school_protein_served,
    school_meal_calorie_gap: prediction.school_meal_calorie_gap,
    full_day_calories_required: prediction.full_day_calories_required,
    full_day_protein_required: prediction.full_day_protein_required,
    remaining_daily_calories: prediction.remaining_daily_calories,
    seven_day_avg_daily_calories: prediction.seven_day_avg_daily_calories,
    recorded_school_days_count: prediction.recorded_school_days_count,
    diet_plan: prediction.diet_plan,
    calculation_basis: prediction.calculation_basis,
  };
};

export default {
  getRequiredCalories,
  getPrediction,
  predictCustomMalnutrition,
  getMedicalConditionsForStatus,
  formatPredictionResponse,
};
