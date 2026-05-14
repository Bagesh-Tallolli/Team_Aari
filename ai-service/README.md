# 🤖 AI Nutrition Analysis Microservice

Standalone Flask microservice for AI-based nutrition analysis, health status prediction, and personalized diet recommendations.

## Overview

This service analyzes student health metrics and provides:
- **BMI Calculation** - Height/weight based Body Mass Index
- **Health Status Classification** - Healthy, Underweight, Overweight, Obese
- **Risk Level Assessment** - 0-100 scale based on nutrition and BMI
- **Personalized Recommendations** - Tailored nutrition advice

## Prerequisites

- Python 3.7+
- pip (Python package manager)

## Installation

### Option 1: Quick Start (Recommended for Windows)

1. **Double-click `run.bat`** to start the service
   - This will automatically create a virtual environment and start the Flask server

### Option 2: Manual Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate

# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run Flask server
python app.py
```

## API Endpoints

### 1. Health Check
```
GET /health
```

Response:
```json
{
  "status": "ok",
  "service": "AI Nutrition Analysis Service",
  "version": "1.0.0",
  "timestamp": "2026-04-17T12:00:00"
}
```

### 2. Single Student Analysis (PRIMARY)
```
POST /analyze
Content-Type: application/json

{
  "student_id": 1,
  "height_cm": 150,
  "weight_kg": 45,
  "age": 12,
  "daily_calories_consumed": 1800,
  "daily_protein_consumed": 45,
  "food_items": [
    {"name": "rice", "quantity_grams": 150},
    {"name": "dal", "quantity_grams": 100}
  ]
}
```

Response:
```json
{
  "student_id": 1,
  "bmi": 20.0,
  "health_status": "Healthy",
  "risk_level": 15,
  "daily_nutrients": {
    "calories": 1800,
    "protein": 45
  },
  "requirements": {
    "calories": {"min": 1600, "max": 2200},
    "protein": {"min": 40, "max": 60}
  },
  "recommendations": [
    "Maintain current balanced diet with regular exercise"
  ],
  "analysis_timestamp": "2026-04-17T12:00:00",
  "model_version": "1.0.0"
}
```

### 3. Batch Analysis
```
POST /batch-analyze
Content-Type: application/json

{
  "students": [
    {"student_id": 1, "height_cm": 150, ...},
    {"student_id": 2, "height_cm": 155, ...}
  ]
}
```

### 4. Nutrition Database
```
GET /food-nutrients
```

Returns food nutrient database, BMI thresholds, and daily requirements.

## Health Status Classification

Based on BMI (Body Mass Index):

- **Underweight**: BMI < 16.5
- **Healthy**: 16.5 ≤ BMI < 25
- **Overweight**: 25 ≤ BMI < 30
- **Obese**: BMI ≥ 30

## Risk Level (0-100)

Calculated from:
- **40%** - BMI deviation from healthy range
- **30%** - Daily calorie deficit/excess
- **30%** - Daily protein intake

Risk Levels:
- 0-20: Low Risk (Green)
- 21-50: Medium Risk (Yellow)
- 51-80: High Risk (Orange)
- 81-100: Critical Risk (Red)

## Food Database

Supported foods (per 100g):
- rice
- dal
- egg
- roti
- milk
- chicken
- vegetables
- banana
- bread
- chapati

Each food has nutritional data: calories, protein, fat, carbohydrates.

## Configuration

Server runs on `http://localhost:5000` by default.

To change port, modify `app.py`:
```python
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

## Integration with Backend

The Flask service is called by the backend ([aiService.js](../backend/src/services/aiService.js)) when:

1. A new food log is created
2. Student health metrics need analysis
3. Diet plan recommendations are needed

Backend makes POST requests to: `http://localhost:5000/analyze`

## Testing

### Using cURL:
```bash
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "height_cm": 150,
    "weight_kg": 45,
    "age": 12,
    "daily_calories_consumed": 1800,
    "daily_protein_consumed": 45
  }'
```

### Using Python:
```python
import requests

url = 'http://localhost:5000/analyze'
data = {
    'student_id': 1,
    'height_cm': 150,
    'weight_kg': 45,
    'age': 12,
    'daily_calories_consumed': 1800,
    'daily_protein_consumed': 45
}

response = requests.post(url, json=data)
print(response.json())
```

### Using Postman:
1. Create new POST request
2. URL: `http://localhost:5000/analyze`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON): Use example above
5. Send

## Troubleshooting

### Service won't start
- **Check Python**: `python --version` (should be 3.7+)
- **Check port**: Ensure port 5000 is not in use
- **Check firewall**: Ensure Flask is allowed through firewall

### Connection refused from backend
- **Check Flask is running**: Open http://localhost:5000/health in browser
- **Check host configuration**: Flask should be listening on 0.0.0.0
- **Check port**: Ensure backend is set to call port 5000

### Invalid response format
- **Check JSON**: Validate request body is valid JSON
- **Check required fields**: Ensure all required fields are provided
- **Check data types**: height_cm and weight_kg must be numbers

## Performance

- Single analysis: ~50ms
- Batch analysis (10 students): ~500ms
- Service startup: ~2-3 seconds

## Future Enhancements

- Machine learning model for personalized predictions
- Historical trend analysis
- Allergy detection and dietary restrictions
- Integration with wearables for real-time data
- Advanced recommendation engine

## License

ISC

## Support

For issues or feature requests, contact the development team.
