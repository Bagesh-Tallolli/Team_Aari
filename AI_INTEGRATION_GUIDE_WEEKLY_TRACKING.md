# AI Model Integration with Weekly Calorie Tracking

## Overview

The backend now provides real nutritional data via `avg_weekly_calories`. This guide shows how to integrate it with your AI prediction model.

---

## 📊 Data Pipeline

```
[Student RFID Scan]
        ↓
[Food Log Created] (grams, calories, nutrition)
        ↓
[Weekly Average Calculated] (7-day historical data)
        ↓
[API Response includes avg_weekly_calories]
        ↓
[Feed to AI Model] ← YOU ARE HERE
        ↓
[AI Predictions] (health status, recommendations)
        ↓
[Frontend Display]
```

---

## 🤖 AI Model Input Format

### Single Student

**Endpoint**: `POST /api/scan`

**Response includes**:
```json
{
  "student_id": 53,
  "name": "Student Name",
  "age": 12,
  "gender": "Male",
  "bmi": 20.0,
  "risk_level": "healthy",
  "grams": 150,
  "calories": 195,
  "avg_weekly_calories": 195,  ← Use this
  "timestamp": "2025-01-01T10:30:00Z"
}
```

### Batch Processing (All Students)

**Function**: `analyticsService.getAllStudentsWeeklyAverages()`

**Returns**:
```json
[
  {
    "student_id": 1,
    "name": "Student 1",
    "age": 12,
    "gender": "Male",
    "current_bmi": 20.5,
    "risk_level": "healthy",
    "avg_weekly_calories": 210,
    "meal_count": 15
  },
  {
    "student_id": 2,
    "name": "Student 2",
    "age": 13,
    "gender": "Female",
    "current_bmi": 18.5,
    "risk_level": "healthy",
    "avg_weekly_calories": 190,
    "meal_count": 14
  }
]
```

---

## 🔄 Integration Approaches

### Approach 1: Real-Time (Per Scan)

**When**: After each RFID scan  
**Use Case**: Live predictions, instant feedback  
**Implementation**:

```javascript
// In scanController.js
const scanResponse = await scanService.processRfidScan(rfidCardId);

// Call AI service with new data
const aiPrediction = await axios.post(
  'http://localhost:8000/predict',
  {
    student_id: scanResponse.student_id,
    age: scanResponse.age,
    gender: scanResponse.gender,
    bmi: scanResponse.bmi,
    avg_weekly_calories: scanResponse.avg_weekly_calories,
    current_calories: scanResponse.calories
  }
);

// Include prediction in response
return {
  ...scanResponse,
  ai_prediction: aiPrediction.data
};
```

### Approach 2: Batch Daily

**When**: Once per day (e.g., 9 PM)  
**Use Case**: Daily reports, overnight processing  
**Implementation**:

```javascript
// In a cron job or scheduled endpoint
import * as analyticsService from './analyticsService.js';

// Get all students' weekly metrics
const allStudents = await analyticsService.getAllStudentsWeeklyAverages();

// Process through AI model
const predictions = await Promise.all(
  allStudents.map(student => 
    axios.post('http://localhost:8000/predict', {
      student_id: student.student_id,
      age: student.age,
      gender: student.gender,
      bmi: student.current_bmi,
      avg_weekly_calories: student.avg_weekly_calories,
      meal_count: student.meal_count
    })
  )
);

// Store predictions in database
await savePredictions(predictions);
```

### Approach 3: On-Demand Query

**When**: When user requests  
**Use Case**: Dashboard, health reports  
**Implementation**:

```javascript
// New endpoint: POST /api/student/:id/health-prediction
router.post('/student/:id/health-prediction', async (req, res) => {
  const studentId = req.params.id;
  
  // Get current data
  const studentData = await studentModel.getById(studentId);
  const weeklyMetrics = await analyticsService.getWeeklySummary(studentId);
  
  // Prepare AI input
  const aiInput = {
    student_id: studentData.id,
    age: studentData.age,
    gender: studentData.gender,
    bmi: studentData.current_bmi,
    avg_weekly_calories: weeklyMetrics.avg_calories,
    total_protein: weeklyMetrics.total_protein,
    total_carbs: weeklyMetrics.total_carbs,
    meal_count: weeklyMetrics.meal_count
  };
  
  // Get prediction
  const prediction = await axios.post(
    'http://localhost:8000/predict',
    aiInput
  );
  
  res.json(prediction.data);
});
```

---

## 🐍 Python AI Service Updates

### Current AI Service (`ai-service/app.py`)

**Add nutrition input parameters**:

```python
@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    
    # Extract nutrition metrics
    avg_weekly_calories = data.get('avg_weekly_calories', 0)
    age = data.get('age', 0)
    bmi = data.get('bmi', 0)
    gender = data.get('gender', 'M')
    
    # Prepare model input
    features = np.array([[
        age,
        bmi,
        avg_weekly_calories,
        data.get('meal_count', 0),
        data.get('total_protein', 0),
        data.get('total_carbs', 0),
        data.get('total_fats', 0)
    ]])
    
    # Get prediction
    prediction = model.predict(features)[0]
    
    return jsonify({
        'student_id': data.get('student_id'),
        'prediction': float(prediction),
        'confidence': calculate_confidence(features),
        'recommendation': get_recommendation(prediction, avg_weekly_calories)
    })
```

### Model Training Update

**Retrain model with nutrition data**:

```python
# ai-service/train_model.py
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

# Load historical data
data = pd.read_csv('dataset.csv')

# Features now include nutrition
X = data[[
    'age', 'bmi', 'avg_weekly_calories', 'meal_count',
    'total_protein', 'total_carbs', 'total_fats'
]]
y = data['health_score']

# Train model
model = RandomForestRegressor(n_estimators=100)
model.fit(X, y)

# Save for prediction service
joblib.dump(model, 'model.pkl')
```

---

## 📡 API Endpoint Updates

### New Endpoint: Health Prediction

```
POST /api/students/:studentId/predict
Content-Type: application/json

Response:
{
  "student_id": 53,
  "health_score": 0.85,
  "risk_level": "low_risk",
  "recommendations": [
    "Calorie intake is healthy",
    "Consider increasing protein",
    "Maintain current meal frequency"
  ],
  "nutrition_analysis": {
    "status": "good",
    "avg_weekly_calories": 195,
    "target_calories": 200,
    "variance": -2.5
  }
}
```

### New Endpoint: Batch Predictions

```
GET /api/predictions/batch
Query: ?type=daily|weekly|monthly

Response:
{
  "timestamp": "2025-01-01T21:00:00Z",
  "type": "daily",
  "predictions": [
    {
      "student_id": 1,
      "health_score": 0.85,
      "status": "healthy"
    },
    ...
  ],
  "summary": {
    "total_students": 50,
    "healthy": 40,
    "at_risk": 10
  }
}
```

---

## 🔌 Database Schema for Predictions

### Store AI Predictions

```sql
CREATE TABLE ai_predictions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  prediction_date DATE,
  health_score NUMERIC(5, 2),
  risk_level VARCHAR(50),
  avg_weekly_calories NUMERIC(10, 2),
  meal_count INTEGER,
  prediction_details JSONB,
  recommendations TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_predictions_student_date 
ON ai_predictions(student_id, prediction_date DESC);
```

### Query Recent Predictions

```sql
-- Get latest prediction for a student
SELECT * FROM ai_predictions
WHERE student_id = $1
ORDER BY prediction_date DESC
LIMIT 1;

-- Get all at-risk students
SELECT * FROM ai_predictions
WHERE prediction_date = CURRENT_DATE
  AND risk_level = 'at_risk'
ORDER BY health_score ASC;
```

---

## 🧪 Testing Integration

### Test Real-Time Prediction

```bash
#!/bin/bash
# Test with real scan data

# Register student
curl -X POST http://localhost:5001/api/students/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Student",
    "age": 12,
    "gender": "Male",
    "height": 150,
    "weight": 45,
    "rfid_card_id": "RFID-AI-TEST-001"
  }'

# Perform scan (will auto-log and calculate weekly average)
curl -X POST http://localhost:5001/api/scan \
  -H "Content-Type: application/json" \
  -d '{"rfid_card_id": "RFID-AI-TEST-001"}'

# Get AI prediction
curl -X POST http://localhost:5001/api/students/1/predict
```

---

## 📈 Metrics to Track

### Performance Metrics

```javascript
// Track AI integration performance
const metrics = {
  avg_prediction_time: 150, // ms
  prediction_accuracy: 0.92, // 92%
  false_positive_rate: 0.08,
  students_processed_daily: 150,
  system_uptime: 99.9 // %
};
```

### Nutrition Metrics

```javascript
// Track nutrition patterns
const nutritionMetrics = {
  avg_weekly_calories_all_students: 205,
  range_min: 150,
  range_max: 280,
  std_deviation: 25,
  at_risk_count: 15,
  healthy_count: 135
};
```

---

## 🚀 Implementation Checklist

### Phase 4.3 - Real-Time AI Integration

- [ ] Add prediction endpoint to backend
- [ ] Create AI input formatting service
- [ ] Update Python model with nutrition features
- [ ] Retrain model with new data
- [ ] Test real-time predictions
- [ ] Create predictions storage table
- [ ] Add frontend prediction display
- [ ] Set up batch prediction job

### Phase 4.4 - Advanced Analytics

- [ ] Implement trend analysis
- [ ] Add anomaly detection
- [ ] Create health reports
- [ ] Build recommendation engine
- [ ] Set up alerts for at-risk students

---

## 💡 Tips & Best Practices

1. **Start Simple**: Use real-time single predictions first
2. **Validate Data**: Check nutrition data quality before feeding to AI
3. **Monitor Performance**: Track prediction accuracy vs. actual outcomes
4. **Handle Edge Cases**: Deal with missing data, new students, etc.
5. **Scale Gradually**: Test with small batch before full deployment
6. **Log Everything**: Keep audit trail of predictions and actions
7. **Version Models**: Track which model version made each prediction

---

## 📞 Troubleshooting

**Issue**: AI service returns 500 error

**Solution**: 
```bash
# Check AI service is running
curl http://localhost:8000/health

# Verify input format matches model features
python -c "import numpy as np; print(np.array([[1,2,3,4,5,6,7]]).shape)"
```

**Issue**: Weekly average is 0

**Solution**:
```sql
-- Check if food logs exist
SELECT COUNT(*) FROM food_logs WHERE student_id = 1;

-- Check if data is within 7 days
SELECT logged_at, estimated_calories 
FROM food_logs 
WHERE student_id = 1 
  AND logged_at >= CURRENT_TIMESTAMP - INTERVAL '7 days';
```

---

## 📚 Related Files

- `backend/src/services/analyticsService.js` - Get nutrition data
- `backend/src/controllers/scanController.js` - Add prediction call
- `ai-service/app.py` - Update model endpoint
- `ai-service/train_model.py` - Update model training

---

**Next Phase**: Real-time AI predictions based on weekly nutrition data  
**Timeline**: Ready for implementation  
**Status**: ✅ Backend data ready, awaiting AI service update

