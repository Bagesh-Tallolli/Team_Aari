"""
Synthetic Dataset Generation for Malnutrition Prediction
WHO + ICMR Aligned Standards for Indian School Children (6-15 years)
"""

import pandas as pd
import numpy as np
from sklearn.utils import shuffle
import os

# Set random seed for reproducibility
np.random.seed(42)

def get_required_calories(age):
    """Get age-appropriate calorie requirements per Indian guidelines"""
    if age <= 8:
        return 1400
    elif age <= 12:
        return 1800
    else:
        return 2200

def calculate_bmi(height_cm, weight_kg):
    """Calculate BMI from height (cm) and weight (kg)"""
    height_m = height_cm / 100
    return weight_kg / (height_m ** 2)

def assign_label_probabilistic(bmi, calorie_ratio):
    """
    Assign label based on WHO guidelines with probabilistic noise
    Returns: 0=Healthy, 1=At Risk, 2=Underweight
    """
    
    # Base probability assignment
    if bmi < 15 and calorie_ratio < 0.55:
        # Strong underweight signal
        if np.random.random() < 0.85:
            return 2  # Underweight
        elif np.random.random() < 0.5:
            return 1  # At Risk (noise)
        else:
            return 0
    
    elif (bmi < 18.5) or (calorie_ratio < 0.75):
        # At Risk range
        if np.random.random() < 0.70:
            return 1  # At Risk
        elif bmi < 15:
            return 2  # Underweight
        else:
            return 0
    
    else:  # bmi >= 18.5 and ratio >= 0.75
        # Healthy range
        if np.random.random() < 0.80:
            return 0  # Healthy
        else:
            return 1  # At Risk (noise)

def generate_student_data(num_samples=250):
    """
    Generate synthetic student health data
    num_samples: number of records to generate (default 250)
    """
    
    data = {
        'age': [],
        'gender': [],
        'height': [],
        'weight': [],
        'bmi': [],
        'avg_weekly_calories': [],
        'required_calories': [],
        'calorie_ratio': [],
        'status': []
    }
    
    # Distribution targets
    target_healthy = num_samples // 3
    target_at_risk = num_samples // 3
    target_underweight = num_samples - target_healthy - target_at_risk
    
    current_healthy = 0
    current_at_risk = 0
    current_underweight = 0
    
    attempts = 0
    max_attempts = num_samples * 5  # Prevent infinite loops
    
    while (current_healthy < target_healthy or 
           current_at_risk < target_at_risk or 
           current_underweight < target_underweight) and attempts < max_attempts:
        
        attempts += 1
        
        # Generate features
        age = np.random.randint(6, 16)  # 6-15 years
        gender = np.random.randint(0, 2)  # 0=Female, 1=Male
        
        # Height range: 120-170 cm (realistic for 6-15 year olds)
        height = np.random.uniform(120, 170)
        
        # Weight range: 20-60 kg
        weight = np.random.uniform(20, 60)
        
        # Add ±10% noise
        height += np.random.uniform(-height * 0.1, height * 0.1)
        weight += np.random.uniform(-weight * 0.1, weight * 0.1)
        
        # Ensure valid ranges
        height = np.clip(height, 100, 180)
        weight = np.clip(weight, 15, 70)
        
        bmi = calculate_bmi(height, weight)
        
        # Constrain BMI to valid range (13-22 per guidelines)
        if bmi < 13 or bmi > 22:
            continue
        
        required_cal = get_required_calories(age)
        
        # Average weekly calories: 700-2200
        avg_weekly_cal = np.random.uniform(700, 2200)
        calorie_ratio = avg_weekly_cal / required_cal
        
        # Assign label probabilistically
        status = assign_label_probabilistic(bmi, calorie_ratio)
        
        # Track distribution
        if status == 0:
            if current_healthy >= target_healthy:
                continue
            current_healthy += 1
        elif status == 1:
            if current_at_risk >= target_at_risk:
                continue
            current_at_risk += 1
        else:  # status == 2
            if current_underweight >= target_underweight:
                continue
            current_underweight += 1
        
        # Append data
        data['age'].append(age)
        data['gender'].append(gender)
        data['height'].append(round(height, 2))
        data['weight'].append(round(weight, 2))
        data['bmi'].append(round(bmi, 2))
        data['avg_weekly_calories'].append(round(avg_weekly_cal, 2))
        data['required_calories'].append(required_cal)
        data['calorie_ratio'].append(round(calorie_ratio, 3))
        data['status'].append(status)
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    return df

def save_dataset(df, filename='dataset.csv'):
    """Save dataset to CSV file"""
    output_path = os.path.join(os.path.dirname(__file__), filename)
    df.to_csv(output_path, index=False)
    print(f"✓ Dataset saved: {filename}")
    print(f"✓ Total records: {len(df)}")
    return output_path

def print_dataset_statistics(df):
    """Print detailed dataset statistics"""
    print("\n" + "="*60)
    print("DATASET STATISTICS")
    print("="*60)
    
    print(f"\nTotal Records: {len(df)}")
    
    # Class distribution
    print("\n📊 CLASS DISTRIBUTION:")
    status_counts = df['status'].value_counts().sort_index()
    status_map = {0: 'Healthy', 1: 'At Risk', 2: 'Underweight'}
    for status, count in status_counts.items():
        percentage = (count / len(df)) * 100
        print(f"   {status_map[status]:12} : {count:3d} records ({percentage:5.1f}%)")
    
    # Feature statistics
    print("\n📈 FEATURE STATISTICS:")
    features = ['age', 'height', 'weight', 'bmi', 'avg_weekly_calories', 'required_calories', 'calorie_ratio']
    for feature in features:
        print(f"\n   {feature}:")
        print(f"      Min : {df[feature].min():.2f}")
        print(f"      Max : {df[feature].max():.2f}")
        print(f"      Mean: {df[feature].mean():.2f}")
        print(f"      Std : {df[feature].std():.2f}")
    
    # Gender distribution
    print("\n👥 GENDER DISTRIBUTION:")
    gender_counts = df['gender'].value_counts().sort_index()
    for gender, count in gender_counts.items():
        gender_name = "Female" if gender == 0 else "Male"
        percentage = (count / len(df)) * 100
        print(f"   {gender_name}: {count:3d} records ({percentage:5.1f}%)")
    
    # Age groups
    print("\n📅 AGE GROUP DISTRIBUTION:")
    age_bins = [6, 8, 12, 16]
    age_labels = ['6-8', '9-12', '13-15']
    age_groups = pd.cut(df['age'], bins=age_bins, labels=age_labels, right=False)
    for label, count in age_groups.value_counts().sort_index().items():
        percentage = (count / len(df)) * 100
        print(f"   {label} years: {count:3d} records ({percentage:5.1f}%)")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    print("\n🔄 GENERATING SYNTHETIC DATASET...")
    print("="*60)
    
    # Generate 250 samples (balanced distribution)
    df = generate_student_data(num_samples=250)
    
    # Shuffle for randomness
    df = shuffle(df).reset_index(drop=True)
    
    # Save to CSV
    output_file = save_dataset(df, 'dataset.csv')
    
    # Print statistics
    print_dataset_statistics(df)
    
    # Display sample records
    print("\n📋 SAMPLE RECORDS (First 5):")
    print("="*60)
    print(df.head().to_string())
    print("\n" + "="*60)
    print("✅ Dataset generation complete!")
