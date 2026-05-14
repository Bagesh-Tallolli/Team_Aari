# Quick Start - Student Registration System

## 🚀 Fast Setup (5 minutes)

### 1. Apply Database Migration
```bash
cd backend
node scripts/migrate-add-rfid-gender.js
```

You should see:
```
✅ Connected to SQLite database
✓ Add gender column: Success
✓ Add rfid_card_id column: Success
✓ Create index on rfid_card_id: Success
✅ Migration completed successfully!
```

### 2. Start Backend
```bash
cd backend
npm start
```

Expected output:
```
Backend running on http://localhost:5001
```

### 3. Start Frontend
```bash
cd frontend
npm run dev
```

Expected output:
```
Frontend running on http://localhost:5173
```

### 4. Open Registration Page
Navigate to: **http://localhost:5173/students/register**

---

## 📝 Register a Student

### Via UI (Easiest)
1. Click the "Student Registration" link
2. Fill in the form:
   - **Name**: Student's full name
   - **Age**: 5-20 years
   - **Gender**: Male, Female, or Other
   - **Height**: In centimeters (e.g., 155)
   - **Weight**: In kilograms (e.g., 48)
   - **RFID Card ID**: Unique identifier (e.g., RFID-12345)
   - **Email**: Optional

3. BMI will auto-calculate (display only)
4. Click "Register Student"
5. Success! Student appears in "Just Registered" section

### Via API (Curl)
```bash
curl -X POST http://localhost:5001/api/students/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Singh",
    "age": 12,
    "gender": "Female",
    "height": 150,
    "weight": 45,
    "rfid_card_id": "RFID-10001",
    "email": "priya@school.edu"
  }'
```

Success response:
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": 1,
    "name": "Priya Singh",
    "age": 12,
    "gender": "Female",
    "height": 150,
    "weight": 45,
    "current_bmi": 20,
    "rfid_card_id": "RFID-10001",
    "email": "priya@school.edu",
    "created_at": "2026-05-04T10:30:00Z"
  },
  "message": "Student registered successfully"
}
```

---

## ✅ Key Features

### ✓ BMI Auto-Calculated
- Server computes: `weight / (height/100)²`
- Always accurate (computed on backend)
- Never accepts client values
- Stored in database

### ✓ RFID Unique per Student
- Each RFID ID can only be used once
- Database enforces uniqueness
- Try duplicate → 409 Conflict error
- Ready for RFID scanner integration

### ✓ Full Validation
- Age: 5-20 years
- Height: 80-200 cm
- Weight: 10-150 kg
- All required fields enforced

### ✓ Error Handling
- Clear error messages
- Toast notifications
- Structured error responses
- Validation details on failure

---

## 🧪 Test the System

### Run Full Integration Tests
```bash
node backend/scripts/test-student-registration.js
```

This will:
- ✓ Register 2 students
- ✓ Test duplicate RFID rejection
- ✓ Test validation
- ✓ Test error handling

Expected output:
```
✅ All Integration Tests Passed!

📊 Test Summary:
   ✓ Student registration works
   ✓ BMI auto-calculation on server
   ✓ RFID uniqueness enforced
   ✓ Data validation working
   ✓ Error handling proper
```

### Manual UI Test
1. Register student 1: "John Doe", RFID: "RFID-001"
2. Register student 2: "Jane Doe", RFID: "RFID-002"
3. Try to register with RFID: "RFID-001" → Should fail
4. Check "Recently Registered" section shows both

---

## 📋 Database Check

### View Registered Students (SQLite)
```bash
sqlite3 backend/nutrition_db.sqlite

SELECT id, name, age, gender, height, weight, current_bmi, rfid_card_id FROM students;
```

Example output:
```
id | name        | age | gender | height | weight | current_bmi | rfid_card_id
1  | Priya Singh | 12  | Female | 150    | 45     | 20          | RFID-10001
2  | Raj Kumar   | 13  | Male   | 155    | 48     | 19.98       | RFID-10002
```

---

## 🔗 File Structure

```
backend/
├── database/
│   ├── schema.sql (updated)
│   └── migration_add_rfid_gender.sql (new)
├── scripts/
│   ├── migrate-add-rfid-gender.js (new)
│   └── test-student-registration.js (new)
├── src/
│   ├── controllers/
│   │   └── studentController.js (updated - added registerStudent)
│   ├── models/
│   │   └── studentModel.js (updated - added createStudent)
│   ├── routes/
│   │   └── studentRoutes.js (updated - added POST /register)
│   ├── services/
│   │   └── studentService.js (updated - added registerStudent)
│   └── middlewares/
│       └── validationMiddleware.js (updated - added register schema)

frontend/
├── src/
│   ├── App.jsx (updated - added /students/register route)
│   ├── features/students/
│   │   ├── components/
│   │   │   └── StudentRegistrationForm.jsx (new)
│   │   └── pages/
│   │       └── StudentRegistrationPage.jsx (new)
│   └── services/
│       └── apiService.js (updated - added registerStudent method)
```

---

## 🎯 Common Tasks

### Register a Batch of Students
Create a script to loop through and register multiple students:
```bash
# See: backend/scripts/test-student-registration.js for reference
```

### Update Student Data
```bash
# Use PUT /api/students/:id endpoint
```

### View All Students
Navigate to: **http://localhost:5173/students**

### Get Student Details
Click on student row in the list

---

## 🚨 Troubleshooting

### Error: "RFID card already registered"
- **Problem**: Tried to register with duplicate RFID
- **Solution**: Use a unique RFID card ID

### Error: "Age must be at least 5"
- **Problem**: Age is less than 5 years
- **Solution**: Enter age between 5-20

### Error: "Height must be at least 80 cm"
- **Problem**: Height is less than 80 cm
- **Solution**: Enter height in reasonable range

### Migration fails: "duplicate column"
- **Problem**: Columns already exist
- **Solution**: Already migrated! Safe to ignore.

### Connection refused on API
- **Problem**: Backend not running
- **Solution**: Run `cd backend && npm start`

---

## 📞 Support

For issues:
1. Check logs in terminal
2. Review error message details
3. Run integration tests: `node backend/scripts/test-student-registration.js`
4. Check database directly: `sqlite3 backend/nutrition_db.sqlite`

---

## ✨ Next Steps

After registration is working:

1. **Integrate RFID Scanner**
   - Map RFID reads to student IDs
   - Trigger food log on scan

2. **Add Food Logging**
   - Log food items from RFID scans
   - Get AI predictions

3. **Real-time Notifications**
   - Alert on nutritional issues
   - Send to guardians/school

4. **Analytics Dashboard**
   - View nutrition trends
   - Compare students
   - Track BMI changes

---

**Status**: 🟢 System Ready for Use
