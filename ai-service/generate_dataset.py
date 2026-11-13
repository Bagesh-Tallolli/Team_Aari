"""
AI-Based Nutrition Assurance System - Synthetic Dataset Generator
Version: 3.0 (Pediatric WHO & PM POSHAN Aligned)

DISCLAIMER:
This dataset contains synthetically generated student nutrition profiles for
educational and experimental testing of the Random Forest machine learning pipeline.
It is NOT collected from real human hospital patients or school records and must NOT
be used for clinical or medical diagnostic decision-making.

Methodology:
- Age & sex-specific WHO Growth Reference 5-19 years for pediatric BMI cutoffs.
- Official PM POSHAN 2021 norms: Primary (450 kcal, 12g protein), Upper Primary (700 kcal, 20g protein).
- ICMR-NIN 2020 Dietary Reference Intakes for Indian Children (full-day energy & protein).
- Deterministic, rule-based label assignment without random probabilistic noise.
"""

import os
import json
import numpy as np
import pandas as pd

# Set fixed seed for 100% reproducibility
np.random.seed(42)

# WHO BMI-for-Age 5-19 reference cutoffs (median, -3SD, -2SD, +1SD, +2SD)
WHO_PEDIATRIC_BMI = {
    0: {  # Female (0)
        6: {'minus3': 11.8, 'minus2': 12.7, 'median': 15.2, 'plus1': 16.9, 'plus2': 18.8},
        7: {'minus3': 12.0, 'minus2': 12.9, 'median': 15.4, 'plus1': 17.4, 'plus2': 19.7},
        8: {'minus3': 12.2, 'minus2': 13.1, 'median': 15.7, 'plus1': 17.9, 'plus2': 20.6},
        9: {'minus3': 12.4, 'minus2': 13.5, 'median': 16.1, 'plus1': 18.6, 'plus2': 21.7},
        10: {'minus3': 12.8, 'minus2': 13.9, 'median': 16.6, 'plus1': 19.3, 'plus2': 22.8},
        11: {'minus3': 13.2, 'minus2': 14.4, 'median': 17.3, 'plus1': 20.2, 'plus2': 24.1},
        12: {'minus3': 13.7, 'minus2': 14.9, 'median': 18.0, 'plus1': 21.3, 'plus2': 25.4},
        13: {'minus3': 14.3, 'minus2': 15.4, 'median': 18.8, 'plus1': 22.3, 'plus2': 26.6},
        14: {'minus3': 14.7, 'minus2': 16.0, 'median': 19.6, 'plus1': 23.3, 'plus2': 27.7},
        15: {'minus3': 15.1, 'minus2': 16.4, 'median': 20.2, 'plus1': 24.0, 'plus2': 28.6},
    },
    1: {  # Male (1)
        6: {'minus3': 12.1, 'minus2': 13.0, 'median': 15.3, 'plus1': 16.8, 'plus2': 18.5},
        7: {'minus3': 12.3, 'minus2': 13.1, 'median': 15.5, 'plus1': 17.2, 'plus2': 19.2},
        8: {'minus3': 12.4, 'minus2': 13.3, 'median': 15.8, 'plus1': 17.7, 'plus2': 20.1},
        9: {'minus3': 12.6, 'minus2': 13.6, 'median': 16.2, 'plus1': 18.3, 'plus2': 21.1},
        10: {'minus3': 12.8, 'minus2': 14.0, 'median': 16.6, 'plus1': 19.0, 'plus2': 22.2},
        11: {'minus3': 13.2, 'minus2': 14.5, 'median': 17.2, 'plus1': 19.9, 'plus2': 23.5},
        12: {'minus3': 13.6, 'minus2': 15.0, 'median': 17.8, 'plus1': 20.8, 'plus2': 24.8},
        13: {'minus3': 14.2, 'minus2': 15.5, 'median': 18.5, 'plus1': 21.8, 'plus2': 25.9},
        14: {'minus3': 14.7, 'minus2': 16.0, 'median': 19.2, 'plus1': 22.7, 'plus2': 26.9},
        15: {'minus3': 15.3, 'minus2': 16.6, 'median': 19.9, 'plus1': 23.6, 'plus2': 27.7},
    }
}

def get_pediatric_z_category(age, gender, bmi):
    """Categorize pediatric BMI: -2 (severe thinness), -1 (thinness), 0 (normal), 1 (overweight), 2 (obese)"""
    cutoffs = WHO_PEDIATRIC_BMI[gender][age]
    if bmi < cutoffs['minus3']:
        return -2  # Severe Thinness
    elif bmi < cutoffs['minus2']:
        return -1  # Thinness
    elif bmi > cutoffs['plus2']:
        return 2   # Obese
    elif bmi > cutoffs['plus1']:
        return 1   # Overweight
    else:
        return 0   # Normal

def get_school_meal_targets(age):
    """PM POSHAN official norms: Primary <= 10 yrs (450 kcal, 12g protein), Upper Primary 11-15 yrs (700 kcal, 20g protein)"""
    if age <= 10:
        return 450.0, 12.0
    return 700.0, 20.0

def get_full_day_requirements(age, gender):
    """ICMR-NIN 2020 RDA for Indian Children (calories, protein in grams)"""
    if age <= 9:
        return 1500.0, 23.0
    elif age <= 12:
        return (2220.0, 32.0) if gender == 1 else (2060.0, 33.0)
    else:
        return (2860.0, 45.0) if gender == 1 else (2400.0, 43.0)

def assign_label_deterministic(z_category, calorie_fulfillment_pct, protein_fulfillment_pct, seven_day_fulfillment_pct):
    """
    Deterministic clinical nutrition screening label:
    - 0: Healthy
    - 1: At Risk
    - 2: Underweight
    """
    # Critical Underweight: Severe thinness (< -3 SD) OR (thinness + severe intake deficit) OR chronic severe deficit (< 50%)
    if z_category == -2 or (z_category == -1 and calorie_fulfillment_pct < 60) or seven_day_fulfillment_pct < 50:
        return 2  # Underweight

    # At Risk: Moderate thinness, overweight, obese, or sub-target school meal intake (50% to 75%)
    if z_category in [-1, 1, 2] or calorie_fulfillment_pct < 75 or protein_fulfillment_pct < 75 or seven_day_fulfillment_pct < 75:
        return 1  # At Risk

    # Healthy: Normal growth screening (-2 SD to +1 SD) and adequate meal intake (>= 75%)
    return 0  # Healthy

def generate_synthetic_dataset(num_samples=1000):
    records = []
    
    # Generate balanced profiles across age, sex, and health categories
    for i in range(num_samples):
        age = int(np.random.randint(6, 16))
        gender = int(np.random.randint(0, 2))  # 0=Female, 1=Male
        
        # Typical height for age (WHO reference distribution)
        base_height = 105.0 + (age - 6) * 5.8
        height_cm = round(float(np.random.normal(base_height, 6.0)), 1)
        height_cm = max(100.0, min(180.0, height_cm))
        height_m = height_cm / 100.0

        # Decide demographic scenario for variety
        scenario = i % 3  # 0: Healthy profile, 1: At-risk profile, 2: Underweight profile

        cutoffs = WHO_PEDIATRIC_BMI[gender][age]
        median_bmi = cutoffs['median']

        if scenario == 0:
            # Normal BMI range
            bmi = float(np.random.uniform(cutoffs['minus2'] + 0.2, cutoffs['plus1'] - 0.2))
            intake_factor = float(np.random.uniform(0.85, 1.15))
        elif scenario == 1:
            # At risk range: either mild thinness, mild overweight, or moderate intake gap
            sub_type = np.random.choice(['mild_thin', 'overweight', 'intake_gap'])
            if sub_type == 'mild_thin':
                bmi = float(np.random.uniform(cutoffs['minus3'] + 0.1, cutoffs['minus2'] - 0.05))
                intake_factor = float(np.random.uniform(0.70, 0.90))
            elif sub_type == 'overweight':
                bmi = float(np.random.uniform(cutoffs['plus1'] + 0.1, cutoffs['plus2'] + 0.5))
                intake_factor = float(np.random.uniform(0.80, 1.10))
            else:
                bmi = float(np.random.uniform(cutoffs['minus2'] + 0.1, cutoffs['plus1'] - 0.1))
                intake_factor = float(np.random.uniform(0.60, 0.74))
        else:
            # Severe thinness or severe intake deficit
            bmi = float(np.random.uniform(cutoffs['minus3'] - 1.5, cutoffs['minus2'] - 0.1))
            intake_factor = float(np.random.uniform(0.35, 0.58))

        weight_kg = round(float(bmi * (height_m ** 2)), 1)
        weight_kg = max(14.0, min(70.0, weight_kg))
        bmi = round(float(weight_kg / (height_m ** 2)), 2)

        # Standard requirements & targets
        sm_cals_tgt, sm_prot_tgt = get_school_meal_targets(age)
        fd_cals_req, fd_prot_req = get_full_day_requirements(age, gender)

        # Actual served school intake today
        actual_sm_cals = round(float(sm_cals_tgt * intake_factor), 1)
        actual_sm_prot = round(float(sm_prot_tgt * intake_factor), 2)

        sm_cal_fulfil_pct = round(min(150.0, (actual_sm_cals / sm_cals_tgt) * 100.0), 1)
        sm_prot_fulfil_pct = round(min(150.0, (actual_sm_prot / sm_prot_tgt) * 100.0), 1)

        # 7-day average intake and recorded days count
        recorded_days = int(np.random.randint(3, 7))
        daily_variation = float(np.random.uniform(0.92, 1.08))
        seven_day_avg_cals = round(float(actual_sm_cals * daily_variation), 1)
        seven_day_avg_prot = round(float(actual_sm_prot * daily_variation), 2)
        seven_day_fulfil_pct = (seven_day_avg_cals / sm_cals_tgt) * 100.0

        z_cat = get_pediatric_z_category(age, gender, bmi)

        # Assign deterministic label
        status = assign_label_deterministic(z_cat, sm_cal_fulfil_pct, sm_prot_fulfil_pct, seven_day_fulfil_pct)

        records.append({
            'age': age,
            'gender': gender,
            'height_cm': height_cm,
            'weight_kg': weight_kg,
            'bmi': bmi,
            'pediatric_z_score_category': z_cat,
            'full_day_calories_required': fd_cals_req,
            'full_day_protein_required': fd_prot_req,
            'school_meal_calories_target': sm_cals_tgt,
            'school_meal_protein_target': sm_prot_tgt,
            'actual_school_calories_served': actual_sm_cals,
            'actual_school_protein_served': actual_sm_prot,
            'school_meal_calorie_fulfillment_pct': sm_cal_fulfil_pct,
            'school_meal_protein_fulfillment_pct': sm_prot_fulfil_pct,
            'seven_day_avg_daily_calories': seven_day_avg_cals,
            'seven_day_avg_daily_protein': seven_day_avg_prot,
            'recorded_school_days_count': recorded_days,
            'status': status
        })

    df = pd.DataFrame(records)
    return df

def main():
    print("=" * 60)
    print("GENERATING SYNTHETIC NUTRITION DATASET (VERSION 3.0)")
    print("=" * 60)

    df = generate_synthetic_dataset(1000)

    output_path = os.path.join(os.path.dirname(__file__), 'dataset.csv')
    df.to_csv(output_path, index=False)

    print(f"✓ Saved {len(df)} synthetic records to: {output_path}")
    print("\nClass Distribution:")
    status_names = {0: 'Healthy', 1: 'At Risk', 2: 'Underweight'}
    for status_code, count in df['status'].value_counts().sort_index().items():
        print(f"  {status_code} ({status_names[status_code]}): {count} ({count/len(df)*100:.1f}%)")

    print("\nDataset Summary:")
    print(f"  Ages: {df['age'].min()} - {df['age'].max()} years")
    print(f"  Genders: Female={len(df[df['gender']==0])}, Male={len(df[df['gender']==1])}")
    print(f"  BMI Range: {df['bmi'].min()} - {df['bmi'].max()}")
    print(f"  School-Meal Calorie Target: Primary 450 kcal / Upper Primary 700 kcal")
    print("=" * 60)

if __name__ == '__main__':
    main()
