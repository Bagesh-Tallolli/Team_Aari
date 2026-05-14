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


# ============================================================
# Age-Based Calorie Requirements (ICMR Standards)
# ============================================================
def get_required_calories(age):
    """Get age-appropriate calorie requirements per ICMR"""
    if age <= 8:
        return 1400
    elif age <= 12:
        return 1800
    else:
        return 2200

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

def generate_diet_plan(age, status, deficit, gender, preference):
    """
    Generate personalized diet plan based on deficit and preferences
    preference: 'veg' or 'non_veg'
    """
    deficit_category = get_deficit_category(deficit)
    recommendation = DIET_RECOMMENDATIONS.get(deficit_category, {})
    
    plan = {
        "deficit_category": deficit_category,
        "deficit_kcal": round(deficit, 0),
        "breakfast": {
            "type": preference,
            "options": recommendation.get("breakfast", {}).get(preference, []),
            "suggested": recommendation.get("breakfast", {}).get(preference, [{}])[0] if recommendation.get("breakfast", {}).get(preference) else {}
        },
        "dinner": {
            "type": preference,
            "options": recommendation.get("dinner", {}).get(preference, []),
            "suggested": recommendation.get("dinner", {}).get(preference, [{}])[0] if recommendation.get("dinner", {}).get(preference) else {}
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
    🎯 MAIN PREDICTION ENDPOINT
    Real-time ML prediction with explainability and personalized diet recommendation
    
    Request:
    {
        "age": 12,
        "gender": 0,  # 0=Female, 1=Male
        "height": 150.0,  # cm
        "weight": 45.0,   # kg
        "avg_weekly_calories": 1600,
        "preference": "veg"  # "veg" or "non_veg"
    }
    
    Response includes:
    - Status prediction (Healthy/At Risk/Underweight)
    - Confidence score
    - BMI and calorie ratio
    - Explanation of the reason
    - Personalized diet plan with food options
    """
    try:
        if model is None:
            return jsonify({
                'error': 'Model not available',
                'message': 'ML model not loaded. Run: python generate_dataset.py && python train_model.py',
                'status_code': 503
            }), 503
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid request body', 'status_code': 400}), 400
        
        # Extract and validate input
        try:
            age = int(data.get('age'))
            gender = int(data.get('gender', 0))
            height = float(data.get('height'))
            weight = float(data.get('weight'))
            avg_weekly_calories = float(data.get('avg_weekly_calories', 1600))
            preference = data.get('preference', 'veg').lower()
            
            if preference not in ['veg', 'non_veg']:
                preference = 'veg'
        except (ValueError, TypeError) as e:
            return jsonify({
                'error': 'Invalid input type',
                'message': str(e),
                'status_code': 400
            }), 400
        
        # Validate ranges
        if not (6 <= age <= 15):
            return jsonify({'error': 'Age must be 6-15 years', 'status_code': 400}), 400
        if not (100 <= height <= 180):
            return jsonify({'error': 'Height must be 100-180 cm', 'status_code': 400}), 400
        if not (15 <= weight <= 70):
            return jsonify({'error': 'Weight must be 15-70 kg', 'status_code': 400}), 400
        
        # Calculate derived features
        bmi = calculate_bmi(height, weight)
        required_calories = get_required_calories(age)
        calorie_ratio = avg_weekly_calories / required_calories if required_calories > 0 else 0
        
        # Prepare features for ML model (in the same order as training)
        # Features: ['age', 'gender', 'height', 'weight', 'bmi', 'avg_weekly_calories', 'required_calories', 'calorie_ratio']
        features = np.array([[
            age, gender, height, weight, bmi, 
            avg_weekly_calories, required_calories, calorie_ratio
        ]])
        
        # Make prediction
        prediction = model.predict(features)[0]
        probabilities = model.predict_proba(features)[0]
        confidence = float(max(probabilities))
        
        # Map prediction to status
        status_map = {0: 'Healthy', 1: 'At Risk', 2: 'Underweight'}
        status = status_map.get(prediction, 'Unknown')
        
        # Calculate calorie deficit
        deficit = required_calories - avg_weekly_calories
        
        # Generate explanation
        reason = explain_status(bmi, calorie_ratio, status)
        
        # Generate personalized diet plan
        diet_plan = generate_diet_plan(age, status, deficit, gender, preference)
        
        # Build comprehensive response
        response = {
            'success': True,
            'status': status,
            'confidence': round(confidence, 4),
            'probabilities': {
                'healthy': round(float(probabilities[0]), 4),
                'at_risk': round(float(probabilities[1]), 4),
                'underweight': round(float(probabilities[2]), 4)
            },
            'analysis': {
                'bmi': bmi,
                'calorie_ratio': round(calorie_ratio, 3),
                'deficit_kcal': round(deficit, 0),
                'age': age,
                'gender': 'Female' if gender == 0 else 'Male'
            },
            'reason': reason,
            'diet_plan': diet_plan,
            'timestamp': datetime.now().isoformat(),
            'model_version': '2.0.0'
        }
        
        return jsonify(response), 200
    
    except Exception as e:
        return jsonify({
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
            return jsonify({'error': 'Invalid request'}), 400
        
        # Map to predict endpoint format
        mapped_data = {
            'age': data.get('age', 12),
            'gender': data.get('gender', 0),
            'height': data.get('height_cm', 150),
            'weight': data.get('weight_kg', 45),
            'avg_weekly_calories': data.get('avg_weekly_calories', 1600),
            'preference': data.get('preference', 'veg')
        }
        
        # Call predict with mapped data
        with app.test_request_context(json=mapped_data, method='POST'):
            return predict_malnutrition()
    
    except Exception as e:
        return jsonify({'error': 'Analysis failed', 'message': str(e)}), 500


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
