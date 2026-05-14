"""
Test script for AI Nutrition Prediction API
"""
import requests
import json
from pprint import pprint

BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test health check endpoint"""
    print("\n" + "="*60)
    print("🏥 TEST 1: HEALTH CHECK")
    print("="*60)
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        pprint(response.json())
        print(f"✓ Status: {response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")

def test_prediction_underweight():
    """Test prediction for underweight student"""
    print("\n" + "="*60)
    print("📊 TEST 2: PREDICTION (UNDERWEIGHT CASE)")
    print("="*60)
    
    data = {
        "age": 10,
        "gender": 0,
        "height": 140,
        "weight": 28,  # Low weight -> underweight
        "avg_weekly_calories": 1000,  # Low calories
        "preference": "veg"
    }
    
    print(f"\n📥 Request Data:")
    pprint(data)
    
    try:
        response = requests.post(f"{BASE_URL}/predict", json=data, timeout=5)
        print(f"\n📤 Response:")
        result = response.json()
        pprint(result)
        print(f"✓ Status: {response.status_code}")
        
        if result.get('status') == 'Underweight':
            print("✅ PASSED: Correctly identified underweight student")
            print(f"   - Confidence: {result.get('confidence')}")
            print(f"   - Reason: {result.get('reason')}")
            print(f"\n🥗 DIET PLAN:")
            diet = result.get('diet_plan', {})
            print(f"   Deficit Category: {diet.get('deficit_category')}")
            print(f"   Deficit kcal: {diet.get('deficit_kcal')}")
            breakfast = diet.get('breakfast', {})
            if breakfast.get('suggested'):
                print(f"\n   Breakfast (Vegetarian):")
                print(f"     - {breakfast['suggested'].get('name')}")
                print(f"     - Quantity: {breakfast['suggested'].get('quantity')}")
                print(f"     - Calories: {breakfast['suggested'].get('calories')} kcal")
                print(f"     - Protein: {breakfast['suggested'].get('protein')}g")
                print(f"     - Benefits: {breakfast['suggested'].get('benefits')}")
        else:
            print(f"⚠️ Status returned: {result.get('status')}")
    
    except Exception as e:
        print(f"✗ Error: {e}")

def test_prediction_healthy():
    """Test prediction for healthy student"""
    print("\n" + "="*60)
    print("📊 TEST 3: PREDICTION (HEALTHY CASE)")
    print("="*60)
    
    data = {
        "age": 12,
        "gender": 1,
        "height": 155,
        "weight": 50,
        "avg_weekly_calories": 1900,  # Good calories
        "preference": "non_veg"
    }
    
    print(f"\n📥 Request Data:")
    pprint(data)
    
    try:
        response = requests.post(f"{BASE_URL}/predict", json=data, timeout=5)
        print(f"\n📤 Response:")
        result = response.json()
        pprint(result)
        print(f"✓ Status: {response.status_code}")
        
        if result.get('status') == 'Healthy':
            print("✅ PASSED: Correctly identified healthy student")
        else:
            print(f"⚠️ Status returned: {result.get('status')}")
    
    except Exception as e:
        print(f"✗ Error: {e}")

def test_diet_database():
    """Test diet database endpoint"""
    print("\n" + "="*60)
    print("🥗 TEST 4: DIET DATABASE")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/diet-database", timeout=5)
        result = response.json()
        print(f"✓ Status: {response.status_code}")
        print(f"✓ Deficit Categories: {list(result['diet_recommendations'].keys())}")
        print(f"✓ Foods in database: {len(result['food_database'])} items")
        print(f"✓ Sample foods: {list(result['food_database'].keys())[:5]}")
    
    except Exception as e:
        print(f"✗ Error: {e}")

def test_system_info():
    """Test system info endpoint"""
    print("\n" + "="*60)
    print("ℹ️  TEST 5: SYSTEM INFORMATION")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/info", timeout=5)
        result = response.json()
        print(f"✓ Status: {response.status_code}")
        print(f"✓ System: {result.get('system')}")
        print(f"✓ Version: {result.get('version')}")
        print(f"✓ Model: {result.get('model_info', {}).get('algorithm')}")
        print(f"✓ Features: {len(result.get('model_info', {}).get('features', []))} input features")
        print(f"✓ Classes: {result.get('model_info', {}).get('classes')}")
    
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    print("\n" + "🧪 AI NUTRITION PREDICTION API - TEST SUITE" + "🧪")
    print("="*60)
    
    try:
        test_health_check()
        test_prediction_underweight()
        test_prediction_healthy()
        test_diet_database()
        test_system_info()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS COMPLETED!")
        print("="*60 + "\n")
    
    except KeyboardInterrupt:
        print("\n\n❌ Tests interrupted")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
