# SETUP GUIDE - Nutrition Monitoring Backend

## Prerequisites

Before starting the backend, ensure you have:

- **Node.js** v16 or higher ([Download](https://nodejs.org/))
- **PostgreSQL** v12 or higher ([Download](https://www.postgresql.org/download/))
- **npm** (comes with Node.js)
- **Postman** or **Insomnia** (for API testing) - Optional but recommended

Verify installations:
```bash
node --version
npm --version
psql --version
```

---

## Step 1: PostgreSQL Database Setup

### Windows (Using PostgreSQL Installer)

1. Download PostgreSQL Windows installer from https://www.postgresql.org/download/windows/
2. Run installer and follow prompts
3. Set password for `postgres` user (e.g., `admin`)
4. Note the port (default: 5432)
5. Complete installation

### macOS (Using Homebrew)

```bash
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Verify PostgreSQL is Running

```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql prompt
\l  # List databases
\q  # Exit
```

---

## Step 2: Create Database

### Using pgAdmin (GUI)

1. Open pgAdmin (comes with PostgreSQL)
2. Right-click on **Databases** → **Create** → **Database**
3. Name: `nutrition_db`
4. Click **Save**

### Using Command Line

```bash
# On Windows
psql -U postgres -h localhost

# On macOS/Linux
psql -U postgres

# Inside psql prompt:
CREATE DATABASE nutrition_db;
\c nutrition_db
\q
```

---

## Step 3: Create Database Schema

```bash
# Navigate to project directory
cd backend

# Run schema file
psql -h localhost -U postgres -d nutrition_db -f database/schema.sql
```

Expected output: No errors, tables created.

### Verify Schema

```bash
psql -h localhost -U postgres -d nutrition_db

# Inside psql:
\dt  # List tables (should show: users, students, diet_plans, food_logs, bmi_records, alerts)
\q
```

---

## Step 4: Load Sample Data (Optional)

For development and testing, load sample data:

```bash
psql -h localhost -U postgres -d nutrition_db -f database/seed.sql
```

This inserts:
- 2 admin/staff users
- 8 students with various risk levels
- Diet plans for each student
- Sample food logs
- BMI records with history
- Health alerts

### Verify Data

```bash
psql -h localhost -U postgres -d nutrition_db

# Inside psql:
SELECT COUNT(*) FROM students;  -- Should show 8
SELECT COUNT(*) FROM food_logs;  -- Should show ~20
SELECT COUNT(*) FROM alerts;     -- Should show ~10
\q
```

---

## Step 5: Backend Setup

### Install Dependencies

```bash
cd backend
npm install
```

### Configure Environment

```bash
# Copy example to actual .env file
cp .env.example .env
```

### Edit .env with Your Database Credentials

```env
# SERVER
PORT=5001
NODE_ENV=development

# DATABASE - Update with your PostgreSQL credentials
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=admin    # Change if you set different password
DB_NAME=nutrition_db

# JWT
JWT_SECRET=your_very_secure_secret_key_here
JWT_EXPIRE=7d

# AI SERVICE (Flask microservice)
AI_SERVICE_URL=http://localhost:5000/analyze

# LOGGING
LOG_LEVEL=debug
```

---

## Step 6: Start the Backend Server

### Development Mode (Auto-reload)

```bash
cd backend
npm run dev
```

Expected output:
```
✓ Environment variables validated
✓ Database connected successfully
  Connected to: postgres@localhost:5432/nutrition_db
🚀 Server running on http://localhost:5001
📝 Environment: development
AI Service URL: http://localhost:5000/analyze
```

### Production Mode

```bash
npm start
```

---

## Step 7: Test the API

### Using Postman

1. Install **Postman** from https://www.postman.com/downloads/
2. Import collection: `backend/postman_collection.json`
   - File → Import → Select `postman_collection.json`
3. Set base URL to `http://localhost:5001`
4. Test endpoints (see below)

### Manual Testing with cURL

#### 1. Login

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@nutrition.com",
    "password": "password123"
  }'
```

Response:
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
      "avatar": "..."
    }
  }
}
```

**Save the token for next requests!** Replace `<TOKEN>` below.

#### 2. Get Dashboard Data

```bash
curl -X GET http://localhost:5001/api/dashboard \
  -H "Authorization: Bearer <TOKEN>"
```

#### 3. Get Student List

```bash
curl -X GET "http://localhost:5001/api/students?page=1&limit=20" \
  -H "Authorization: Bearer <TOKEN>"
```

#### 4. Get Student Profile

```bash
curl -X GET http://localhost:5001/api/students/1 \
  -H "Authorization: Bearer <TOKEN>"
```

#### 5. Process RFID Scan

```bash
curl -X POST http://localhost:5001/api/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{ "student_id": 1 }'
```

#### 6. Create Food Log

```bash
curl -X POST http://localhost:5001/api/food-log \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "student_id": 1,
    "food_item": "Rice and Curry",
    "served_grams": 300,
    "estimated_calories": 500,
    "protein": 15,
    "carbs": 70,
    "fats": 20
  }'
```

#### 7. Get Alerts

```bash
curl -X GET "http://localhost:5001/api/alerts?page=1&limit=20" \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Step 8: Test Complete Flow

### Recommended Test Sequence

1. **Login** to get JWT token
2. **Get Dashboard** to see current KPIs
3. **List Students** to see all students
4. **Get Student Profile** (ID 1) to see Aman's details
5. **Process RFID Scan** for student 1
6. **Create Food Log** for student 1
7. **Get Updated Dashboard** to see new metrics
8. **Get Alerts** to see critical alerts
9. **Resolve Alert** to mark one as resolved

---

## Troubleshooting

### Database Connection Failed

**Problem:** `ECONNREFUSED - Database connection failed`

**Solutions:**
1. Verify PostgreSQL is running
   ```bash
   # On Windows (Task Manager → Services → postgres)
   # On macOS: brew services list
   # On Linux: sudo systemctl status postgresql
   ```
2. Check .env file credentials (DB_HOST, DB_USER, DB_PASSWORD)
3. Verify database exists
   ```bash
   psql -h localhost -U postgres -l
   ```

### Module Not Found Error

**Problem:** `Error: Cannot find module...`

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### EADDRINUSE - Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::5001`

**Solutions:**
1. Change PORT in .env file to 5002, 5003, etc.
2. Or kill process using port 5001:
   ```bash
   # On Windows
   netstat -ano | findstr :5001
   taskkill /PID <PID> /F
   
   # On macOS/Linux
   lsof -i :5001
   kill -9 <PID>
   ```

### JWT Token Expired

**Problem:** `Token has expired`

**Solution:** Login again to get new token

### AI Service Unavailable

**Problem:** `AI service is unavailable`

**Note:** This is expected if Flask AI service is not running. The backend will fallback to mock analysis.

To run AI service:
```bash
# In separate terminal, assuming Python Flask service is available
python app.py  # (requires separate Flask backend)
```

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5001 | Server port |
| NODE_ENV | development | development / production |
| DB_HOST | localhost | PostgreSQL host |
| DB_PORT | 5432 | PostgreSQL port |
| DB_USER | postgres | PostgreSQL username |
| DB_PASSWORD | admin | PostgreSQL password |
| DB_NAME | nutrition_db | Database name |
| JWT_SECRET | dev_key | Secret for JWT signing |
| JWT_EXPIRE | 7d | Token expiration time |
| AI_SERVICE_URL | http://localhost:5000/analyze | Flask AI service endpoint |
| LOG_LEVEL | debug | debug / info / warn / error |

---

## Health Check

Verify server is running:

```bash
curl http://localhost:5001/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-03-31T12:00:00.000Z",
  "uptime": 123.456
}
```

---

## Default Test Credentials

### Admin User
- **Email:** `admin@nutrition.com`
- **Password:** `password123`
- **Role:** admin

### Staff User
- **Email:** `staff@nutrition.com`
- **Password:** `password123`
- **Role:** staff

---

## Next Steps

1. ✅ **Backend API** - Now running!
2. **Frontend Integration** - Connect React frontend to these endpoints
3. **ESP32 Integration** - Setup RFID scanning system
4. **AI Flask Service** - Deploy Python nutrition analysis service
5. **Deployment** - Deploy to production server

---

## Support & Documentation

- **API Documentation**: See README.md for endpoint details
- **Database Schema**: See database/schema.sql for table structures
- **Code Structure**: Follow src/ folder organization
- **Error Handling**: Check src/middlewares/errorHandler.js

---

## Quick Commands

```bash
# Start backend (dev mode)
npm run dev

# Start backend (production)
npm start

# Check if running
curl http://localhost:5001/health

# View PostgreSQL tables
psql -U postgres -d nutrition_db -c "\dt"

# View table contents
psql -U postgres -d nutrition_db -c "SELECT COUNT(*) FROM students;"

# Reset database (delete and recreate)
dropdb -U postgres nutrition_db
createdb -U postgres nutrition_db
psql -U postgres -d nutrition_db -f database/schema.sql
psql -U postgres -d nutrition_db -f database/seed.sql
```

---

## Production Deployment Checklist

- [ ] Change `NODE_ENV=production` in .env
- [ ] Generate secure `JWT_SECRET` (min 32 characters)
- [ ] Set strong PostgreSQL password
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure firewall rules
- [ ] Setup database backups
- [ ] Configure environment variables on server
- [ ] Use process manager (PM2, systemd, etc.)
- [ ] Setup monitoring and logging
- [ ] Configure CORS for frontend domain

---

**Backend Setup Complete!** 🎉

Your production-ready nutrition monitoring API is now ready to serve requests!
