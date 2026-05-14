-- Migration: Add diet_plan column to health_status table
-- Purpose: Store personalized diet recommendations from AI model

ALTER TABLE health_status ADD COLUMN IF NOT EXISTS diet_plan JSONB;

-- Create index for faster diet plan queries
CREATE INDEX IF NOT EXISTS idx_health_status_diet_plan ON health_status USING GIN(diet_plan);

-- Add reason column if it doesn't exist (for storing AI analysis reason)
ALTER TABLE health_status ADD COLUMN IF NOT EXISTS reason TEXT;

-- Add required_calories column for tracking calorie requirements
ALTER TABLE health_status ADD COLUMN IF NOT EXISTS required_calories DECIMAL(7, 2);

-- Add avg_weekly_calories for storing the weekly average
ALTER TABLE health_status ADD COLUMN IF NOT EXISTS avg_weekly_calories DECIMAL(7, 2);

-- Verify schema
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'health_status' 
ORDER BY ordinal_position;
