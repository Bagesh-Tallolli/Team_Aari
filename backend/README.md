# Backend API - Nutrition Monitoring System

Production-ready Node.js/Express backend for the AI-Based Smart Nutrition Monitoring & Automated Food Distribution System.

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT + bcryptjs
- **Validation**: Joi
- **HTTP Client**: Axios (for AI service)
- **Request Logging**: Morgan

## Quick Start

### Prerequisites

- Node.js (v16+)
- PostgreSQL (v12+)
- npm or yarn

### Installation

1. **Clone the repository** and navigate to backend folder
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup PostgreSQL Database**
   - Create database: `CREATE DATABASE nutrition_db;`
   - Or use the provided schema file:
   ```bash
   psql -h localhost -U postgres -d nutrition_db -f database/schema.sql
   ```

4. **Load Sample Data** (optional, for development)
   ```bash
   psql -h localhost -U postgres -d nutrition_db -f database/seed.sql
   ```

5. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your PostgreSQL credentials and JWT secret:
   ```
   PORT=5001
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=nutrition_db
   JWT_SECRET=your_very_secure_secret_key
   JWT_EXPIRE=7d
   AI_SERVICE_URL=http://localhost:5000/analyze
   ```

6. **Start the Server**
   ```bash
   # Development (with auto-reload)
   npm run dev

   # Production
   npm start
   ```

Server will start on `http://localhost:5001`

## Project Structure

```
src/
├── controllers/         # HTTP request handlers
├── routes/             # API route definitions
├── services/           # Business logic and orchestration
├── models/             # Database queries (repositories)
├── middlewares/        # Express middlewares (auth, validation, error handling)
├── config/             # Environment and database configuration
├── utils/              # Utility functions and helpers
├── app.js              # Express app setup
└── server.js           # Server entry point

database/
├── schema.sql          # PostgreSQL table definitions
└── seed.sql            # Sample data for development
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/verify` - Verify JWT token

### RFID Scanning
- `POST /api/scan` - Process RFID scan

### Food Logging
- `POST /api/food-log` - Log food intake
- `GET /api/food-log/:id` - Get food log details

### Student Management
- `GET /api/students` - List all students
- `GET /api/students/:id` - Get student details with history

### Dashboard
- `GET /api/dashboard` - Get aggregated dashboard data

### Alerts
- `GET /api/alerts` - Get all health alerts
- `PUT /api/alerts/:id` - Mark alert as resolved

### Analysis
- `POST /api/analyze` - Proxy to AI service

## Authentication

The API uses **JWT (JSON Web Token)** for authentication.

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@nutrition.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "Login successful",
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

### Using Token
Include token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Default Credentials (for testing)

**Admin User:**
- Email: `admin@nutrition.com`
- Password: `password123`

**Staff User:**
- Email: `staff@nutrition.com`
- Password: `password123`

## Sample Data

The `database/seed.sql` includes:
- 8 students with varied risk levels
- 8 diet plans
- ~20 food logs
- BMI history with trends
- Sample alerts and monitoring data

## Development

### Running in Development Mode
```bash
npm run dev
```
Server auto-reloads on file changes.

### Testing Endpoints
Use Postman/Insomnia to test endpoints:
1. Import collection from `postman/collection.json` (if available)
2. Or manually create requests

Example test:
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@nutrition.com",
    "password": "password123"
  }'
```

## Error Handling

All errors follow consistent format:
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400,
  "errors": [
    { "field": "email", "message": "Email is required" }
  ]
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation)
- `401` - Unauthorized (auth failed)
- `403` - Forbidden (permission denied)
- `404` - Not Found
- `500` - Server Error

## Database

### Connection Pooling
- Min connections: 2
- Max connections: 10
- Idle timeout: 30 seconds
- Connection timeout: 5 seconds

### Queries
All database queries use **parameterized statements** to prevent SQL injection.

Example:
```javascript
// SAFE: Parameterized query
const result = await query(
  'SELECT * FROM students WHERE id = $1',
  [studentId]
);

// UNSAFE: String concatenation (DON'T USE)
const result = await query(
  `SELECT * FROM students WHERE id = ${studentId}`
);
```

## Database Schema

### Tables

**users** - Admin/staff authentication
**students** - Student profiles with BMI tracking
**diet_plans** - Nutrition targets per student
**food_logs** - Food consumption history
**bmi_records** - BMI history with metrics
**alerts** - Health alerts and notifications

See `database/schema.sql` for complete schema.

## AI Service Integration

The backend proxies requests to a Flask AI service at `http://localhost:5000/analyze`.

**Expected AI Service Response:**
```json
{
  "bmi": 25.5,
  "status": "overweight",
  "risk": "at_risk",
  "recommendations": "Reduce caloric intake...",
  "analysis": "..."
}
```

## Deployment

### Environment Variables (Production)
```
NODE_ENV=production
PORT=5001
DB_HOST=<your_db_host>
DB_USER=<your_db_user>
DB_PASSWORD=<secure_password>
DB_NAME=nutrition_db
JWT_SECRET=<very_secure_random_key>
AI_SERVICE_URL=<production_ai_service_url>
```

### Running in Production
```bash
npm start
```

Consider using process managers:
- **PM2**: `pm2 start src/server.js --name nutrition-api`
- **forever**: `forever start src/server.js`
- **systemd**: Create service file

## Logging

Logs are printed to console with timestamps and severity levels:
- 🔍 `INFO` - General information
- ⚠️ `WARN` - Warnings
- ❌ `ERROR` - Errors
- 🐛 `DEBUG` - Debug info (dev only)

## Testing

To test API endpoints, you can:
1. Use Postman/Insomnia
2. Use curl commands
3. Write automated tests (Node.js test runner or Jest)

## Next Steps

1. ✅ Phase 1: Foundation & Auth (COMPLETED)
2. ⏳ Phase 2: Core Business Logic
   - Student models and queries
   - Food Log service
   - Dashboard aggregation
   - Alert management
3. ⏳ Phase 3: AI Integration & Refinement
   - AI service wrapper
   - Risk analysis and alerts
   - Dashboard metrics

## Support

For issues or questions, refer to:
- Database schema: `database/schema.sql`
- Example requests: See endpoint documentation above
- Error handling: `src/middlewares/errorHandler.js`

## License

ISC

---

**Last Updated**: March 31, 2026
**Backend Version**: 1.0.0
