"""
AI-Based Nutrition Monitoring System - Flask Microservice
Production-Ready with ML Prediction & Advanced Diet Recommendation Engine
Features: Real-time malnutrition prediction, explainable AI, personalized diet plans
Karnataka-friendly foods, vegetarian/non-vegetarian options
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime
import math
import random
import os
import pickle
import numpy as np
import pandas as pd

app = Flask(__name__)
CORS(app)

# ============================================================
# Load Pre-trained ML Model
# ============================================================
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')
METADATA_PATH = os.path.join(os.path.dirname(__file__), 'model_metadata.json')

model = None
model_metadata = None

def load_model():
    """Load trained RandomForest model and metadata"""
    global model, model_metadata
    try:
        if os.path.exists(MODEL_PATH):
            with open(MODEL_PATH, 'rb') as f:
                model = pickle.load(f)
            print("✓ ML Model loaded successfully")
        else:
            print("⚠️  Model file not found. Run: python generate_dataset.py && python train_model.py")
            return False
        
        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH, 'r') as f:
                model_metadata = json.load(f)
            print("✓ Model metadata loaded successfully")
        else:
            print("⚠️  Metadata file not found")
        
        return True
    except Exception as e:
        print(f"❌ Error loading model: {str(e)}")
        return False

# Initialize model on module load
load_model()


# ============================================================
# PM POSHAN Mandated School Meal Targets
# ============================================================
def get_school_meal_target(age):
    """PM POSHAN (Mid-Day Meal) Mandated Norms: Primary 450 kcal, Upper Primary 700 kcal"""
    return 450 if age <= 10 else 700

# ============================================================
# Age-Based Full-Day Calorie Requirements (ICMR-NIN 2020 RDA)
# ============================================================
def get_required_calories(age, gender=1, bmi=None):
    """Get age- and sex-appropriate daily calorie requirements per ICMR-NIN 2020 RDA"""
    if age <= 9:
        base = 1500
    elif age <= 12:
        base = 2060 if gender == 0 else 2220
    elif age <= 15:
        base = 2400 if gender == 0 else 2860
    else:
        base = 2500 if gender == 0 else 3320
    return base

# ============================================================
# WHO Pediatric Growth References 5-19 Years
# ============================================================
WHO_PEDIATRIC_BMI = {
    'male': {
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
        16: {'minus3': 15.8, 'minus2': 17.1, 'median': 20.5, 'plus1': 24.4, 'plus2': 28.9},
    },
    'female': {
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
        16: {'minus3': 15.3, 'minus2': 16.8, 'median': 20.7, 'plus1': 24.7, 'plus2': 29.3},
    }
}

def assess_pediatric_bmi(age, gender, bmi):
    """Assess child BMI using WHO 5-19 references (assistive screening indicator)"""
    sex = 'female' if gender == 0 else 'male'
    ref_age = min(max(int(round(age)), 6), 16)
    cutoffs = WHO_PEDIATRIC_BMI[sex][ref_age]
    
    if bmi < cutoffs['minus3']:
        return 'Severe Thinness', 'critical', '< -3 SD'
    elif bmi < cutoffs['minus2']:
        return 'Thinness', 'at_risk', '-3 SD to -2 SD'
    elif bmi > cutoffs['plus2']:
        return 'Obese for Age', 'critical', '> +2 SD'
    elif bmi > cutoffs['plus1']:
        return 'Overweight for Age', 'at_risk', '+1 SD to +2 SD'
    else:
        return 'Healthy Weight', 'healthy', '-2 SD to +1 SD'

# ============================================================
# ADVANCED DIET RECOMMENDATION DATABASE
# Karnataka-friendly foods with detailed nutrition info
# ============================================================
DIET_RECOMMENDATIONS = {
    "HIGH_DEFICIT": {  # deficit > 800 kcal
        "breakfast": {
            "veg": [
                {
                    "name": "Milk (with banana)",
                    "quantity": "1 glass (250 ml) + 1 medium banana",
                    "calories": 250,
                    "protein": 8,
                    "nutrients": "Calcium, Potassium, B12",
                    "benefits": "Bone strength, energy boost, muscle growth",
                    "priority": "HIGH"
                },
                {
                    "name": "Groundnut Chikki",
                    "quantity": "2 pieces",
                    "calories": 150,
                    "protein": 5,
                    "nutrients": "Iron, Healthy fats, Magnesium",
                    "benefits": "Weight gain support, mineral absorption",
                    "priority": "HIGH"
                },
                {
                    "name": "Ragi Malt (Finger Millet)",
                    "quantity": "1 glass (200 ml)",
                    "calories": 180,
                    "protein": 7,
                    "nutrients": "Calcium, Iron, Phosphorus",
                    "benefits": "Bone growth, anemia prevention",
                    "priority": "HIGH"
                }
            ],
            "non_veg": [
                {
                    "name": "Boiled Eggs",
                    "quantity": "2 medium eggs",
                    "calories": 140,
                    "protein": 12,
                    "nutrients": "Protein, B12, Choline",
                    "benefits": "Muscle growth, brain development, energy",
                    "priority": "CRITICAL"
                },
                {
                    "name": "Chicken with Milk",
                    "quantity": "100g chicken + 1 glass milk",
                    "calories": 280,
                    "protein": 35,
                    "nutrients": "Complete protein, Iron, B vitamins",
                    "benefits": "Rapid muscle gain, hemoglobin production",
                    "priority": "CRITICAL"
                }
            ]
        },
        "dinner": {
            "veg": [
                {
                    "name": "Roti + Dal Curry",
                    "quantity": "2 rotis (80g) + 1 bowl dal (150g)",
                    "calories": 420,
                    "protein": 14,
                    "nutrients": "Complex carbs, Plant protein, Fiber",
                    "benefits": "Sustained energy, digestive health",
                    "priority": "HIGH"
                },
                {
                    "name": "Jowar Roti + Vegetable Curry",
                    "quantity": "2 jowar rotis (80g) + 1.5 bowls (180g)",
                    "calories": 380,
                    "protein": 10,
                    "nutrients": "Iron, Fiber, Minerals",
                    "benefits": "Anemia prevention, sustained energy",
                    "priority": "MEDIUM"
                }
            ],
            "non_veg": [
                {
                    "name": "Egg Curry with Rice",
                    "quantity": "2 eggs in curry + 1 bowl rice (150g)",
                    "calories": 420,
                    "protein": 18,
                    "nutrients": "Complete protein, Carbs, Iron",
                    "benefits": "Complete nutrition, rapid weight gain",
                    "priority": "CRITICAL"
                },
                {
                    "name": "Chicken Biryani",
                    "quantity": "150g biryani (Karnataka specialty)",
                    "calories": 450,
                    "protein": 20,
                    "nutrients": "Complete protein & carbs",
                    "benefits": "High calorie dense, delicious",
                    "priority": "HIGH"
                }
            ]
        },
        "snacks": [
            {
                "name": "Peanut Butter Sandwich",
                "calories": 200,
                "protein": 8,
                "nutrients": "Protein, Healthy fats",
                "benefits": "Quick energy, hunger suppression"
            },
            {
                "name": "Banana with Groundnut",
                "calories": 180,
                "protein": 6,
                "nutrients": "Potassium, Fat",
                "benefits": "Energy, mineral absorption"
            }
        ]
    },
    
    "MEDIUM_DEFICIT": {  # 400-800 kcal deficit
        "breakfast": {
            "veg": [
                {
                    "name": "Ragi Malt",
                    "quantity": "1 glass (200 ml)",
                    "calories": 180,
                    "protein": 7,
                    "nutrients": "Calcium, Iron",
                    "benefits": "Growth support, mineral-rich",
                    "priority": "HIGH"
                },
                {
                    "name": "Idli + Sambar",
                    "quantity": "2 idlis + 100ml sambar",
                    "calories": 200,
                    "protein": 6,
                    "nutrients": "Protein, Fiber",
                    "benefits": "Light, digestible, nutritious",
                    "priority": "MEDIUM"
                }
            ],
            "non_veg": [
                {
                    "name": "Boiled Egg + Toast",
                    "quantity": "1 egg + 1 slice toast",
                    "calories": 180,
                    "protein": 10,
                    "nutrients": "Protein, B vitamins",
                    "benefits": "Balanced breakfast",
                    "priority": "HIGH"
                }
            ]
        },
        "dinner": {
            "veg": [
                {
                    "name": "Roti + Dal",
                    "quantity": "2 rotis + 1 bowl dal",
                    "calories": 350,
                    "protein": 12,
                    "nutrients": "Carbs, Protein, Fiber",
                    "benefits": "Balanced nutrition",
                    "priority": "HIGH"
                }
            ],
            "non_veg": [
                {
                    "name": "Chicken with Rice",
                    "quantity": "150g chicken + 1 bowl rice",
                    "calories": 380,
                    "protein": 28,
                    "nutrients": "Complete protein",
                    "benefits": "High protein meal",
                    "priority": "HIGH"
                }
            ]
        },
        "snacks": [
            {
                "name": "Banana",
                "calories": 100,
                "protein": 1,
                "nutrients": "Potassium, Carbs",
                "benefits": "Quick energy"
            }
        ]
    },
    
    "LOW_DEFICIT": {  # < 400 kcal deficit
        "breakfast": {
            "veg": [
                {
                    "name": "Milk + Seasonal Fruit",
                    "quantity": "1 glass milk + 1 medium fruit",
                    "calories": 150,
                    "protein": 3,
                    "nutrients": "Calcium, Vitamins",
                    "benefits": "Maintenance nutrition",
                    "priority": "MEDIUM"
                }
            ],
            "non_veg": [
                {
                    "name": "Egg + Toast",
                    "quantity": "1 boiled egg + 1 slice toast",
                    "calories": 160,
                    "protein": 9,
                    "nutrients": "Protein, Carbs",
                    "benefits": "Balanced breakfast",
                    "priority": "MEDIUM"
                }
            ]
        },
        "dinner": {
            "veg": [
                {
                    "name": "Balanced Meal",
                    "quantity": "Roti + vegetables + lentils",
                    "calories": 300,
                    "protein": 10,
                    "nutrients": "Complete nutrients",
                    "benefits": "Maintenance nutrition",
                    "priority": "MEDIUM"
                }
            ],
            "non_veg": [
                {
                    "name": "Normal Meal",
                    "quantity": "Rice + protein + vegetables",
                    "calories": 320,
                    "protein": 16,
                    "nutrients": "Complete nutrients",
                    "benefits": "Balanced nutrition",
                    "priority": "MEDIUM"
                }
            ]
        },
        "snacks": [
            {
                "name": "Seasonal Fruit",
                "calories": 60,
                "protein": 0,
                "nutrients": "Vitamins, Minerals",
                "benefits": "Micronutrient support"
            }
        ]
    }
}

# Food database with nutrition info (per 100g)
FOOD_DATABASE = {
    'rice': {'calories': 130, 'protein': 2.7, 'fat': 0.3, 'carbs': 28, 'category': 'grain'},
    'dal': {'calories': 121, 'protein': 8.9, 'fat': 0.3, 'carbs': 20, 'category': 'legume'},
    'roti': {'calories': 265, 'protein': 8.4, 'fat': 1.5, 'carbs': 48, 'category': 'grain'},
    'egg': {'calories': 70, 'protein': 6.3, 'fat': 5.0, 'carbs': 0.6, 'category': 'protein'},
    'milk': {'calories': 61, 'protein': 3.2, 'fat': 3.3, 'carbs': 4.8, 'category': 'dairy'},
    'chicken': {'calories': 165, 'protein': 31.0, 'fat': 3.6, 'carbs': 0, 'category': 'protein'},
    'banana': {'calories': 89, 'protein': 1.1, 'fat': 0.3, 'carbs': 23, 'category': 'fruit'},
    'groundnut': {'calories': 567, 'protein': 25.8, 'fat': 49.2, 'carbs': 16.1, 'category': 'nut'},
    'ragi': {'calories': 328, 'protein': 6.3, 'fat': 1.3, 'carbs': 72, 'category': 'grain'},
    'jowar': {'calories': 329, 'protein': 8.4, 'fat': 2.9, 'carbs': 72, 'category': 'grain'},
    'vegetables': {'calories': 35, 'protein': 2.0, 'fat': 0.2, 'carbs': 7, 'category': 'veg'},
}

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def calculate_bmi(height_cm, weight_kg):
    """Calculate BMI from height (cm) and weight (kg)"""
    height_m = height_cm / 100
    return round(weight_kg / (height_m ** 2), 2)

def get_deficit_category(deficit):
    """Categorize calorie deficit"""
    if deficit > 800:
        return "HIGH_DEFICIT"
    elif deficit >= 400:
        return "MEDIUM_DEFICIT"
    else:
        return "LOW_DEFICIT"

def explain_status(bmi, calorie_ratio, status):
    """Generate human-readable explanation"""
    explanations = {
        "Healthy": f"BMI is {bmi} (healthy range) and calorie intake ratio is {calorie_ratio:.2f} (adequate). Child is well-nourished.",
        "At Risk": f"BMI is {bmi} with calorie ratio {calorie_ratio:.2f} (marginal). Moderate nutrition support needed.",
        "Underweight": f"BMI is {bmi} (below healthy range) and calorie ratio {calorie_ratio:.2f} (low). Urgent nutrition intervention required."
    }
    return explanations.get(status, "")

def generate_diet_plan(age, status, deficit, gender, preference, data=None):
    """
    Generate personalized diet plan based on deficit and preferences
    preference: 'veg' or 'non_veg'
    """
    if data is None:
        data = {}
        
    deficit_category = get_deficit_category(deficit)
    recommendation = DIET_RECOMMENDATIONS.get(deficit_category, {})
    
    plan = {
        "deficit_category": deficit_category,
        "deficit_kcal": round(deficit, 0),
        "todays_intake": round(float(data.get('todays_calories', 0)), 0),
        "total_required": round(float(data.get('required_calories', 0)), 0),
        "remaining_deficit": round(float(data.get('remaining_calories', deficit)), 0),
        "breakfast": {
            "veg": {
                "options": recommendation.get("breakfast", {}).get("veg", []),
                "suggested": recommendation.get("breakfast", {}).get("veg", [{}])[0] if recommendation.get("breakfast", {}).get("veg") else {}
            },
            "non_veg": {
                "options": recommendation.get("breakfast", {}).get("non_veg", []),
                "suggested": recommendation.get("breakfast", {}).get("non_veg", [{}])[0] if recommendation.get("breakfast", {}).get("non_veg") else {}
            }
        },
        "dinner": {
            "veg": {
                "options": recommendation.get("dinner", {}).get("veg", []),
                "suggested": recommendation.get("dinner", {}).get("veg", [{}])[0] if recommendation.get("dinner", {}).get("veg") else {}
            },
            "non_veg": {
                "options": recommendation.get("dinner", {}).get("non_veg", []),
                "suggested": recommendation.get("dinner", {}).get("non_veg", [{}])[0] if recommendation.get("dinner", {}).get("non_veg") else {}
            }
        },
        "snacks": recommendation.get("snacks", []),
        "notes": generate_diet_notes(status, deficit_category)
    }
    
    return plan

def generate_diet_notes(status, deficit_category):
    """Generate dietary notes based on status and deficit"""
    notes = []
    
    if status == "Underweight":
        notes.append("🔴 CRITICAL: Child is underweight. Increase meal frequency to 5-6 small meals daily.")
        notes.append("Include high-calorie, nutrient-dense foods (eggs, nuts, milk products).")
        notes.append("Track weight weekly. Consult with nutritionist if no improvement in 2 weeks.")
    
    if deficit_category == "HIGH_DEFICIT":
        notes.append("⚠️  High calorie deficit detected. Prioritize high-calorie options marked as CRITICAL.")
        notes.append("Consider 2 snacks between meals for additional nutrition.")
    
    elif deficit_category == "MEDIUM_DEFICIT":
        notes.append("📌 Moderate deficit. Include recommended snacks between meals.")
        notes.append("Focus on balanced meals with protein and carbohydrates.")
    
    else:
        notes.append("✅ Low deficit. Maintain current balanced diet with regular exercise.")
    
    return notes




# ============================================================
# API ENDPOINTS
# ============================================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'operational' if model else 'degraded',
        'service': 'AI Nutrition Prediction & Diet Recommendation Service',
        'version': '2.0.0',
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat(),
        'features': [
            'ML-based malnutrition prediction',
            'Explainable AI (reason generation)',
            'Personalized diet recommendations',
            'Karnataka-friendly foods',
            'Vegetarian & non-vegetarian options'
        ]
    }), 200


@app.route('/predict', methods=['POST'])
def predict_malnutrition():
    """
    🎯 MAIN PREDICTION ENDPOINT - RESTORED RANDOM FOREST INFERENCE
    Executes actual RandomForestClassifier inference with pediatric WHO growth screening
    and PM POSHAN 2021 school-meal fulfillment benchmarks.
    """
    try:
        if model is None:
            load_model()
            if model is None:
                return jsonify({
                    'success': False,
                    'status': 'model_unavailable',
                    'error': 'ML model not available on server',
                    'message': 'Random Forest model could not be loaded. Please run train_model.py.',
                    'status_code': 503
                }), 503
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'status': 'insufficient_data',
                'error': 'Invalid request body',
                'status_code': 400
            }), 400
        
        # Extract and validate input
        try:
            if 'age' not in data or data.get('age') is None:
                return jsonify({
                    'success': False,
                    'status': 'insufficient_data',
                    'error': 'Missing required parameter: age',
                    'status_code': 400
                }), 400

            age = int(round(float(data.get('age'))))
            raw_gender = data.get('gender', 1)
            if isinstance(raw_gender, str):
                gender = 0 if raw_gender.lower().startswith('f') else 1
            else:
                gender = 0 if int(raw_gender) == 0 else 1

            height = float(data.get('height') or data.get('height_cm') or 120.0)
            weight = float(data.get('weight') or data.get('weight_kg') or 25.0)
            avg_weekly_calories = float(data.get('avg_weekly_calories') or data.get('seven_day_avg_daily_calories') or 400.0)
            preference = str(data.get('preference', 'veg')).lower()
            if preference not in ['veg', 'non_veg']:
                preference = 'veg'
        except (ValueError, TypeError) as e:
            return jsonify({
                'success': False,
                'status': 'insufficient_data',
                'error': 'Invalid input type',
                'message': str(e),
                'status_code': 400
            }), 400
        
        # Validate ranges for school children (ages 6 to 15)
        if not (6 <= age <= 16):
            return jsonify({'success': False, 'status': 'insufficient_data', 'error': 'Age must be 6-16 years for school screening', 'status_code': 400}), 400
        if not (80 <= height <= 190):
            return jsonify({'success': False, 'status': 'insufficient_data', 'error': 'Height must be between 80 and 190 cm', 'status_code': 400}), 400
        if not (12 <= weight <= 80):
            return jsonify({'success': False, 'status': 'insufficient_data', 'error': 'Weight must be between 12 and 80 kg', 'status_code': 400}), 400
        
        # 1. Pediatric WHO Anthropometric Growth Screening
        bmi = calculate_bmi(height, weight)
        pediatric_label, pediatric_risk, z_range = assess_pediatric_bmi(age, gender, bmi)
        
        z_category_map = {
            'Severe Thinness': -2,
            'Thinness': -1,
            'Healthy Weight': 0,
            'Overweight for Age': 1,
            'Obese for Age': 2
        }
        pediatric_z_score_category = z_category_map.get(pediatric_label, 0)
        
        # 2. PM POSHAN School Meal Targets (Primary: 450 kcal / 12g protein; Upper Primary: 700 kcal / 20g protein)
        sm_cals_default = get_school_meal_target(age)
        sm_prot_default = 12.0 if age <= 10 else 20.0
        school_meal_calories_target = float(data.get('school_meal_calories_target') or sm_cals_default)
        school_meal_protein_target = float(data.get('school_meal_protein_target') or sm_prot_default)

        # 3. Full-Day Energy & Protein Requirements (ICMR-NIN 2020 RDA)
        fd_cals_default = get_required_calories(age, gender)
        fd_prot_default = 23.0 if age <= 9 else (32.0 if gender == 1 else 33.0) if age <= 12 else (45.0 if gender == 1 else 43.0)
        full_day_calories_required = float(data.get('full_day_calories_required') or fd_cals_default)
        full_day_protein_required = float(data.get('full_day_protein_required') or fd_prot_default)

        # 4. Actual Recorded School Meal Intake
        actual_school_calories_served = float(data.get('actual_school_calories_served') or avg_weekly_calories)
        actual_school_protein_served = float(data.get('actual_school_protein_served') or (actual_school_calories_served * 0.032))

        # 5. Fulfillment Percentages
        sm_cal_fulfil_pct = min(200.0, max(0.0, (actual_school_calories_served / school_meal_calories_target) * 100.0)) if school_meal_calories_target > 0 else 0.0
        sm_prot_fulfil_pct = min(200.0, max(0.0, (actual_school_protein_served / school_meal_protein_target) * 100.0)) if school_meal_protein_target > 0 else 0.0

        # 6. Seven-day daily averages and recorded active days
        seven_day_avg_daily_calories = float(data.get('seven_day_avg_daily_calories') or avg_weekly_calories)
        seven_day_avg_daily_protein = float(data.get('seven_day_avg_daily_protein') or (seven_day_avg_daily_calories * 0.032))
        recorded_school_days_count = int(data.get('recorded_school_days_count') or data.get('recorded_days') or 5)

        # 7. Construct Feature Array in exact order matching model training schema
        feature_dict = {
            'age': age,
            'gender': gender,
            'height_cm': height,
            'weight_kg': weight,
            'bmi': bmi,
            'pediatric_z_score_category': pediatric_z_score_category,
            'full_day_calories_required': full_day_calories_required,
            'full_day_protein_required': full_day_protein_required,
            'school_meal_calories_target': school_meal_calories_target,
            'school_meal_protein_target': school_meal_protein_target,
            'actual_school_calories_served': actual_school_calories_served,
            'actual_school_protein_served': actual_school_protein_served,
            'school_meal_calorie_fulfillment_pct': sm_cal_fulfil_pct,
            'school_meal_protein_fulfillment_pct': sm_prot_fulfil_pct,
            'seven_day_avg_daily_calories': seven_day_avg_daily_calories,
            'seven_day_avg_daily_protein': seven_day_avg_daily_protein,
            'recorded_school_days_count': recorded_school_days_count
        }

        feature_columns = model_metadata.get('feature_columns') if model_metadata else list(feature_dict.keys())
        features_vector = [feature_dict.get(col, 0.0) for col in feature_columns]
        input_df = pd.DataFrame([features_vector], columns=feature_columns)

        # 8. 🎯 REAL RANDOM FOREST INFERENCE
        raw_pred = model.predict(input_df)
        predicted_class_id = int(raw_pred[0])

        # 9. REAL RANDOM FOREST PREDICTION PROBABILITIES
        if hasattr(model, 'predict_proba'):
            raw_proba = model.predict_proba(input_df)[0]
            # Map probabilities safely across model classes [0: Healthy, 1: At Risk, 2: Underweight]
            prob_healthy = float(round(float(raw_proba[0]), 4)) if len(raw_proba) > 0 else 0.0
            prob_at_risk = float(round(float(raw_proba[1]), 4)) if len(raw_proba) > 1 else 0.0
            prob_underweight = float(round(float(raw_proba[2]), 4)) if len(raw_proba) > 2 else 0.0
            confidence = float(round(float(np.max(raw_proba)), 4))
        else:
            prob_healthy = 1.0 if predicted_class_id == 0 else 0.0
            prob_at_risk = 1.0 if predicted_class_id == 1 else 0.0
            prob_underweight = 1.0 if predicted_class_id == 2 else 0.0
            confidence = 1.0

        status_map = {0: 'Healthy', 1: 'At Risk', 2: 'Underweight'}
        status = status_map.get(predicted_class_id, 'Healthy')
        risk_level_map = {0: 'healthy', 1: 'at_risk', 2: 'critical'}
        risk_level = risk_level_map.get(predicted_class_id, 'healthy')

        # 10. Separated Gaps & Metrics
        school_meal_gap_kcal = max(0.0, float(round(school_meal_calories_target - actual_school_calories_served, 1)))
        school_meal_gap_protein = max(0.0, float(round(school_meal_protein_target - actual_school_protein_served, 1)))
        remaining_daily_deficit = max(0.0, float(round(full_day_calories_required - actual_school_calories_served, 1)))

        # 11. Contributing Factors
        contributing_factors = [
            {
                'factor': 'School Meal Calorie Fulfillment',
                'value': f"{sm_cal_fulfil_pct:.1f}%",
                'benchmark': f"{school_meal_calories_target:.0f} kcal PM POSHAN target",
                'importance_rank': 1,
                'status': 'optimal' if sm_cal_fulfil_pct >= 85 else ('moderate_deficit' if sm_cal_fulfil_pct >= 60 else 'severe_deficit')
            },
            {
                'factor': 'School Meal Protein Fulfillment',
                'value': f"{sm_prot_fulfil_pct:.1f}%",
                'benchmark': f"{school_meal_protein_target:.1f}g PM POSHAN target",
                'importance_rank': 2,
                'status': 'optimal' if sm_prot_fulfil_pct >= 85 else 'deficit'
            },
            {
                'factor': 'Pediatric BMI-for-Age (WHO)',
                'value': f"BMI {bmi:.1f}",
                'benchmark': f"{pediatric_label} ({z_range})",
                'importance_rank': 3,
                'status': pediatric_risk
            }
        ]

        # 12. Standardized Educational & Clinical Disclaimer
        reason = (
            f"AI Screening Result: {status} (RandomForest prediction confidence {confidence*100:.1f}%). "
            f"Independent Pediatric Screening: BMI {bmi:.1f} ({pediatric_label}, {z_range} WHO 5-19 references). "
            f"School meal served today: {actual_school_calories_served:.0f} kcal against PM POSHAN target of {school_meal_calories_target:.0f} kcal "
            f"({sm_cal_fulfil_pct:.0f}% fulfilled). Estimated full-day requirement: {full_day_calories_required:.0f} kcal."
        )

        # 13. Personalized Diet Plan Recommendations
        diet_plan = generate_diet_plan(age, status, remaining_daily_deficit, gender, preference, data)
        diet_plan['school_meal_gap'] = {
            'target_kcal': school_meal_calories_target,
            'served_kcal': actual_school_calories_served,
            'deficit_kcal': school_meal_gap_kcal,
            'target_protein_g': school_meal_protein_target,
            'served_protein_g': actual_school_protein_served,
            'deficit_protein_g': school_meal_gap_protein,
            'status': 'GOAL_MET' if school_meal_gap_kcal == 0 else 'DEFICIT',
        }

        # 14. Structured API Response with explicit separation
        response = {
            'success': True,
            'status': status,
            'predicted_class_id': predicted_class_id,
            'risk_level': risk_level,
            'confidence': confidence,
            'probabilities': {
                'healthy': prob_healthy,
                'at_risk': prob_at_risk,
                'underweight': prob_underweight
            },
            'pediatric_screening': {
                'bmi': bmi,
                'category': pediatric_risk,
                'label': pediatric_label,
                'z_score_range': z_range,
                'standard': 'WHO Growth Reference (5-19 years)',
                'screening_disclaimer': 'Pediatric anthropometric screening indicator only — not a definitive medical diagnosis.'
            },
            'nutrition_summary': {
                'school_meal_calories_target': school_meal_calories_target,
                'school_meal_protein_target': school_meal_protein_target,
                'actual_school_calories_served': actual_school_calories_served,
                'actual_school_protein_served': actual_school_protein_served,
                'school_meal_calorie_fulfillment_pct': round(sm_cal_fulfil_pct, 1),
                'school_meal_protein_fulfillment_pct': round(sm_prot_fulfil_pct, 1),
                'school_meal_calorie_gap_kcal': school_meal_gap_kcal,
                'school_meal_protein_gap_g': school_meal_gap_protein,
                'full_day_calories_required': full_day_calories_required,
                'full_day_protein_required': full_day_protein_required,
                'remaining_daily_deficit_kcal': remaining_daily_deficit,
                'seven_day_avg_daily_calories': seven_day_avg_daily_calories,
                'seven_day_avg_daily_protein': seven_day_avg_daily_protein,
                'recorded_school_days_count': recorded_school_days_count
            },
            'contributing_factors': contributing_factors,
            'reason': reason,
            'diet_plan': diet_plan,
            'analysis': {
                'bmi': bmi,
                'bmi_status': pediatric_label,
                'z_score_range': z_range,
                'school_meal_energy_fulfillment_pct': round(sm_cal_fulfil_pct, 1),
                'school_meal_calories_target': school_meal_calories_target,
                'full_day_calories_required': full_day_calories_required,
                'age': age,
                'gender': 'Female' if gender == 0 else 'Male'
            },
            'model_metadata': {
                'model_name': 'RandomForestClassifier',
                'model_version': '3.0.0',
                'inference_engine': 'scikit-learn',
                'pipeline_status': 'restored_active_inference',
                'training_dataset_type': 'synthetic_pediatric_reference',
                'validation_status': 'experimental_software_prototype',
                'screening_disclaimer': 'AI-assisted screening — not a medical diagnosis. For Mid-Day Meal monitoring assistance only.'
            },
            'timestamp': datetime.now().isoformat()
        }

        return jsonify(response), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Prediction failed',
            'message': str(e),
            'status_code': 500
        }), 500


@app.route('/analyze', methods=['POST'])
def analyze_student():
    """
    Alternative analysis endpoint (backward compatibility)
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Invalid request'}), 400
        
        # Map to predict endpoint format
        mapped_data = dict(data)
        if 'height_cm' in mapped_data and 'height' not in mapped_data:
            mapped_data['height'] = mapped_data['height_cm']
        if 'weight_kg' in mapped_data and 'weight' not in mapped_data:
            mapped_data['weight'] = mapped_data['weight_kg']
        if 'calories' in mapped_data and 'avg_weekly_calories' not in mapped_data:
            mapped_data['avg_weekly_calories'] = mapped_data['calories']
        
        # Call predict with mapped data
        with app.test_request_context(json=mapped_data, method='POST'):
            return predict_malnutrition()
    
    except Exception as e:
        return jsonify({'success': False, 'error': 'Analysis failed', 'message': str(e)}), 500


@app.route('/batch-predict', methods=['POST'])
def batch_predict():
    """
    Batch prediction endpoint for multiple students
    """
    try:
        data = request.get_json()
        students = data.get('students', [])
        
        if not students:
            return jsonify({'error': 'No students provided', 'status_code': 400}), 400
        
        results = {
            'total': len(students),
            'processed': 0,
            'failed': 0,
            'predictions': [],
            'timestamp': datetime.now().isoformat()
        }
        
        for student in students:
            try:
                with app.test_request_context(json=student, method='POST'):
                    resp = predict_malnutrition()
                    if resp[1] == 200:
                        results['predictions'].append(resp[0].get_json())
                        results['processed'] += 1
                    else:
                        results['failed'] += 1
            except Exception as e:
                results['failed'] += 1
                results['predictions'].append({
                    'error': str(e),
                    'student_id': student.get('student_id')
                })
        
        return jsonify(results), 200
    
    except Exception as e:
        return jsonify({'error': 'Batch prediction failed', 'message': str(e)}), 500


@app.route('/diet-database', methods=['GET'])
def get_diet_database():
    """Get diet recommendation database"""
    return jsonify({
        'diet_recommendations': DIET_RECOMMENDATIONS,
        'food_database': FOOD_DATABASE,
        'status_code': 200
    }), 200


@app.route('/info', methods=['GET'])
def get_system_info():
    """Get system information"""
    return jsonify({
        'system': 'AI Nutrition Prediction & Diet Recommendation Service',
        'version': '2.0.0',
        'model_info': {
            'algorithm': 'RandomForestClassifier',
            'n_estimators': 100,
            'features': [
                'age', 'gender', 'height', 'weight', 'bmi',
                'avg_weekly_calories', 'required_calories', 'calorie_ratio'
            ],
            'classes': ['Healthy', 'At Risk', 'Underweight'],
            'accuracy': '>80%'
        },
        'capabilities': [
            'Malnutrition risk prediction',
            'Explainable AI (reason generation)',
            'Personalized diet recommendations',
            'Karnataka-friendly foods',
            'Vegetarian & non-vegetarian options',
            'Age-appropriate nutrition guidance'
        ],
        'status_code': 200
    }), 200


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found', 'status_code': 404}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error', 'status_code': 500}), 500


# ============================================================
# APPLICATION STARTUP
# ============================================================


if __name__ == '__main__':
    # Load model on startup
    print("\n" + "="*60)
    print("🚀 AI NUTRITION SERVICE STARTUP")
    print("="*60)
    model_loaded = load_model()
    print("="*60)
    
    # Run Flask app
    print(f"\n✓ Starting Flask server on http://0.0.0.0:8000")
    print(f"✓ Model status: {'✅ READY' if model_loaded else '⚠️  NOT LOADED'}")
    print("\nAvailable Endpoints:")
    print("  POST /predict         - ML prediction with diet recommendation")
    print("  POST /batch-predict   - Batch predictions for multiple students")
    print("  POST /analyze         - Alternative analysis endpoint")
    print("  GET  /health          - Health check")
    print("  GET  /diet-database   - Diet recommendation database")
    print("  GET  /info            - System information")
    print("\nAPI Documentation:")
    print("  See POST /predict endpoint for detailed input/output format")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=8000, debug=False)
