-- ============================================================
-- Sample Data for Nutrition Monitoring System
-- SQLite Version
-- ============================================================

-- ============================================================
-- 1. INSERT USERS (admin and staff)
-- ============================================================
INSERT INTO users (email, password_hash, name, role, avatar, active, created_at) VALUES
('admin@nutrition.com', '$2a$10$L9/UIy5rXDjVviFJB0txuu5sBuLqP1qiZsRz1yJT0KhHAGQXDGdTK', 'Admin User', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', 1, CURRENT_TIMESTAMP),
('staff@nutrition.com', '$2a$10$L9/UIy5rXDjVviFJB0txuu5sBuLqP1qiZsRz1yJT0KhHAGQXDGdTK', 'Staff Member', 'staff', 'https://api.dicebear.com/7.x/avataaars/svg?seed=staff', 1, CURRENT_TIMESTAMP);

-- ============================================================
-- 2. INSERT STUDENTS
-- ============================================================
INSERT INTO students (name, email, age, height, weight, current_bmi, risk_level, avatar, created_at) VALUES
('Aman Kumar', 'aman@student.com', 20, 170.00, 65.00, 22.49, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=aman', CURRENT_TIMESTAMP),
('Priya Singh', 'priya@student.com', 19, 160.00, 58.00, 22.66, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya', CURRENT_TIMESTAMP),
('Raj Patel', 'raj@student.com', 21, 178.00, 85.00, 26.84, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=raj', CURRENT_TIMESTAMP),
('Neha Sharma', 'neha@student.com', 20, 165.00, 80.00, 29.39, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=neha', CURRENT_TIMESTAMP),
('Rohan Gupta', 'rohan@student.com', 22, 182.00, 95.00, 28.63, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rohan', CURRENT_TIMESTAMP),
('Sneha Desai', 'sneha@student.com', 20, 158.00, 75.00, 30.06, 'critical', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sneha', CURRENT_TIMESTAMP),
('Aditya Verma', 'aditya@student.com', 19, 175.00, 62.00, 20.20, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=aditya', CURRENT_TIMESTAMP),
('Meera Nair', 'meera@student.com', 21, 162.00, 52.00, 19.82, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=meera', CURRENT_TIMESTAMP);

-- ============================================================
-- 3. INSERT DIET PLANS for each student
-- ============================================================
INSERT INTO diet_plans (student_id, target_calories, target_protein, target_carbs, target_fats, dietary_restrictions, created_at) VALUES
(1, 2200, 60.00, 320.00, 70.00, 'None', CURRENT_TIMESTAMP),
(2, 2000, 50.00, 300.00, 65.00, 'Vegetarian', CURRENT_TIMESTAMP),
(3, 2400, 70.00, 340.00, 80.00, 'None', CURRENT_TIMESTAMP),
(4, 2000, 50.00, 300.00, 65.00, 'Low Fat', CURRENT_TIMESTAMP),
(5, 2600, 80.00, 360.00, 85.00, 'None', CURRENT_TIMESTAMP),
(6, 1800, 45.00, 270.00, 60.00, 'High Protein', CURRENT_TIMESTAMP),
(7, 2200, 55.00, 320.00, 75.00, 'None', CURRENT_TIMESTAMP),
(8, 2000, 50.00, 300.00, 65.00, 'Gluten Free', CURRENT_TIMESTAMP);

-- ============================================================
-- 4. INSERT FOOD LOGS for various meals
-- ============================================================
INSERT INTO food_logs (student_id, food_item, served_grams, estimated_calories, protein, carbs, fats, logged_at, created_at) VALUES
-- Student 1 - Aman Kumar
(1, 'Chicken Biryani', 250.00, 450.00, 25.00, 55.00, 18.00, datetime('now', '-1 day'), CURRENT_TIMESTAMP),
(1, 'Mixed Vegetable Salad', 150.00, 80.00, 5.00, 12.00, 3.00, datetime('now', '-12 hours'), CURRENT_TIMESTAMP),
(1, 'Whole Wheat Bread', 100.00, 265.00, 10.00, 50.00, 3.00, datetime('now', '-6 hours'), CURRENT_TIMESTAMP),

-- Student 2 - Priya Singh
(2, 'Paneer Tikka', 200.00, 320.00, 28.00, 8.00, 20.00, datetime('now', '-1 day'), CURRENT_TIMESTAMP),
(2, 'Brown Rice', 200.00, 260.00, 6.00, 58.00, 2.00, datetime('now', '-18 hours'), CURRENT_TIMESTAMP),
(2, 'Apple', 200.00, 104.00, 0.50, 27.00, 0.30, datetime('now', '-8 hours'), CURRENT_TIMESTAMP),

-- Student 3 - Raj Patel (at_risk)
(3, 'Mutton Curry', 300.00, 480.00, 35.00, 20.00, 22.00, datetime('now', '-1 day'), CURRENT_TIMESTAMP),
(3, 'French Fries', 200.00, 365.00, 3.00, 48.00, 17.00, datetime('now', '-12 hours'), CURRENT_TIMESTAMP),
(3, 'Soft Drink', 500.00, 215.00, 0.00, 55.00, 0.00, datetime('now', '-4 hours'), CURRENT_TIMESTAMP),

-- Student 4 - Neha Sharma (at_risk)
(4, 'Butter Chicken', 280.00, 420.00, 30.00, 15.00, 25.00, datetime('now', '-1 day'), CURRENT_TIMESTAMP),
(4, 'Naan Bread', 150.00, 350.00, 8.00, 50.00, 12.00, datetime('now', '-10 hours'), CURRENT_TIMESTAMP),
(4, 'Ice Cream', 150.00, 240.00, 4.00, 30.00, 12.00, datetime('now', '-5 hours'), CURRENT_TIMESTAMP),

-- Student 5 - Rohan Gupta (at_risk)
(5, 'Fish Curry', 300.00, 420.00, 40.00, 15.00, 18.00, datetime('now', '-1 day'), CURRENT_TIMESTAMP),
(5, 'Fried Rice', 250.00, 380.00, 8.00, 48.00, 16.00, datetime('now', '-14 hours'), CURRENT_TIMESTAMP),
(5, 'Samosa', 200.00, 380.00, 6.00, 42.00, 20.00, datetime('now', '-3 hours'), CURRENT_TIMESTAMP),

-- Student 6 - Sneha Desai (critical)
(6, 'Pav Bhaji', 400.00, 520.00, 12.00, 65.00, 24.00, datetime('now', '-1 day'), CURRENT_TIMESTAMP),
(6, 'Aloo Paratha', 300.00, 450.00, 10.00, 60.00, 20.00, datetime('now', '-16 hours'), CURRENT_TIMESTAMP),
(6, 'Chocolate', 100.00, 535.00, 8.00, 56.00, 31.00, datetime('now', '-2 hours'), CURRENT_TIMESTAMP);

-- ============================================================
-- 5. INSERT BMI RECORDS
-- ============================================================
INSERT INTO bmi_records (student_id, bmi, weight, height, status, risk_flag, ai_analysis, created_at) VALUES
(1, 22.49, 65.00, 170.00, 'normal', 'healthy', 'BMI is in healthy range. Maintain current diet and exercise routine.', datetime('now', '-5 days')),
(1, 22.51, 65.20, 170.00, 'normal', 'healthy', 'Stable BMI. Continue with balanced nutrition.', datetime('now', '-2 days')),
(1, 22.49, 65.00, 170.00, 'normal', 'healthy', 'Excellent health metrics. Keep up good habits.', CURRENT_TIMESTAMP),

(2, 22.66, 58.00, 160.00, 'normal', 'healthy', 'Weight is healthy. Vegetarian diet is well-balanced.', datetime('now', '-3 days')),
(2, 22.68, 58.10, 160.00, 'normal', 'healthy', 'Continue with current nutrition plan.', CURRENT_TIMESTAMP),

(3, 26.84, 85.00, 178.00, 'overweight', 'at_risk', 'BMI indicates overweight condition. Reduce caloric intake and increase exercise.', datetime('now', '-4 days')),
(3, 26.98, 85.60, 178.00, 'overweight', 'at_risk', 'Slight increase in weight. Start diet modification immediately.', datetime('now', '-1 day')),
(3, 27.12, 86.20, 178.00, 'overweight', 'at_risk', 'Weight trending upward. Medical intervention recommended.', CURRENT_TIMESTAMP),

(4, 29.39, 80.00, 165.00, 'overweight', 'at_risk', 'Critical weight gain observed. Implement strict diet plan.', datetime('now', '-5 days')),
(4, 29.51, 80.50, 165.00, 'overweight', 'at_risk', 'Weight unstable. Requires dietary counseling.', CURRENT_TIMESTAMP),

(5, 28.63, 95.00, 182.00, 'overweight', 'at_risk', 'High caloric intake needs immediate reduction.', datetime('now', '-3 days')),
(5, 28.81, 95.80, 182.00, 'overweight', 'at_risk', 'Weight increase detected. Exercise regimen required.', CURRENT_TIMESTAMP),

(6, 30.06, 75.00, 158.00, 'obese', 'critical', 'CRITICAL: Obesity detected. Urgent medical consultation required.', datetime('now', '-4 days')),
(6, 30.28, 75.80, 158.00, 'obese', 'critical', 'CRITICAL: Health at risk. Immediate intervention needed.', datetime('now', '-1 day')),
(6, 30.51, 76.60, 158.00, 'obese', 'critical', 'CRITICAL: Dangerous trend. Refer to physician immediately.', CURRENT_TIMESTAMP),

(7, 20.20, 62.00, 175.00, 'normal', 'healthy', 'BMI is in excellent healthy range.', datetime('now', '-2 days')),
(7, 20.20, 62.00, 175.00, 'normal', 'healthy', 'Maintain current lifestyle and nutrition habits.', CURRENT_TIMESTAMP),

(8, 19.82, 52.00, 162.00, 'normal', 'healthy', 'Perfect health metrics. Gluten-free diet is working well.', datetime('now', '-3 days')),
(8, 19.82, 52.00, 162.00, 'normal', 'healthy', 'Continue current nutrition plan.', CURRENT_TIMESTAMP);
