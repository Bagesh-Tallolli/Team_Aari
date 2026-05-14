-- ============================================================
-- AI-Based Smart Nutrition Monitoring System - Database Schema
-- PostgreSQL Database
-- ============================================================

-- Drop existing tables (for fresh migration)
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS bmi_records CASCADE;
DROP TABLE IF EXISTS food_logs CASCADE;
DROP TABLE IF EXISTS diet_plans CASCADE;
DROP TABLE IF EXISTS health_status CASCADE;
DROP TABLE IF EXISTS diet_plan_items CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- 1. USERS TABLE (for admin/staff authentication)
-- ============================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'staff',
  avatar VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- 2. STUDENTS TABLE (main student profiles)
-- ============================================================
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  age INTEGER NOT NULL,
  gender VARCHAR(20),
  height DECIMAL(5, 2) NOT NULL,
  weight DECIMAL(5, 2) NOT NULL,
  current_bmi DECIMAL(5, 2),
  rfid_card_id VARCHAR(100) UNIQUE,
  risk_level VARCHAR(50) DEFAULT 'healthy',
  last_meal_time TIMESTAMP,
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_risk_level ON students(risk_level);
CREATE INDEX idx_students_created_at ON students(created_at);
CREATE INDEX idx_students_rfid ON students(rfid_card_id);

-- ============================================================
-- 3. HEALTH_STATUS TABLE (AI health predictions)
-- ============================================================
CREATE TABLE health_status (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  bmi DECIMAL(5, 2),
  calories DECIMAL(7, 2),
  protein DECIMAL(6, 2),
  status VARCHAR(50),
  ai_prediction JSONB,
  confidence DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX idx_health_status_student_id ON health_status(student_id);
CREATE INDEX idx_health_status_created_at ON health_status(created_at);
CREATE INDEX idx_health_status_student_created ON health_status(student_id, created_at);

-- ============================================================
-- 4. DIET_PLANS TABLE (personalized meal items per student)
-- ============================================================
CREATE TABLE diet_plan_items (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  meal_type VARCHAR(50) NOT NULL,
  food_item VARCHAR(100) NOT NULL,
  required_grams DECIMAL(6, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX idx_diet_plan_items_student_id ON diet_plan_items(student_id);
CREATE INDEX idx_diet_plan_items_meal_type ON diet_plan_items(student_id, meal_type);

-- ============================================================
-- 5. FOOD_LOGS TABLE (log of food servings)
-- ============================================================
CREATE TABLE food_logs (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  food_item VARCHAR(100) NOT NULL,
  served_grams DECIMAL(6, 2),
  estimated_calories DECIMAL(6, 2),
  protein DECIMAL(6, 2),
  carbs DECIMAL(6, 2),
  fats DECIMAL(6, 2),
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX idx_food_logs_student_id ON food_logs(student_id);
CREATE INDEX idx_food_logs_logged_at ON food_logs(logged_at);
CREATE INDEX idx_food_logs_student_logged ON food_logs(student_id, logged_at);

-- ============================================================
-- 6. BMI_RECORDS TABLE (BMI history with calculated metrics)
-- ============================================================
CREATE TABLE bmi_records (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  bmi DECIMAL(5, 2),
  weight DECIMAL(5, 2),
  height DECIMAL(5, 2),
  status VARCHAR(50),
  risk_flag VARCHAR(50) DEFAULT 'healthy',
  ai_analysis TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX idx_bmi_records_student_id ON bmi_records(student_id);
CREATE INDEX idx_bmi_records_created_at ON bmi_records(created_at);

-- ============================================================
-- 7. ALERTS TABLE (health alerts for at-risk students)
-- ============================================================
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'info',
  message TEXT NOT NULL,
  risk_level VARCHAR(50),
  bmi_value DECIMAL(5, 2),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX idx_alerts_student_id ON alerts(student_id);
CREATE INDEX idx_alerts_resolved ON alerts(resolved);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
