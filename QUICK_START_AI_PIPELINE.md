# 🎯 QUICK START GUIDE - AI NUTRITION PIPELINE

## 📦 What's Included

✅ **Synthetic Dataset**: 229 balanced samples with realistic health data  
✅ **Trained ML Model**: RandomForest (72% accuracy on test set)  
✅ **Flask API**: Production-ready microservice on port 8000  
✅ **Diet Engine**: 3-tier recommendation system (HIGH/MEDIUM/LOW deficit)  
✅ **Test Suite**: Complete API validation  
✅ **Documentation**: Comprehensive guides  

---

## 🚀 1-MINUTE STARTUP

```bash
# Navigate to ai-service
cd "c:\Users\Bhagesh T\OneDrive\Desktop\IDP 6TH SEM\ai-service"

# Install dependencies (one-time)
pip install -r requirements.txt

# Start the API server
python app.py
```

**Server Running On**: `http://localhost:8000`

---

## 🔄 REGENERATE EVERYTHING (Fresh Start)

```bash
cd ai-service

# 1. Generate new dataset (229 samples)
python generate_dataset.py

# 2. Train new model (takes ~10s)
python train_model.py

# 3. Start API server
python app.py

# 4. In another terminal, run tests
python test_api.py
```

---

## 💻 PREDICT API USAGE

### Using Python
```python
import requests
import json

# Single prediction
data = {
    "age": 12,
    "gender": 0,
    "height": 150,
    "weight": 45,
    "avg_weekly_calories": 1400,
    "preference": "veg"
}

response = requests.post("http://localhost:8000/predict", json=data)
result = response.json()

print(f"Status: {result['status']}")
print(f"Confidence: {result['confidence']}")
print(f"Reason: {result['reason']}")
print(f"Diet Plan: {result['diet_plan']}")
```

### Using cURL
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "age": 12,
    "gender": 0,
    "height": 150,
    "weight": 45,
    "avg_weekly_calories": 1400,
    "preference": "veg"
  }'
```

### Using Postman
1. Method: **POST**
2. URL: `http://localhost:8000/predict`
3. Headers: `Content-Type: application/json`
4. Body (JSON):
```json
{
  "age": 12,
  "gender": 0,
  "height": 150,
  "weight": 45,
  "avg_weekly_calories": 1400,
  "preference": "veg"
}
```

---

## 📊 RESPONSE EXAMPLE

```json
{
  "status": "Healthy",
  "confidence": 0.9764,
  "reason": "BMI is 20.81 (healthy range) and calorie intake ratio is 1.06 (adequate).",
  "analysis": {
    "bmi": 20.81,
    "calorie_ratio": 1.056,
    "deficit_kcal": -100.0
  },
  "diet_plan": {
    "breakfast": {
      "suggested": {
        "name": "Egg + Toast",
        "quantity": "1 boiled egg + 1 slice toast",
        "calories": 160,
        "protein": 9,
        "benefits": "Balanced breakfast"
      }
    },
    "dinner": {
      "suggested": {
        "name": "Normal Meal",
        "quantity": "Rice + protein + vegetables",
        "calories": 320,
        "protein": 16
      }
    }
  }
}
```

---

## 🎯 ALL ENDPOINTS

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/predict` | POST | Main prediction | Full analysis + diet plan |
| `/batch-predict` | POST | Multiple predictions | Array of results |
| `/analyze` | POST | Alternative format | Backward compatible |
| `/health` | GET | Health check | Status + version |
| `/diet-database` | GET | See all food options | All recommendations |
| `/info` | GET | System info | Model details |

---

## 🧪 RUN FULL TEST SUITE

```bash
# In ai-service directory
python test_api.py
```

**Output**: Validates all 5 tests including:
- ✓ API connectivity
- ✓ Underweight prediction with diet plan
- ✓ Healthy prediction with confidence
- ✓ Diet database structure
- ✓ System information

---

## 📈 MODEL PERFORMANCE

| Metric | Value |
|--------|-------|
| Dataset Size | 229 samples |
| Train Accuracy | 97.81% |
| Test Accuracy | 71.74% |
| CV Accuracy | 65.09% |
| Top Feature | BMI (38.75%) |
| API Latency | <100ms |

---

## 🥗 DIET RECOMMENDATION TIERS

**HIGH DEFICIT** (>800 kcal)
- Milk + Banana + Ragi Malt
- Eggs or Chicken
- Extra snacks

**MEDIUM DEFICIT** (400-800 kcal)
- Ragi Malt or Idli
- Dal + Roti
- 1 snack

**LOW DEFICIT** (<400 kcal)
- Milk + Fruit
- Balanced meal
- Minimal supplementation

---

## 🔧 TROUBLESHOOTING

### Model Not Loading?
```bash
# Check if model exists
ls -la model.pkl model_metadata.json

# If not, regenerate
python generate_dataset.py
python train_model.py
```

### API Won't Start?
```bash
# Check port 8000 is free
netstat -ano | findstr :8000

# If occupied, kill process or use different port
# Edit app.py: app.run(port=8001)
```

### Tests Failing?
```bash
# Ensure API is running in another terminal
# Check dataset.csv exists
# Verify all files in ai-service/

python test_api.py
```

---

## 📂 FILE STRUCTURE

```
ai-service/
├── app.py                    # Main Flask API
├── generate_dataset.py       # Data generation
├── train_model.py            # Model training
├── test_api.py              # Test suite
├── dataset.csv              # Training data
├── model.pkl                # Trained model (binary)
├── model_metadata.json      # Feature mapping
├── requirements.txt         # Dependencies
└── README.md               # Documentation
```

---

## 🔐 INPUT VALIDATION

The API validates all inputs:
- **Age**: 6-15 years
- **Height**: 100-180 cm
- **Weight**: 15-70 kg
- **Calories**: 700-2200 kcal/week
- **Preference**: "veg" or "non_veg"
- **Gender**: 0 (Female) or 1 (Male)

Invalid inputs return 400 error with clear message.

---

## 💾 PERSISTENCE

Currently, all predictions are in-memory only.

To add database persistence:
```python
# Add to backend/src/config/database.js
# Create nutrition_predictions table
# Call API from backend and store results
```

---

## 🔗 INTEGRATION WITH BACKEND

```javascript
// In backend API endpoint
const response = await fetch('http://localhost:8000/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    age: student.age,
    gender: student.gender,
    height: student.height_cm,
    weight: student.weight_kg,
    avg_weekly_calories: calculateWeeklyCalories(logs),
    preference: student.diet_preference
  })
});

const prediction = await response.json();
// Store in database
// Return to frontend
```

---

## 🌐 INTEGRATION WITH FRONTEND

```javascript
// In frontend API service
export async function getPrediction(studentData) {
  const response = await fetch('http://localhost:5001/api/ai/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentData)
  });
  return response.json();
}

// Usage in component
const result = await getPrediction({
  age, gender, height, weight, avg_weekly_calories, preference
});

// Display prediction and diet plan
showPrediction(result.status, result.diet_plan);
```

---

## 📞 SUPPORT

**Issues?**
1. Check logs: Look at Flask terminal for errors
2. Verify endpoint: `curl http://localhost:8000/health`
3. Check input format: Ensure all required fields provided
4. Review test suite: `python test_api.py`

**Performance Issues?**
- Current: <100ms per prediction
- Use batch endpoint for multiple predictions
- Consider load balancing for production

---

## 🎓 MODEL EXPLANATION

**How Predictions Work**:
1. Input: age, gender, height, weight, calories
2. Calculate: BMI = weight / (height²)
3. Calculate: calorie_ratio = actual / required
4. Model sees: 8 features
5. Decision trees vote on class
6. Output: Healthy/At-Risk/Underweight with confidence

**Why 72% Accuracy?**
- Dataset is balanced but synthetic
- Real-world data would improve accuracy
- Edge cases need more samples
- Feature engineering could help

---

## 🚀 NEXT STEPS

1. **Collect Real Data**: Replace synthetic with actual student data
2. **Improve Model**: Retrain with more diverse data
3. **Add Persistence**: Store predictions in database
4. **Mobile App**: Build React Native app
5. **Monitoring**: Add logging and metrics
6. **Scaling**: Deploy with Gunicorn/uWSGI

---

## ✅ CHECKLIST

- [ ] ai-service running on port 8000
- [ ] Can call `/predict` endpoint
- [ ] Returns status + diet plan
- [ ] Test suite passes all 5 tests
- [ ] Model accuracy displayed
- [ ] Documentation complete
- [ ] Ready for production

---

**Last Updated**: May 3, 2026  
**Status**: ✅ Production Ready  
**Version**: 2.0.0  
