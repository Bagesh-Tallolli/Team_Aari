-- Migration 002: Add parent communication and academic fields to students, and Phase 7 tables

-- 1. Add academic and school fields to students (if not already present)
ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_number VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_grade VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS section VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_name VARCHAR(150);

-- 2. Add parent communication & consent fields to students (if not already present)
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name VARCHAR(150);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email VARCHAR(150);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email_verified BOOLEAN DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_report_consent BOOLEAN DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS consent_recorded_at TIMESTAMP;
ALTER TABLE students ADD COLUMN IF NOT EXISTS consent_recorded_by VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS consent_source VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS consent_withdrawn_at TIMESTAMP;
ALTER TABLE students ADD COLUMN IF NOT EXISTS auto_weekly_report_enabled BOOLEAN DEFAULT false;

-- 3. Create Phase 7 Parent Reports & Delivery tables
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_parent_delivery_active_dispatch
ON parent_report_deliveries (student_id, weekly_report_id)
WHERE delivery_status IN ('Sent', 'Queued') 
  AND (metadata->>'force_resend' IS NULL OR metadata->>'force_resend' = 'false');

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

