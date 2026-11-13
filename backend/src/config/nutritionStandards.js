/**
 * Nutrition Standards & Pediatric Reference Module
 * 
 * Sources:
 * 1. PM POSHAN (Mid-Day Meal Scheme) Mandated Nutritional Norms, Ministry of Education, Govt of India
 *    - Primary (Classes I-V, approx age 6-10): 450 kcal Energy, 12 g Protein
 *    - Upper Primary (Classes VI-VIII, approx age 11-14): 700 kcal Energy, 20 g Protein
 * 2. ICMR - National Institute of Nutrition (NIN) 2020 RDA / EER for Indian Children & Adolescents
 * 3. WHO Growth Reference 5-19 Years (BMI-for-age z-scores for boys and girls)
 * 
 * Note: BMI in school children is an assistive screening indicator, NOT a definitive medical diagnosis.
 */

// ============================================================================
// 1. PM POSHAN (MID-DAY MEAL) MANDATED TARGETS
// ============================================================================
export const PM_POSHAN_TARGETS = {
  PRIMARY: {
    stage: 'Primary',
    classes: 'Classes I - V',
    ageMin: 6,
    ageMax: 10,
    calories: 450,       // kcal minimum energy
    protein: 12.0,       // grams minimum protein
    iron_mg: 4.0,        // reference guideline
    calcium_mg: 150.0,   // reference guideline
    foodGrainsGrams: 100, // rice / wheat
    pulsesGrams: 20,
    vegetablesGrams: 50,
    oilFatGrams: 5,
    description: 'PM POSHAN statutory allocation: 450 kcal and 12g protein per school meal',
  },
  UPPER_PRIMARY: {
    stage: 'Upper Primary',
    classes: 'Classes VI - VIII',
    ageMin: 11,
    ageMax: 14,
    calories: 700,       // kcal minimum energy
    protein: 20.0,       // grams minimum protein
    iron_mg: 6.5,
    calcium_mg: 250.0,
    foodGrainsGrams: 150, // rice / wheat
    pulsesGrams: 30,
    vegetablesGrams: 75,
    oilFatGrams: 7.5,
    description: 'PM POSHAN statutory allocation: 700 kcal and 20g protein per school meal',
  },
  SECONDARY: {
    stage: 'Secondary / Senior',
    classes: 'Classes IX - X / 15+ years',
    ageMin: 15,
    ageMax: 18,
    calories: 750,
    protein: 22.0,
    iron_mg: 8.0,
    calcium_mg: 300.0,
    foodGrainsGrams: 150,
    pulsesGrams: 35,
    vegetablesGrams: 100,
    oilFatGrams: 10,
    description: 'Institutional reference target for secondary students',
  },
};

/**
 * Get school-meal target based on child age
 * @param {number} age - Student age in years
 * @returns {object} PM POSHAN target specification
 */
export const getSchoolMealTarget = (age) => {
  const numericAge = Number(age) || 10;
  if (numericAge <= 10) {
    return { ...PM_POSHAN_TARGETS.PRIMARY };
  } else if (numericAge <= 14) {
    return { ...PM_POSHAN_TARGETS.UPPER_PRIMARY };
  }
  return { ...PM_POSHAN_TARGETS.SECONDARY };
};

// ============================================================================
// 2. ICMR - NIN 2020 RECOMMENDED DIETARY ALLOWANCES (FULL-DAY REQUIREMENTS)
// ============================================================================
export const ICMR_DAILY_REQUIREMENTS = {
  CHILD_6_9: {
    ageRange: '6-9 years',
    ageMin: 6,
    ageMax: 9,
    gender: 'Both',
    calories: 1500, // kcal / day (average EER)
    protein: 18.0,  // g / day
    iron_mg: 15.0,  // mg / day (ICMR-NIN 2020 RDA)
    calcium_mg: 550.0, // mg / day
  },
  BOY_10_12: {
    ageRange: '10-12 years',
    ageMin: 10,
    ageMax: 12,
    gender: 'Male',
    calories: 2220,
    protein: 32.0,
    iron_mg: 16.0,
    calcium_mg: 850.0,
  },
  GIRL_10_12: {
    ageRange: '10-12 years',
    ageMin: 10,
    ageMax: 12,
    gender: 'Female',
    calories: 2060,
    protein: 33.0,
    iron_mg: 15.0,
    calcium_mg: 850.0,
  },
  BOY_13_15: {
    ageRange: '13-15 years',
    ageMin: 13,
    ageMax: 15,
    gender: 'Male',
    calories: 2860,
    protein: 45.0,
    iron_mg: 22.0,
    calcium_mg: 1000.0,
  },
  GIRL_13_15: {
    ageRange: '13-15 years',
    ageMin: 13,
    ageMax: 15,
    gender: 'Female',
    calories: 2400,
    protein: 43.0,
    iron_mg: 27.0,
    calcium_mg: 1000.0,
  },
  BOY_16_PLUS: {
    ageRange: '16+ years',
    ageMin: 16,
    ageMax: 18,
    gender: 'Male',
    calories: 3320,
    protein: 54.0,
    iron_mg: 26.0,
    calcium_mg: 1000.0,
  },
  GIRL_16_PLUS: {
    ageRange: '16+ years',
    ageMin: 16,
    ageMax: 18,
    gender: 'Female',
    calories: 2500,
    protein: 46.0,
    iron_mg: 29.0,
    calcium_mg: 1000.0,
  },
};

/**
 * Get estimated full-day nutritional requirements per ICMR-NIN 2020 RDA
 * @param {number} age - Student age in years
 * @param {string|number} gender - 'Female'/0 or 'Male'/1
 * @returns {object} { calories, protein, ageRange, gender }
 */
export const getFullDayRequirement = (age, gender = 'Male') => {
  const numericAge = Number(age) || 10;
  const isFemale =
    gender === 0 ||
    gender === '0' ||
    (typeof gender === 'string' && (gender.toLowerCase() === 'female' || gender.toLowerCase() === 'f'));

  if (numericAge <= 9) {
    return { ...ICMR_DAILY_REQUIREMENTS.CHILD_6_9 };
  } else if (numericAge <= 12) {
    return isFemale ? { ...ICMR_DAILY_REQUIREMENTS.GIRL_10_12 } : { ...ICMR_DAILY_REQUIREMENTS.BOY_10_12 };
  } else if (numericAge <= 15) {
    return isFemale ? { ...ICMR_DAILY_REQUIREMENTS.GIRL_13_15 } : { ...ICMR_DAILY_REQUIREMENTS.BOY_13_15 };
  } else {
    return isFemale ? { ...ICMR_DAILY_REQUIREMENTS.GIRL_16_PLUS } : { ...ICMR_DAILY_REQUIREMENTS.BOY_16_PLUS };
  }
};

// ============================================================================
// 3. WHO PEDIATRIC GROWTH REFERENCE 5-19 YEARS (BMI-FOR-AGE Z-SCORES)
// ============================================================================
// Cutoffs:
// Severe Thinness: < -3 SD
// Thinness (Underweight): < -2 SD
// Healthy / Normal: -2 SD to +1 SD (approx 3rd to 85th percentile)
// Overweight: > +1 SD (equivalent to adult BMI 25 at 19 years)
// Obesity: > +2 SD (equivalent to adult BMI 30 at 19 years)
export const WHO_PEDIATRIC_BMI_CUTOFFS = {
  male: {
    6:  { sdMinus3: 12.1, sdMinus2: 13.0, median: 15.3, sdPlus1: 16.8, sdPlus2: 18.5 },
    7:  { sdMinus3: 12.3, sdMinus2: 13.1, median: 15.5, sdPlus1: 17.2, sdPlus2: 19.2 },
    8:  { sdMinus3: 12.4, sdMinus2: 13.3, median: 15.8, sdPlus1: 17.7, sdPlus2: 20.1 },
    9:  { sdMinus3: 12.6, sdMinus2: 13.6, median: 16.2, sdPlus1: 18.3, sdPlus2: 21.1 },
    10: { sdMinus3: 12.8, sdMinus2: 14.0, median: 16.6, sdPlus1: 19.0, sdPlus2: 22.2 },
    11: { sdMinus3: 13.2, sdMinus2: 14.5, median: 17.2, sdPlus1: 19.9, sdPlus2: 23.5 },
    12: { sdMinus3: 13.6, sdMinus2: 15.0, median: 17.8, sdPlus1: 20.8, sdPlus2: 24.8 },
    13: { sdMinus3: 14.2, sdMinus2: 15.5, median: 18.5, sdPlus1: 21.8, sdPlus2: 25.9 },
    14: { sdMinus3: 14.7, sdMinus2: 16.0, median: 19.2, sdPlus1: 22.7, sdPlus2: 26.9 },
    15: { sdMinus3: 15.3, sdMinus2: 16.6, median: 19.9, sdPlus1: 23.6, sdPlus2: 27.7 },
    16: { sdMinus3: 15.8, sdMinus2: 17.1, median: 20.5, sdPlus1: 24.4, sdPlus2: 28.9 },
  },
  female: {
    6:  { sdMinus3: 11.8, sdMinus2: 12.7, median: 15.2, sdPlus1: 16.9, sdPlus2: 18.8 },
    7:  { sdMinus3: 12.0, sdMinus2: 12.9, median: 15.4, sdPlus1: 17.4, sdPlus2: 19.7 },
    8:  { sdMinus3: 12.2, sdMinus2: 13.1, median: 15.7, sdPlus1: 17.9, sdPlus2: 20.6 },
    9:  { sdMinus3: 12.4, sdMinus2: 13.5, median: 16.1, sdPlus1: 18.6, sdPlus2: 21.7 },
    10: { sdMinus3: 12.8, sdMinus2: 13.9, median: 16.6, sdPlus1: 19.3, sdPlus2: 22.8 },
    11: { sdMinus3: 13.2, sdMinus2: 14.4, median: 17.3, sdPlus1: 20.2, sdPlus2: 24.1 },
    12: { sdMinus3: 13.7, sdMinus2: 14.9, median: 18.0, sdPlus1: 21.3, sdPlus2: 25.4 },
    13: { sdMinus3: 14.3, sdMinus2: 15.4, median: 18.8, sdPlus1: 22.3, sdPlus2: 26.6 },
    14: { sdMinus3: 14.7, sdMinus2: 16.0, median: 19.6, sdPlus1: 23.3, sdPlus2: 27.7 },
    15: { sdMinus3: 15.1, sdMinus2: 16.4, median: 20.2, sdPlus1: 24.0, sdPlus2: 28.6 },
    16: { sdMinus3: 15.3, sdMinus2: 16.8, median: 20.7, sdPlus1: 24.7, sdPlus2: 29.3 },
  },
};

/**
 * Assess a child's BMI against WHO 5-19 Growth References
 * Treats BMI strictly as an assistive screening indicator, NOT clinical diagnosis.
 * 
 * @param {number} age - Student age in years (6 to 16)
 * @param {string|number} gender - Student gender ('Female'/0 or 'Male'/1)
 * @param {number} bmi - Calculated BMI (weight_kg / height_m^2)
 * @returns {object} Pediatric assessment result
 */
export const assessPediatricBmi = (age, gender, bmi) => {
  const numericAge = Math.round(Number(age));
  const numericBmi = parseFloat(Number(bmi).toFixed(2));

  if (!numericBmi || isNaN(numericBmi) || numericBmi <= 0) {
    return {
      bmi: 0,
      category: 'unavailable',
      label: 'Data Unavailable',
      riskLevel: 'unknown',
      standardsSource: 'WHO Growth Reference (5-19 years)',
      isScreeningOnly: true,
      clinicalNote: 'Valid height and weight are required for screening.',
    };
  }

  const isFemale =
    gender === 0 ||
    gender === '0' ||
    (typeof gender === 'string' && (gender.toLowerCase() === 'female' || gender.toLowerCase() === 'f'));
  const sexKey = isFemale ? 'female' : 'male';

  const lookupTable = WHO_PEDIATRIC_BMI_CUTOFFS[sexKey];
  const refAge = Math.min(Math.max(numericAge, 6), 16);
  const cutoffs = lookupTable[refAge];

  if (!cutoffs) {
    return {
      bmi: numericBmi,
      category: 'pending_validation',
      label: 'Pending Pediatric Validation',
      riskLevel: 'unknown',
      standardsSource: 'WHO Growth Reference (5-19 years)',
      isScreeningOnly: true,
      clinicalNote: 'Pediatric reference data unavailable for this age range.',
    };
  }

  let category = 'normal';
  let label = 'Healthy Weight';
  let riskLevel = 'healthy';
  let zScoreRange = '-2 SD to +1 SD';

  if (numericBmi < cutoffs.sdMinus3) {
    category = 'severe_thinness';
    label = 'Severe Thinness';
    riskLevel = 'critical';
    zScoreRange = '< -3 SD';
  } else if (numericBmi < cutoffs.sdMinus2) {
    category = 'thinness';
    label = 'Thinness / Underweight';
    riskLevel = 'at_risk';
    zScoreRange = '-3 SD to -2 SD';
  } else if (numericBmi > cutoffs.sdPlus2) {
    category = 'obese';
    label = 'Obese for Age';
    riskLevel = 'critical';
    zScoreRange = '> +2 SD';
  } else if (numericBmi > cutoffs.sdPlus1) {
    category = 'overweight';
    label = 'Overweight for Age';
    riskLevel = 'at_risk';
    zScoreRange = '+1 SD to +2 SD';
  }

  return {
    bmi: numericBmi,
    category,
    label,
    riskLevel,
    zScoreRange,
    referenceAge: refAge,
    gender: isFemale ? 'Female' : 'Male',
    medianBmi: cutoffs.median,
    thinnessThreshold: cutoffs.sdMinus2,
    overweightThreshold: cutoffs.sdPlus1,
    standardsSource: 'WHO Growth Reference for School-Aged Children (5-19 years)',
    isScreeningOnly: true,
    clinicalNote: 'Screening indicator only. Not a medical diagnosis. Growth velocity and clinical evaluation take precedence.',
  };
};

// ============================================================================
// 4. VERIFIED FOOD COMPOSITION (INDIAN FOOD COMPOSITION TABLES / ICMR)
// ============================================================================
// Nutrient values per 100g as served/cooked
export const VERIFIED_FOOD_COMPOSITION = {
  rice: {
    name: 'Cooked White Rice',
    caloriesPer100g: 130.0,
    proteinPer100g: 2.7,
    carbsPer100g: 28.0,
    fatsPer100g: 0.3,
    ironMgPer100g: 0.4,
    calciumMgPer100g: 10.0,
    category: 'grain',
    standardPortionGrams: 100.0,
    standardPortionDesc: '1 bowl (100g)',
    isVegetarian: true,
    isEggitarian: true,
    isVegan: true,
  },
  dal: {
    name: 'Cooked Dal (Lentil Sambar/Curry)',
    caloriesPer100g: 105.0,
    proteinPer100g: 6.5,
    carbsPer100g: 16.0,
    fatsPer100g: 1.8,
    ironMgPer100g: 1.8,
    calciumMgPer100g: 35.0,
    category: 'pulse',
    standardPortionGrams: 80.0,
    standardPortionDesc: '1 katori (80g)',
    isVegetarian: true,
    isEggitarian: true,
    isVegan: true,
  },
  vegetables: {
    name: 'Cooked Mixed Vegetables',
    caloriesPer100g: 65.0,
    proteinPer100g: 2.0,
    carbsPer100g: 8.5,
    fatsPer100g: 2.5,
    ironMgPer100g: 1.2,
    calciumMgPer100g: 45.0,
    category: 'vegetable',
    standardPortionGrams: 75.0,
    standardPortionDesc: '1 katori (75g)',
    isVegetarian: true,
    isEggitarian: true,
    isVegan: true,
  },
  egg: {
    name: 'Boiled Egg',
    caloriesPer100g: 155.0,
    proteinPer100g: 12.6,
    carbsPer100g: 1.1,
    fatsPer100g: 10.6,
    ironMgPer100g: 1.8,
    calciumMgPer100g: 50.0,
    category: 'egg',
    standardPortionGrams: 50.0,
    standardPortionDesc: '1 whole boiled egg (50g)',
    isVegetarian: false,
    isEggitarian: true,
    isVegan: false,
  },
  milk: {
    name: 'Pasteurized Whole Milk',
    caloriesPer100g: 65.0,
    proteinPer100g: 3.2,
    carbsPer100g: 4.8,
    fatsPer100g: 3.8,
    ironMgPer100g: 0.1,
    calciumMgPer100g: 120.0,
    category: 'dairy',
    standardPortionGrams: 150.0,
    standardPortionDesc: '1 glass / cup (150ml)',
    isVegetarian: true,
    isEggitarian: true,
    isVegan: false,
  },
  curd: {
    name: 'Fresh Curd / Dahi',
    caloriesPer100g: 60.0,
    proteinPer100g: 3.5,
    carbsPer100g: 4.4,
    fatsPer100g: 3.0,
    ironMgPer100g: 0.1,
    calciumMgPer100g: 130.0,
    category: 'dairy',
    standardPortionGrams: 100.0,
    standardPortionDesc: '1 small bowl (100g)',
    isVegetarian: true,
    isEggitarian: true,
    isVegan: false,
  },
  chikki: {
    name: 'Groundnut Chikki',
    caloriesPer100g: 500.0,
    proteinPer100g: 14.0,
    carbsPer100g: 55.0,
    fatsPer100g: 25.0,
    ironMgPer100g: 2.5,
    calciumMgPer100g: 80.0,
    category: 'snack',
    standardPortionGrams: 25.0,
    standardPortionDesc: '1 piece / bar (25g)',
    isVegetarian: true,
    isEggitarian: true,
    isVegan: true,
  },
  ragi_mudde: {
    name: 'Cooked Ragi Mudde',
    caloriesPer100g: 110.0,
    proteinPer100g: 2.5,
    carbsPer100g: 23.0,
    fatsPer100g: 0.5,
    ironMgPer100g: 1.5,
    calciumMgPer100g: 115.0,
    category: 'grain',
    standardPortionGrams: 100.0,
    standardPortionDesc: '1 small ball (100g)',
    isVegetarian: true,
    isEggitarian: true,
    isVegan: true,
  },
  roasted_chana: {
    name: 'Roasted Bengal Gram (Chana)',
    caloriesPer100g: 380.0,
    proteinPer100g: 18.0,
    carbsPer100g: 58.0,
    fatsPer100g: 5.0,
    ironMgPer100g: 6.5,
    calciumMgPer100g: 60.0,
    category: 'pulse',
    standardPortionGrams: 30.0,
    standardPortionDesc: '1 handful (30g)',
    isVegetarian: true,
    isEggitarian: true,
    isVegan: true,
  },
  green_leafy_veg: {
    name: 'Cooked Green Leafy Vegetables (Palak/Methi)',
    caloriesPer100g: 45.0,
    proteinPer100g: 3.0,
    carbsPer100g: 5.0,
    fatsPer100g: 0.5,
    ironMgPer100g: 3.5,
    calciumMgPer100g: 180.0,
    category: 'vegetable',
    standardPortionGrams: 75.0,
    standardPortionDesc: '1 katori (75g)',
    isVegetarian: true,
    isEggitarian: true,
    isVegan: true,
  },
  seasonal_fruit: {
    name: 'Seasonal Fruit (Banana / Guava)',
    caloriesPer100g: 75.0,
    proteinPer100g: 1.1,
    carbsPer100g: 18.0,
    fatsPer100g: 0.3,
    ironMgPer100g: 0.5,
    calciumMgPer100g: 20.0,
    category: 'fruit',
    standardPortionGrams: 100.0,
    standardPortionDesc: '1 medium fruit (100g)',
    isVegetarian: true,
    isEggitarian: true,
    isVegan: true,
  },
  sprouts: {
    name: 'Steamed Moong Sprouts',
    caloriesPer100g: 80.0,
    proteinPer100g: 7.0,
    carbsPer100g: 12.0,
    fatsPer100g: 0.4,
    ironMgPer100g: 1.4,
    calciumMgPer100g: 40.0,
    category: 'pulse',
    standardPortionGrams: 50.0,
    standardPortionDesc: '1 small bowl (50g)',
    isVegetarian: true,
    isEggitarian: true,
    isVegan: true,
  },
};

/**
 * Calculate nutrients from actual measured grams served
 * Formula: (Nutrient per 100g * actual measured grams) / 100
 * 
 * @param {string} foodItemKey - Key of the food item (e.g. 'rice', 'dal')
 * @param {number} measuredGrams - Actual weight in grams
 * @returns {object} { calories, protein, carbs, fats, iron_mg, calcium_mg, food_item, measured_grams }
 */
export const calculateServedNutrients = (foodItemKey, measuredGrams) => {
  const grams = Math.max(0, parseFloat(measuredGrams) || 0);
  const normalizedKey = (foodItemKey || 'rice').toLowerCase().trim();

  // Match or fallback to standard cooked rice
  let item = VERIFIED_FOOD_COMPOSITION[normalizedKey];
  if (!item) {
    if (normalizedKey.includes('rice')) item = VERIFIED_FOOD_COMPOSITION.rice;
    else if (normalizedKey.includes('dal') || normalizedKey.includes('sambar')) item = VERIFIED_FOOD_COMPOSITION.dal;
    else if (normalizedKey.includes('leaf') || normalizedKey.includes('palak') || normalizedKey.includes('spinach')) item = VERIFIED_FOOD_COMPOSITION.green_leafy_veg;
    else if (normalizedKey.includes('veg')) item = VERIFIED_FOOD_COMPOSITION.vegetables;
    else if (normalizedKey.includes('egg')) item = VERIFIED_FOOD_COMPOSITION.egg;
    else if (normalizedKey.includes('milk')) item = VERIFIED_FOOD_COMPOSITION.milk;
    else if (normalizedKey.includes('curd') || normalizedKey.includes('dahi') || normalizedKey.includes('yogurt')) item = VERIFIED_FOOD_COMPOSITION.curd;
    else if (normalizedKey.includes('chikki') || normalizedKey.includes('peanut')) item = VERIFIED_FOOD_COMPOSITION.chikki;
    else if (normalizedKey.includes('ragi')) item = VERIFIED_FOOD_COMPOSITION.ragi_mudde;
    else if (normalizedKey.includes('chana') || normalizedKey.includes('gram')) item = VERIFIED_FOOD_COMPOSITION.roasted_chana;
    else if (normalizedKey.includes('fruit') || normalizedKey.includes('banana') || normalizedKey.includes('guava')) item = VERIFIED_FOOD_COMPOSITION.seasonal_fruit;
    else if (normalizedKey.includes('sprout')) item = VERIFIED_FOOD_COMPOSITION.sprouts;
    else item = VERIFIED_FOOD_COMPOSITION.rice; // safe default
  }

  const factor = grams / 100.0;
  return {
    food_item: item.name,
    food_key: normalizedKey,
    measured_grams: grams,
    calories: parseFloat((item.caloriesPer100g * factor).toFixed(2)),
    protein: parseFloat((item.proteinPer100g * factor).toFixed(2)),
    carbs: parseFloat((item.carbsPer100g * factor).toFixed(2)),
    fats: parseFloat((item.fatsPer100g * factor).toFixed(2)),
    iron_mg: item.ironMgPer100g ? parseFloat((item.ironMgPer100g * factor).toFixed(2)) : 0,
    calcium_mg: item.calciumMgPer100g ? parseFloat((item.calciumMgPer100g * factor).toFixed(2)) : 0,
    is_served_record: true,
    is_confirmed_consumed: false, // Clearly distinguish served vs consumed
  };
};

export default {
  PM_POSHAN_TARGETS,
  getSchoolMealTarget,
  ICMR_DAILY_REQUIREMENTS,
  getFullDayRequirement,
  WHO_PEDIATRIC_BMI_CUTOFFS,
  assessPediatricBmi,
  VERIFIED_FOOD_COMPOSITION,
  calculateServedNutrients,
};

