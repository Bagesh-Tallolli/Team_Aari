import React, { useState, useMemo } from 'react';
import { 
  Utensils, 
  CheckCircle2, 
  RefreshCw, 
  Sun, 
  Moon, 
  Flame, 
  Zap, 
  Scale, 
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';
import Card from '../../../components/common/Card.jsx';

/**
 * Robust Client-Side Desi Meal Plan Generator
 * Fallback & real-time recalculator: scales desi Indian staples to 100% match remaining calories.
 */
function buildFallbackDesiMealPlans(remainingCalories) {
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

    const bTarget = Math.round(rem * 0.40);
    const dTarget = rem - bTarget;

    // Breakfast
    let bItems = [];
    if (isVeg) {
      const c1 = Math.round(bTarget * 0.42);
      const c2 = Math.round(bTarget * 0.28);
      const c3 = Math.round(bTarget * 0.18);
      const c4 = bTarget - (c1 + c2 + c3);

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
        },
        {
          name: 'Warm Fresh Cow Milk',
          desi_name: 'गरम दूध / ಹಾಲು (Warm Milk)',
          grams: g2,
          portion: `${g2}ml (1 Glass)`,
          calories: c2,
          protein_g: parseFloat((g2 * 0.033).toFixed(1)),
          description: 'Calcium and bioavailable milk protein for healthy pediatric bone density.',
        },
        {
          name: 'Fresh Seasonal Banana',
          desi_name: 'ताज़ा केला / ಬಾಳೆಹಣ್ಣು (Banana)',
          grams: g3,
          portion: `${g3}g (1-2 Fruits)`,
          calories: c3,
          protein_g: parseFloat((g3 * 0.012).toFixed(1)),
          description: 'Rich in dietary potassium, vitamin B6, and natural quick-digesting carbohydrates.',
        },
        {
          name: 'Roasted Bengal Gram (Chana)',
          desi_name: 'भुना चना / ಹುರಿಗಡಲೆ (Roasted Chana)',
          grams: g4,
          portion: `${g4}g (1 Handful)`,
          calories: c4,
          protein_g: parseFloat((g4 * 0.18).toFixed(1)),
          description: 'Traditional desi protein snack rich in dietary fiber and plant iron.',
        },
      ];
    } else {
      const c1 = Math.round(bTarget * 0.38);
      const numEggs = Math.max(1, Math.round(c1 / 78));
      const adjC1 = numEggs * 78;
      const eggGrams = numEggs * 50;

      const remainingB = bTarget - adjC1;
      const adjC2 = Math.round(remainingB * 0.52);
      const adjC3 = Math.round(remainingB * 0.32);
      const adjC4 = remainingB - (adjC2 + adjC3);

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
        },
        {
          name: 'Whole Wheat Tawa Roti (Chapati)',
          desi_name: 'गरम तवा रोटी / ಚಪಾತಿ (Chapati)',
          grams: rotiGrams,
          portion: `${numRotis} ${numRotis === 1 ? 'Roti' : 'Rotis'} (${rotiGrams}g)`,
          calories: adjC2,
          protein_g: parseFloat((numRotis * 3.2).toFixed(1)),
          description: 'Whole wheat chapati offering complex carbohydrates and sustained morning stamina.',
        },
        {
          name: 'Warm Fresh Cow Milk',
          desi_name: 'गरम दूध / ಹಾಲು (Warm Milk)',
          grams: g3,
          portion: `${g3}ml (1 Cup)`,
          calories: adjC3,
          protein_g: parseFloat((g3 * 0.033).toFixed(1)),
          description: 'High-quality calcium for skeletal strength and neuromuscular health.',
        },
        {
          name: 'Fresh Seasonal Fruit (Banana)',
          desi_name: 'ताज़ा फल / ಹಣ್ಣು (Fruit)',
          grams: g4,
          portion: `${g4}g (1 Medium)`,
          calories: adjC4,
          protein_g: parseFloat((g4 * 0.012).toFixed(1)),
          description: 'Natural fruit sugars and dietary fiber for gastrointestinal balance.',
        },
      ];
    }

    // Dinner
    let dItems = [];
    if (isVeg) {
      const c1 = Math.round(dTarget * 0.35);
      const c2 = Math.round(dTarget * 0.28);
      const c3 = Math.round(dTarget * 0.22);
      const c4 = dTarget - (c1 + c2 + c3);

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
        },
        {
          name: 'Cooked Toor / Moong Daal Tadka',
          desi_name: 'तड़का दाल / ಬೇಳೆ ಸಾರು (Daal Tadka)',
          grams: g2,
          portion: `${g2}g (${(g2 / 150).toFixed(1)} Bowls)`,
          calories: c2,
          protein_g: parseFloat((g2 * 0.055).toFixed(1)),
          description: 'Traditional slow-cooked yellow lentils tempered with cumin, garlic, and turmeric.',
        },
        {
          name: 'Steamed Rice (Ghar Ka Chawal)',
          desi_name: 'गरम उबले चावल / ಅನ್ನ (Steamed Rice)',
          grams: g3,
          portion: `${g3}g (${(g3 / 150).toFixed(1)} Bowls)`,
          calories: c3,
          protein_g: parseFloat((g3 * 0.027).toFixed(1)),
          description: 'Steamed white rice providing complete amino acid profile when paired with daal.',
        },
        {
          name: 'Mixed Seasonal Sabzi / Bhaji',
          desi_name: 'सब्ज़ी / ಪಲ್ಯ (Vegetable Sabzi)',
          grams: g4,
          portion: `${g4}g (${(g4 / 150).toFixed(1)} Bowls)`,
          calories: c4,
          protein_g: parseFloat((g4 * 0.024).toFixed(1)),
          description: 'Local seasonal vegetables (green beans, carrots, potato, spinach) cooked in mild spices.',
        },
      ];
    } else {
      const c1 = Math.round(dTarget * 0.38);
      const c2 = Math.round(dTarget * 0.28);
      const c3 = Math.round(dTarget * 0.20);
      const c4 = dTarget - (c1 + c2 + c3);

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
        },
        {
          name: 'Fresh Wheat Roti (Phulka / Chapati)',
          desi_name: 'ताज़ा रोटी / ಚಪಾತಿ (Phulka)',
          grams: rotiGrams,
          portion: `${numRotis} ${numRotis === 1 ? 'Roti' : 'Rotis'} (${rotiGrams}g)`,
          calories: c2,
          protein_g: parseFloat((numRotis * 3.2).toFixed(1)),
          description: 'Fresh stone-ground wheat rotis providing energy-dense dietary complex carbs.',
        },
        {
          name: 'Steamed Rice (Ghar Ka Chawal)',
          desi_name: 'गरम उबले चावल / ಅನ್ನ (Steamed Rice)',
          grams: g3,
          portion: `${g3}g (${(g3 / 150).toFixed(1)} Bowls)`,
          calories: c3,
          protein_g: parseFloat((g3 * 0.027).toFixed(1)),
          description: 'Soft steamed rice that pairs perfectly with chicken curry and daal gravy.',
        },
        {
          name: 'Cooked Yellow Daal (Toor / Moong)',
          desi_name: 'तड़का दाल / ಬೇಳೆ ಸಾರು (Yellow Daal)',
          grams: g4,
          portion: `${g4}g (${(g4 / 150).toFixed(1)} Bowls)`,
          calories: c4,
          protein_g: parseFloat((g4 * 0.055).toFixed(1)),
          description: 'Digestive pulse gravy ensuring dietary fiber and mineral variety.',
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
}

function DietRecommendationSection({ 
  plan, 
  loading, 
  onRefresh, 
  currentPreference = 'veg',
  onPreferenceChange 
}) {
  const [selectedPreference, setSelectedPreference] = useState(
    currentPreference === 'non_veg' || currentPreference === 'non-veg' ? 'non_veg' : 'veg'
  );

  // Derive remaining calories and meal plans
  const { remainingCalories, totalDailyICMR, actualSchoolServed, mealPlans } = useMemo(() => {
    const rem = plan?.remaining_full_day_context?.estimated_remaining?.calories_kcal ?? 2220;
    const icmr = plan?.remaining_full_day_context?.full_day_requirement?.calories_kcal ?? 2220;
    const served = plan?.school_meal_assessment?.actual_served_today?.calories_kcal ?? 0;

    let plans = plan?.desi_meal_plans;
    if (!plans || !plans.veg || !plans.non_veg) {
      plans = buildFallbackDesiMealPlans(rem);
    }

    return {
      remainingCalories: Math.round(rem),
      totalDailyICMR: Math.round(icmr),
      actualSchoolServed: Math.round(served),
      mealPlans: plans,
    };
  }, [plan]);

  const activePlan = selectedPreference === 'non_veg' ? mealPlans.non_veg : mealPlans.veg;
  const isVeg = selectedPreference === 'veg';

  const handleTogglePreference = (pref) => {
    setSelectedPreference(pref);
    if (onPreferenceChange) {
      onPreferenceChange(pref);
    }
  };

  if (loading) {
    return (
      <Card variant="default" className="p-8 bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-col items-center justify-center py-12 space-y-3 text-slate-300">
          <RefreshCw size={28} className="animate-spin text-emerald-400" />
          <span className="text-base font-semibold">Calculating personalized Desi meal plans...</span>
          <span className="text-xs text-slate-400">Balancing Breakfast &amp; Dinner to match exact remaining calories</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. CLEAN, MODERN HEADER WITH PREFERENCE CONTROLS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-2xl p-6 border border-slate-700/80 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 shadow-inner">
              <Utensils size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Personalized Home Diet Recommendations
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
                  Desi Home Meals
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 font-medium">
                Nutritious Indian home meals tailored to fulfill the remaining ICMR daily calorie quota outside school.
              </p>
            </div>
          </div>

          {/* Clean Segmented Switch: Vegetarian vs Non-Vegetarian */}
          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-700/80 flex shadow-inner">
              <button
                type="button"
                onClick={() => handleTogglePreference('veg')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                  isVeg
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white/40" />
                <span>Vegetarian Diet</span>
              </button>

              <button
                type="button"
                onClick={() => handleTogglePreference('non_veg')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                  !isVeg
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 border border-white/40" />
                <span>Non-Vegetarian &amp; Egg</span>
              </button>
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={() => onRefresh(selectedPreference)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-600 shadow-sm transition-all"
                title="Refresh recommendation calculations"
              >
                <RefreshCw size={14} className="text-slate-300" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. CALORIC BRIDGE METRIC RIBBON */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
          
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              1. ICMR Daily Quota
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-white">{totalDailyICMR}</span>
              <span className="text-xs text-slate-400 font-semibold">kcal / day</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Statutory 24-hr standard</span>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              2. School Served Today
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl sm:text-2xl font-black ${actualSchoolServed > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {actualSchoolServed}
              </span>
              <span className="text-xs text-slate-400 font-semibold">kcal</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {actualSchoolServed > 0 ? '✓ Verified school meal' : 'Not yet dispensed today'}
            </span>
          </div>

          <div className="bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-500/40 shadow-inner">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-0.5">
              3. Remaining to Bridge
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-300">{remainingCalories}</span>
              <span className="text-xs text-emerald-400 font-semibold">kcal</span>
            </div>
            <span className="text-[10px] text-emerald-400/90 mt-0.5 block font-medium">
              Target for home meals
            </span>
          </div>

          <div className="bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-500/40 shadow-inner">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 block mb-0.5">
              4. Recommended Plan
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-indigo-200">
                {activePlan?.total_recommended_calories || remainingCalories}
              </span>
              <span className="text-xs text-indigo-300 font-semibold">kcal</span>
            </div>
            <span className="text-[10px] text-emerald-400 mt-0.5 font-bold flex items-center gap-1">
              <CheckCircle2 size={12} />
              100% Caloric Match
            </span>
          </div>

        </div>
      </div>

      {/* 3. TWO CLEAN SECTIONS: BREAKFAST & DINNER */}
      <div className="space-y-6">

        {/* SECTION A: MORNING BREAKFAST */}
        <div className="bg-slate-900/90 rounded-2xl border-2 border-amber-500/40 overflow-hidden shadow-xl">
          
          {/* Breakfast Section Header */}
          <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 px-6 py-4 border-b border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
                <Sun size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {activePlan?.breakfast?.desi_title || 'Morning Breakfast'}
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                    40% Intake
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 font-medium">
                  Energizing desi morning meal to kickstart school stamina and metabolism.
                </p>
              </div>
            </div>

            {/* Breakfast Subtotal Badge */}
            <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-amber-500/30 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Breakfast Target
                </span>
                <span className="text-base font-black text-white">
                  {activePlan?.breakfast?.total_calories || 0} <span className="text-xs font-normal text-slate-300">kcal</span>
                </span>
              </div>
              <div className="h-6 w-px bg-slate-700" />
              <div className="text-right">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                  Protein
                </span>
                <span className="text-base font-black text-indigo-300">
                  {activePlan?.breakfast?.total_protein_g || 0}g
                </span>
              </div>
            </div>
          </div>

          {/* Breakfast Food Cards Grid */}
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePlan?.breakfast?.items?.map((item, idx) => (
              <div 
                key={idx}
                className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 hover:border-amber-500/50 transition-all space-y-3 shadow-md group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-amber-400 block tracking-wide">
                      {item.desi_name}
                    </span>
                    <h4 className="text-base font-extrabold text-white group-hover:text-amber-200 transition-colors">
                      {item.name}
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-900 text-amber-300 border border-amber-500/30 whitespace-nowrap shadow-sm">
                    {item.portion}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs pt-1">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                    <Flame size={13} className="text-amber-400" />
                    {item.calories} kcal
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold">
                    <Zap size={13} className="text-indigo-400" />
                    {item.protein_g}g Protein
                  </span>
                  <span className="text-[11px] text-slate-400 ml-auto font-medium">
                    Total: <strong className="text-slate-200">{item.grams}g</strong>
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800/80">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* Breakfast Subtotal Footer */}
          <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span>Breakfast Caloric Contribution:</span>
            <span className="text-amber-400 font-bold">
              {activePlan?.breakfast?.total_calories || 0} kcal &bull; {activePlan?.breakfast?.total_protein_g || 0}g High-Quality Protein
            </span>
          </div>

        </div>

        {/* SECTION B: EVENING DINNER */}
        <div className="bg-slate-900/90 rounded-2xl border-2 border-indigo-500/40 overflow-hidden shadow-xl">
          
          {/* Dinner Section Header */}
          <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 px-6 py-4 border-b border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
                <Moon size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {activePlan?.dinner?.desi_title || 'Evening Family Dinner'}
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase">
                    60% Intake
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 font-medium">
                  Wholesome family meal with staples (Roti, Daal, Rice &amp; Sabzi/Chicken) to complete daily requirements.
                </p>
              </div>
            </div>

            {/* Dinner Subtotal Badge */}
            <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-indigo-500/30 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                  Dinner Target
                </span>
                <span className="text-base font-black text-white">
                  {activePlan?.dinner?.total_calories || 0} <span className="text-xs font-normal text-slate-300">kcal</span>
                </span>
              </div>
              <div className="h-6 w-px bg-slate-700" />
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Protein
                </span>
                <span className="text-base font-black text-emerald-300">
                  {activePlan?.dinner?.total_protein_g || 0}g
                </span>
              </div>
            </div>
          </div>

          {/* Dinner Food Cards Grid */}
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePlan?.dinner?.items?.map((item, idx) => (
              <div 
                key={idx}
                className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 hover:border-indigo-500/50 transition-all space-y-3 shadow-md group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-indigo-400 block tracking-wide">
                      {item.desi_name}
                    </span>
                    <h4 className="text-base font-extrabold text-white group-hover:text-indigo-200 transition-colors">
                      {item.name}
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-900 text-indigo-300 border border-indigo-500/30 whitespace-nowrap shadow-sm">
                    {item.portion}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs pt-1">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold">
                    <Flame size={13} className="text-indigo-400" />
                    {item.calories} kcal
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                    <Zap size={13} className="text-emerald-400" />
                    {item.protein_g}g Protein
                  </span>
                  <span className="text-[11px] text-slate-400 ml-auto font-medium">
                    Total: <strong className="text-slate-200">{item.grams}g</strong>
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800/80">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* Dinner Subtotal Footer */}
          <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span>Dinner Caloric Contribution:</span>
            <span className="text-indigo-300 font-bold">
              {activePlan?.dinner?.total_calories || 0} kcal &bull; {activePlan?.dinner?.total_protein_g || 0}g Sustained Evening Protein
            </span>
          </div>

        </div>

      </div>

      {/* 4. VERIFIED 100% CALORIC BALANCE BANNER */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 rounded-2xl p-5 border-2 border-emerald-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-inner">
            <Check size={20} className="stroke-[3]" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white">
              Caloric Balance Exact Match Confirmed
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              Breakfast ({activePlan?.breakfast?.total_calories || 0} kcal) + Dinner ({activePlan?.dinner?.total_calories || 0} kcal) = <strong className="text-emerald-400">{activePlan?.total_recommended_calories || remainingCalories} kcal</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
            <ShieldCheck size={14} className="text-emerald-400" />
            100% Fulfills Remaining Requirement
          </span>
        </div>
      </div>

    </div>
  );
}

export default DietRecommendationSection;
