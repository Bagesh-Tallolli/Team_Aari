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
  food_preference VARCHAR(50) DEFAULT 'Vegetarian',
  rfid_card_id VARCHAR(100) UNIQUE,
  risk_level VARCHAR(50) DEFAULT 'healthy',
  last_meal_time TIMESTAMP,
  avatar VARCHAR(255),
  admission_number VARCHAR(100),
  dob DATE,
  class_grade VARCHAR(50),
  section VARCHAR(20),
  academic_year VARCHAR(50),
  school_name VARCHAR(150),
  parent_name VARCHAR(150),
  parent_email VARCHAR(150),
  parent_phone VARCHAR(50),
  parent_email_verified BOOLEAN DEFAULT false,
  parent_report_consent BOOLEAN DEFAULT false,
  consent_recorded_at TIMESTAMP,
  consent_recorded_by VARCHAR(100),
  consent_source VARCHAR(100),
  consent_withdrawn_at TIMESTAMP,
  auto_weekly_report_enabled BOOLEAN DEFAULT false,
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

-- Compatibility view for legacy queries targeting diet_plan
CREATE OR REPLACE VIEW diet_plan AS 
  SELECT id, student_id, meal_type, food_item, required_grams 
  FROM diet_plan_items;

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

-- ============================================================
-- 8. WEEKLY_NUTRITION_REPORTS TABLE (Phase 6 AI weekly analysis)
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_nutrition_reports (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  report_data JSONB NOT NULL,
  recorded_days_count INTEGER DEFAULT 0,
  avg_daily_calories DECIMAL(6, 2) DEFAULT 0,
  avg_daily_protein DECIMAL(6, 2) DEFAULT 0,
  target_fulfillment_pct INTEGER DEFAULT 0,
  risk_category VARCHAR(100) DEFAULT 'Normal monitoring',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_student ON weekly_nutrition_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_period ON weekly_nutrition_reports(student_id, report_period_end);

-- ============================================================
-- 9. PARENT_REPORT_DELIVERIES TABLE (Phase 7 Parent Reports & Delivery)
-- ============================================================
CREATE TABLE IF NOT EXISTS parent_report_deliveries (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  weekly_report_id INTEGER,
  parent_email VARCHAR(150) NOT NULL,
  delivery_status VARCHAR(50) NOT NULL DEFAULT 'Queued',
  provider_message_id VARCHAR(255),
  attempt_count INTEGER DEFAULT 1,
  last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  failure_reason TEXT,
  email_subject VARCHAR(255),
  pdf_path VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (weekly_report_id) REFERENCES weekly_nutrition_reports(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_parent_deliveries_student ON parent_report_deliveries(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_deliveries_weekly_report ON parent_report_deliveries(weekly_report_id);
CREATE INDEX IF NOT EXISTS idx_parent_deliveries_status ON parent_report_deliveries(delivery_status);

-- Concurrency safe unique index: only 1 active queued/sent delivery per student & report period unless force_resend is set
CREATE UNIQUE INDEX IF NOT EXISTS uq_parent_delivery_active_dispatch
ON parent_report_deliveries (student_id, weekly_report_id)
WHERE delivery_status IN ('Sent', 'Queued') 
  AND (metadata->>'force_resend' IS NULL OR metadata->>'force_resend' = 'false');

-- ============================================================
-- 10. PARENT_EMAIL_VERIFICATION_TOKENS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS parent_email_verification_tokens (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_email VARCHAR(150) NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  otp_code_hash VARCHAR(64) NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parent_tokens_student ON parent_email_verification_tokens(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_tokens_hash ON parent_email_verification_tokens(token_hash);

-- ============================================================
-- 11. PARENT_CONSENT_HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS parent_consent_history (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  consent_status BOOLEAN NOT NULL,
  action VARCHAR(50) NOT NULL,
  recorded_by_user_id INTEGER,
  recorded_by_name VARCHAR(100),
  source_method VARCHAR(100) NOT NULL,
  notes TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parent_consent_student ON parent_consent_history(student_id);



