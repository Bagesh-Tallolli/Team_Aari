-- ============================================================
-- Migration: Add Gender and RFID Card ID to Students Table
-- ============================================================

-- For SQLite databases:
-- This adds gender and rfid_card_id columns to the students table

-- Step 1: Add gender column if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we handle it manually
ALTER TABLE students ADD COLUMN gender VARCHAR(20);

-- Step 2: Add rfid_card_id column with unique constraint
ALTER TABLE students ADD COLUMN rfid_card_id VARCHAR(100) UNIQUE;

-- Step 3: Create index on rfid_card_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_rfid ON students(rfid_card_id);

-- Step 4: Update existing records with default gender if needed
UPDATE students SET gender = 'Male' WHERE gender IS NULL;

-- Step 5: Make height and weight NOT NULL for new registrations
-- Note: SQLite doesn't support ALTER COLUMN easily, so existing NULLs will remain
-- New registrations will enforce NOT NULL through application logic

-- ============================================================
-- Schema Verification
-- ============================================================
-- To verify the migration was successful, run:
-- SELECT sql FROM sqlite_master WHERE type='table' AND name='students';

-- To check existing records:
-- SELECT id, name, age, gender, height, weight, current_bmi, rfid_card_id FROM students LIMIT 5;
