# API REFERENCE DOCUMENTATION

## Base URL
```
http://localhost:5001
```

---

## Authentication

### POST /api/auth/login

Authenticate user and receive JWT token.

**Request:**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d {
    "email": "admin@nutrition.com",
    "password": "password123"
  }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@nutrition.com",
      "role": "admin"
    }
  },
  "message": "Login successful"
}
```

**Status Codes:**
- 200 OK - Successful login
- 401 Unauthorized - Invalid credentials
- 400 Bad Request - Missing fields

---

## RFID Scanning

### POST /api/scan

Process RFID scan - finds student, calculates serving, logs food, generates predictions.

**Request:**
```bash
curl -X POST http://localhost:5001/api/scan \
  -H "Content-Type: application/json" \
  -d {
    "rfid_card_id": "RFID-DIET-1778134898996"
  }
```

**Response (Detailed Mode):**
```json
{
  "success": true,
  "data": {
    "student_id": 59,
    "name": "Diet Plan Test Student",
    "age": 12,
    "gender": "Male",
    "bmi": 18.07,
    "risk_level": "healthy",
    "rfid_card_id": "RFID-DIET-1778134898996",
    "grams": 150,
    "calories": 195,
    "protein": 4.05,
    "carbs": 42,
    "fats": 0.45,
    "avg_weekly_calories": 195,
    "nutrition_status": "Healthy",
    "nutrition_confidence": 0.53,
    "nutrition_reason": "BMI is 18.07 (healthy range)...",
    "diet_recommendations": {
      "breakfast": ["Milk porridge", "Banana"],
      "dinner": ["Dal rice", "Salad"],
      "snacks": ["Apple", "Yogurt"],
      "notes": ["High water intake", "Regular exercise"]
    },
    "ai_prediction": {...},
    "message": "Food served and logged successfully",
    "timestamp": "2026-05-07T12:45:30.123Z"
  },
  "message": "Student scan processed successfully"
}
```

**Response (Hardware Mode - HARDWARE_MODE=true):**
```json
{
  "success": true,
  "student_id": 59,
  "name": "Diet Plan Test Student",
  "grams": 150,
  "message": "Dispense food"
}
```

**Status Codes:**
- 200 OK - Scan successful
- 404 Not Found - RFID not found
- 400 Bad Request - Invalid RFID format
- 500 Internal Error - Database/AI service error

**Error Response:**
```json
{
  "success": false,
  "message": "Student not found",
  "statusCode": 404
}
```

---

### POST /api/scan/detailed

Detailed scan with complete meal composition.

**Request:**
```bash
curl -X POST http://localhost:5001/api/scan/detailed \
  -H "Content-Type: application/json" \
  -d {
    "rfid_card_id": "RFID-DIET-1778134898996"
  }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "student": {
      "id": 59,
      "name": "Diet Plan Test Student",
      "age": 12,
      "gender": "Male",
      "current_bmi": 18.07,
      "risk_level": "healthy"
    },
    "meal_composition": {
      "rice_grams": 150,
      "dal_grams": 50,
      "vegetables_grams": 75,
      "total": 275
    },
    "nutrition_estimate": {
      "estimated_calories": 350,
      "estimated_protein_g": 12,
      "estimated_carbs_g": 55,
      "estimated_fat_g": 4
    },
    "food_logged": {
      "grams": 275,
      "calories": 350,
      "message": "Food served and logged successfully"
    },
    "weekly_metrics": {
      "avg_calories": 350,
      "total_logs": 3
    }
  }
}
```

---

## Students

### GET /api/students

List all students with optional filtering.

**Request:**
```bash
curl -X GET "http://localhost:5001/api/students?search=Diet&limit=50" \
  -H "Authorization: Bearer {token}"
```

**Query Parameters:**
- `search` (string, optional) - Search by name or RFID
- `limit` (number, default: 50) - Results per page
- `offset` (number, default: 0) - Pagination offset
- `risk_level` (string, optional) - Filter by 'healthy', 'at_risk', 'malnourished'

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 59,
      "name": "Diet Plan Test Student",
      "age": 12,
      "gender": "Male",
      "current_bmi": 18.07,
      "risk_level": "healthy",
      "rfid_card_id": "RFID-DIET-1778134898996"
    }
  ],
  "pagination": {
    "total": 59,
    "limit": 50,
    "offset": 0,
    "pages": 2
  }
}
```

---

### GET /api/students/at-risk

List students with at-risk nutrition status.

**Request:**
```bash
curl -X GET "http://localhost:5001/api/students/at-risk" \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "name": "Malnourished Student",
      "age": 11,
      "risk_level": "malnourished",
      "current_bmi": 14.5,
      "recent_status": "At Risk"
    }
  ],
  "statistics": {
    "total_at_risk": 8,
    "critical": 2,
    "warning": 6
  }
}
```

---

### GET /api/students/:id/details

Get comprehensive student profile (all sections for Nutrition Tracker).

**Request:**
```bash
curl -X GET "http://localhost:5001/api/students/59/details" \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "student": {
      "id": 59,
      "name": "Diet Plan Test Student",
      "age": 12,
      "gender": "Male",
      "height": 145,
      "weight": 38,
      "current_bmi": 18.07,
      "risk_level": "healthy",
      "rfid_card_id": "RFID-DIET-1778134898996"
    },
    "nutrition_analytics": {
      "avg_weekly_calories": 195,
      "required_calories": 1800,
      "calorie_deficit": 0,
      "total_servings": 3
    },
    "ai_analysis": {
      "status": "Healthy",
      "confidence": 53,
      "reason": "BMI is 18.07 (healthy range)..."
    },
    "diet_recommendations": {
      "breakfast": ["Milk porridge", "Banana"],
      "dinner": ["Dal rice", "Salad"],
      "snacks": ["Apple", "Yogurt"],
      "notes": ["High water intake"]
    },
    "food_history": [
      {
        "id": 157,
        "food_item": "rice",
        "served_grams": 150,
        "estimated_calories": 195,
        "protein": 4.05,
        "logged_at": "2026-05-07T10:30:00Z"
      }
    ]
  }
}
```

---

### GET /api/students/:id

Get basic student profile.

**Request:**
```bash
curl -X GET "http://localhost:5001/api/students/59" \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 59,
    "name": "Diet Plan Test Student",
    "age": 12,
    "gender": "Male",
    "height": 145,
    "weight": 38,
    "current_bmi": 18.07,
    "risk_level": "healthy",
    "email": null,
    "rfid_card_id": "RFID-DIET-1778134898996"
  }
}
```

---

### POST /api/students

Create new student.

**Request:**
```bash
curl -X POST http://localhost:5001/api/students \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d {
    "name": "New Student",
    "age": 12,
    "gender": "Male",
    "height": 145,
    "weight": 38,
    "rfid_card_id": "RFID-NEW-123456"
  }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 60,
    "name": "New Student",
    "age": 12,
    "rfid_card_id": "RFID-NEW-123456",
    "current_bmi": 18.07
  },
  "message": "Student created successfully"
}
```

---

## Food Logs

### GET /api/students/:id/food-logs

Get food logs for a student.

**Request:**
```bash
curl -X GET "http://localhost:5001/api/students/59/food-logs?limit=10" \
  -H "Authorization: Bearer {token}"
```

**Query Parameters:**
- `limit` (number, default: 30) - Number of logs
- `days` (number, optional) - Last N days

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 157,
      "student_id": 59,
      "food_item": "rice",
      "served_grams": 150,
      "estimated_calories": 195,
      "protein": 4.05,
      "carbs": 42,
      "fats": 0.45,
      "logged_at": "2026-05-07T10:30:00Z"
    }
  ],
  "summary": {
    "total_calories": 585,
    "avg_calories_per_serving": 195,
    "total_servings": 3,
    "date_range": "Last 7 days"
  }
}
```

---

## Health Status

### GET /api/students/:id/health-status

Get AI health prediction.

**Request:**
```bash
curl -X GET "http://localhost:5001/api/students/59/health-status" \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "student_id": 59,
    "status": "Healthy",
    "confidence": 0.53,
    "ai_prediction": {
      "status": "Healthy",
      "confidence": 0.53,
      "reason": "BMI is 18.07 (healthy range)...",
      "diet_plan": {...}
    },
    "diet_plan": {
      "breakfast": [...],
      "dinner": [...],
      "snacks": [...]
    },
    "required_calories": 1800,
    "avg_weekly_calories": 195
  }
}
```

---

## Alerts

### GET /api/alerts

List alerts with filtering.

**Request:**
```bash
curl -X GET "http://localhost:5001/api/alerts?student_id=59&limit=10" \
  -H "Authorization: Bearer {token}"
```

**Query Parameters:**
- `student_id` (number, optional) - Filter by student
- `severity` (string, optional) - 'info', 'warning', 'critical'
- `resolved` (boolean, optional) - Filter by status
- `limit` (number, default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "student_id": 59,
      "alert_type": "low_calorie_intake",
      "severity": "warning",
      "message": "Student consuming significantly below required calories",
      "risk_level": "at_risk",
      "resolved": false,
      "created_at": "2026-05-07T10:30:00Z"
    }
  ],
  "statistics": {
    "total_alerts": 5,
    "active": 4,
    "resolved": 1,
    "critical": 1,
    "warning": 3,
    "info": 1
  }
}
```

---

## Dashboard

### GET /api/dashboard/stats

Get dashboard statistics.

**Request:**
```bash
curl -X GET "http://localhost:5001/api/dashboard/stats" \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_students": 59,
    "healthy_count": 48,
    "at_risk_count": 8,
    "malnourished_count": 3,
    "total_food_logs": 450,
    "active_alerts": 11,
    "avg_bmi": 18.5,
    "risk_distribution": {
      "healthy": 81,
      "at_risk": 14,
      "malnourished": 5
    }
  }
}
```

---

## Authentication Headers

All protected endpoints require JWT token in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate data |
| 500 | Server Error - Database/service issue |
| 503 | Service Unavailable - AI service down |

---

## Rate Limiting

- Scan endpoint: 100 requests/minute
- General API: 1000 requests/minute per user
- Long-running queries: 10 concurrent

---

## Response Format

All responses follow standard format:

**Success:**
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful",
  "statusCode": 200
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400,
  "details": "Additional error info"
}
```

---

## Testing

### Manual Testing with cURL

1. **Login:**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nutrition.com","password":"password123"}'
```

2. **Scan RFID:**
```bash
curl -X POST http://localhost:5001/api/scan \
  -H "Content-Type: application/json" \
  -d '{"rfid_card_id":"RFID-DIET-1778134898996"}'
```

3. **Get Student Profile:**
```bash
curl -X GET http://localhost:5001/api/students/59/details \
  -H "Authorization: Bearer {token}"
```

### Using Postman

1. Import [postman_collection.json](backend/postman_collection.json)
2. Set `base_url` variable to `http://localhost:5001`
3. Run `Login` request first
4. Token auto-saved in `auth_token` variable
5. Run other requests

