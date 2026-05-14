# API ENDPOINTS DOCUMENTATION

## Base URL
```
http://localhost:5001/api
```

## Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## 1. AUTHENTICATION ENDPOINTS

### POST /auth/login
Login with email and password. Returns JWT token and user information.

**Permission:** Public (No authentication required)

**Request Body:**
```json
{
  "email": "admin@nutrition.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "statusCode": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "admin@nutrition.com",
      "name": "Admin User",
      "role": "admin",
      "avatar": "https://..."
    }
  }
}
```

**Error (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid email or password",
  "statusCode": 401
}
```

---

### GET /auth/verify
Verify current JWT token and get user information.

**Permission:** Requires authentication

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token verified",
  "statusCode": 200,
  "data": {
    "id": 1,
    "email": "admin@nutrition.com",
    "name": "Admin User",
    "role": "admin",
    "avatar": "https://..."
  }
}
```

---

## 2. RFID SCAN ENDPOINTS

### POST /scan
Process RFID scan for a student. Returns student info and diet plan.

**Permission:** Requires authentication

**Request Body:**
```json
{
  "student_id": 1
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Scan processed successfully",
  "statusCode": 200,
  "data": {
    "student": {
      "id": 1,
      "name": "Aman Kumar",
      "current_bmi": 22.49,
      "risk_level": "healthy"
    },
    "diet_plan": {
      "target_calories": 2200,
      "target_protein": 60,
      "target_carbs": 320,
      "target_fats": 70
    },
    "food_item": "To be selected from POS system",
    "required_grams": 367
  }
}
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "message": "Student not found",
  "statusCode": 404
}
```

---

## 3. FOOD LOG ENDPOINTS

### POST /food-log
Log food intake. Automatically triggers AI analysis and generates alerts if risk detected.

**Permission:** Requires authentication

**Request Body:**
```json
{
  "student_id": 1,
  "food_item": "Chicken Biryani",
  "served_grams": 250,
  "estimated_calories": 450,
  "protein": 25,
  "carbs": 55,
  "fats": 18
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Food log processed and analyzed successfully",
  "statusCode": 201,
  "data": {
    "id": 15,
    "student_id": 1,
    "food_item": "Chicken Biryani",
    "served_grams": 250,
    "estimated_calories": 450,
    "protein": 25,
    "carbs": 55,
    "fats": 18,
    "logged_at": "2024-03-31T12:30:00.000Z",
    "created_at": "2024-03-31T12:30:00.000Z"
  }
}
```

---

### GET /food-log/student/:id
Get food log history for a student.

**Permission:** Requires authentication

**Parameters:**
- `id` (path): Student ID

**Query Parameters:**
- `days` (optional): Number of days to look back (default: 7)

**Example:** `GET /food-log/student/1?days=7`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Food history retrieved",
  "statusCode": 200,
  "data": {
    "food_logs": [
      {
        "id": 15,
        "food_item": "Chicken Biryani",
        "served_grams": 250,
        "estimated_calories": 450,
        "logged_at": "2024-03-31T12:30:00.000Z"
      }
    ],
    "daily_summary": {
      "count": 2,
      "total_calories": 730,
      "total_protein": 40,
      "total_carbs": 90,
      "total_fats": 32
    },
    "bmi_history": [
      {
        "id": 1,
        "bmi": 22.49,
        "weight": 65,
        "height": 170,
        "status": "normal",
        "risk_flag": "healthy",
        "created_at": "2024-03-31T12:00:00.000Z"
      }
    ]
  }
}
```

---

## 4. STUDENT ENDPOINTS

### GET /students
List all students with pagination and filtering.

**Permission:** Requires authentication

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search by name or email
- `riskLevel` (optional): Filter by risk level (healthy, at_risk, critical)

**Example:** `GET /students?page=1&limit=20&riskLevel=at_risk`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Students retrieved",
  "statusCode": 200,
  "data": {
    "students": [
      {
        "id": 1,
        "name": "Aman Kumar",
        "email": "aman@student.com",
        "age": 20,
        "height": 170,
        "weight": 65,
        "current_bmi": 22.49,
        "risk_level": "healthy",
        "avatar": "https://..."
      }
    ],
    "total": 8,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### GET /students/:id
Get complete student profile with diet plan, food logs, and BMI history.

**Permission:** Requires authentication

**Parameters:**
- `id` (path): Student ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Student profile retrieved",
  "statusCode": 200,
  "data": {
    "student": {
      "id": 1,
      "name": "Aman Kumar",
      "email": "aman@student.com",
      "age": 20,
      "height": 170,
      "weight": 65,
      "current_bmi": 22.49,
      "risk_level": "healthy",
      "avatar": "https://..."
    },
    "diet_plan": {
      "id": 1,
      "student_id": 1,
      "target_calories": 2200,
      "target_protein": 60,
      "target_carbs": 320,
      "target_fats": 70,
      "dietary_restrictions": "None"
    },
    "food_logs": [
      {
        "id": 15,
        "student_id": 1,
        "food_item": "Chicken Biryani",
        "served_grams": 250,
        "estimated_calories": 450,
        "protein": 25,
        "carbs": 55,
        "fats": 18,
        "logged_at": "2024-03-31T12:30:00.000Z"
      }
    ],
    "bmi_history": [
      {
        "id": 1,
        "bmi": 22.49,
        "weight": 65,
        "height": 170,
        "status": "normal",
        "risk_flag": "healthy",
        "created_at": "2024-03-31T12:00:00.000Z"
      }
    ],
    "daily_summary": {
      "total_calories": 450,
      "total_protein": 25,
      "total_carbs": 55,
      "total_fats": 18
    }
  }
}
```

---

### GET /students/at-risk
Get all students with at-risk or critical health status.

**Permission:** Requires authentication

**Response (200 OK):**
```json
{
  "success": true,
  "message": "At-risk students retrieved",
  "statusCode": 200,
  "data": [
    {
      "id": 3,
      "name": "Raj Patel",
      "current_bmi": 27.12,
      "risk_level": "at_risk",
      "weight": 86.2,
      "height": 178
    }
  ]
}
```

---

## 5. DASHBOARD ENDPOINTS

### GET /dashboard
Get aggregated dashboard data including KPIs, BMI trends, nutrition metrics.

**Permission:** Requires authentication

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Dashboard data retrieved",
  "statusCode": 200,
  "data": {
    "kpis": {
      "total_students": 8,
      "meals_today": 15,
      "avg_bmi": 25.34,
      "at_risk_count": 3
    },
    "alerts": {
      "healthy": 10,
      "at_risk": 8,
      "critical": 2
    },
    "bmi_trend": [
      {
        "date": "2024-03-30",
        "avg_bmi": 25.20,
        "students": 8
      },
      {
        "date": "2024-03-31",
        "avg_bmi": 25.34,
        "students": 8
      }
    ],
    "food_intake": {
      "avg_calories": 485.5,
      "avg_protein": 22.5,
      "avg_carbs": 58.3,
      "avg_fats": 19.2,
      "total_logs": 15
    },
    "risk_distribution": {
      "healthy": 5,
      "at_risk": 2,
      "critical": 1
    },
    "recent_activity": [
      {
        "type": "food_log",
        "student_id": 1,
        "student_name": "Aman Kumar",
        "description": "Chicken Biryani",
        "timestamp": "2024-03-31T12:30:00.000Z"
      }
    ],
    "timestamp": "2024-03-31T12:35:00.000Z"
  }
}
```

---

## 6. ALERT ENDPOINTS

### GET /alerts
Get all health alerts with filtering and pagination.

**Permission:** Requires authentication

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `riskLevel` (optional): Filter by risk level (healthy, at_risk, critical)
- `resolved` (optional): Filter by resolution status (true/false)

**Example:** `GET /alerts?page=1&limit=20&riskLevel=critical&resolved=false`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Alerts retrieved",
  "statusCode": 200,
  "data": {
    "alerts": [
      {
        "id": 1,
        "student_id": 6,
        "student_name": "Sneha Desai",
        "risk_level": "critical",
        "message": "CRITICAL HEALTH ALERT: BMI is 30.51 (Obese).",
        "category": "bmi_critical",
        "action_url": "/students/6",
        "resolved": false,
        "created_at": "2024-03-29T10:00:00.000Z"
      }
    ],
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "stats": {
      "healthy": 3,
      "at_risk": 5,
      "critical": 2
    }
  }
}
```

---

### GET /alerts/stats
Get alert statistics summary.

**Permission:** Requires authentication

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Alert statistics retrieved",
  "statusCode": 200,
  "data": {
    "healthy": 3,
    "at_risk": 5,
    "critical": 2
  }
}
```

---

### GET /alerts/student/:studentId
Get alerts for specific student.

**Permission:** Requires authentication

**Parameters:**
- `studentId` (path): Student ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Student alerts retrieved",
  "statusCode": 200,
  "data": [
    {
      "id": 5,
      "student_id": 3,
      "student_name": "Raj Patel",
      "risk_level": "at_risk",
      "message": "WARNING: BMI increased to 27.12 (Overweight).",
      "category": "bmi_warning",
      "created_at": "2024-03-30T14:00:00.000Z"
    }
  ]
}
```

---

### PUT /alerts/:id
Mark alert as resolved.

**Permission:** Requires authentication

**Parameters:**
- `id` (path): Alert ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Alert resolved",
  "statusCode": 200,
  "data": {
    "id": 1,
    "student_id": 6,
    "student_name": "Sneha Desai",
    "risk_level": "critical",
    "message": "CRITICAL HEALTH ALERT: BMI is 30.51 (Obese).",
    "resolved": true,
    "resolved_at": "2024-03-31T12:40:00.000Z"
  }
}
```

---

## HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Validation error in request |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User lacks permission |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate) |
| 500 | Server Error | Internal server error |
| 503 | Service Unavailable | AI service or database unavailable |

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400,
  "errors": [
    {
      "field": "email",
      "message": "Email must be valid"
    }
  ]
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. Production deployment should include:
- IP-based rate limiting
- User-based request throttling
- API key management

---

## CORS

The API is configured to accept requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (React dev server)
- All origins (`*`) in development

For production, update CORS configuration to specific frontend domain.

---

## Response Time Expectations

- **Login**: ~50-100ms
- **List Students**: ~100-150ms
- **Get Student Profile**: ~150-200ms
- **Create Food Log**: ~300-500ms (includes AI analysis)
- **Dashboard Data**: ~200-300ms

---

## Testing Tips

1. **Use Postman** to import `postman_collection.json` for easy testing
2. **Save token** in Postman variables after login
3. **Test with different students** (IDs 1-8)
4. **Check for alerts** after creating food logs with unusual intake
5. **Monitor response times** for performance analysis

---

## Example Complete Flow

```bash
# 1. Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nutrition.com","password":"password123"}'

# Save token from response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Get Dashboard
curl -X GET http://localhost:5001/api/dashboard \
  -H "Authorization: Bearer $TOKEN"

# 3. Get Student (ID 3 - at risk)
curl -X GET http://localhost:5001/api/students/3 \
  -H "Authorization: Bearer $TOKEN"

# 4. Create Food Log
curl -X POST http://localhost:5001/api/food-log \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "student_id":3,
    "food_item":"French Fries",
    "served_grams":200,
    "estimated_calories":365,
    "protein":3,"carbs":48,"fats":17
  }'

# 5. Check Alerts
curl -X GET "http://localhost:5001/api/alerts?riskLevel=at_risk" \
  -H "Authorization: Bearer $TOKEN"
```

---

**Last Updated:** March 31, 2026
**API Version:** 1.0.0
**Status:** Production Ready ✅
