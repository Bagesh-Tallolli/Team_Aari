-- ============================================================
-- Sample Data for Nutrition Monitoring System
-- PostgreSQL Version with 50 Students
-- ============================================================

-- ============================================================
-- 1. INSERT ADMIN AND STAFF USERS
-- ============================================================
INSERT INTO users (email, password_hash, name, role, avatar, active) VALUES
('admin@nutrition.com', '$2a$10$L9/UIy5rXDjVviFJB0txuu5sBuLqP1qiZsRz1yJT0KhHAGQXDGdTK', 'Admin User', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', true),
('staff@nutrition.com', '$2a$10$L9/UIy5rXDjVviFJB0txuu5sBuLqP1qiZsRz1yJT0KhHAGQXDGdTK', 'Staff Member', 'staff', 'https://api.dicebear.com/7.x/avataaars/svg?seed=staff', true);

-- ============================================================
-- 2. INSERT 50 STUDENTS
-- ============================================================
INSERT INTO students (name, email, age, height, weight, current_bmi, risk_level, avatar) VALUES
('Aman Kumar', 'aman@student.com', 20, 170.00, 65.00, 22.49, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=aman'),
('Priya Singh', 'priya@student.com', 19, 160.00, 58.00, 22.66, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya'),
('Raj Patel', 'raj@student.com', 21, 178.00, 85.00, 26.84, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=raj'),
('Neha Sharma', 'neha@student.com', 20, 165.00, 80.00, 29.39, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=neha'),
('Rohan Gupta', 'rohan@student.com', 22, 182.00, 95.00, 28.63, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rohan'),
('Sneha Desai', 'sneha@student.com', 20, 158.00, 75.00, 30.06, 'critical', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sneha'),
('Aditya Verma', 'aditya@student.com', 19, 175.00, 62.00, 20.20, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=aditya'),
('Meera Nair', 'meera@student.com', 21, 162.00, 52.00, 19.82, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=meera'),
('Vikram Reddy', 'vikram@student.com', 20, 180.00, 88.00, 27.16, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=vikram'),
('Anjali Iyer', 'anjali@student.com', 19, 156.00, 55.00, 22.58, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=anjali'),
('Rahul Mishra', 'rahul@student.com', 21, 172.00, 90.00, 30.41, 'critical', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rahul'),
('Divya Kapoor', 'divya@student.com', 20, 168.00, 68.00, 24.11, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=divya'),
('Nikhil Saxena', 'nikhil@student.com', 22, 176.00, 92.00, 29.72, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=nikhil'),
('Pooja Menon', 'pooja@student.com', 19, 159.00, 56.00, 22.15, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=pooja'),
('Sanjay Rao', 'sanjay@student.com', 21, 183.00, 98.00, 29.25, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sanjay'),
('Riya Chopra', 'riya@student.com', 20, 164.00, 78.00, 28.98, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=riya'),
('Arjun Kumar', 'arjun@student.com', 19, 169.00, 63.00, 22.05, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=arjun'),
('Shreya Pillai', 'shreya@student.com', 21, 161.00, 73.00, 28.16, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=shreya'),
('Varun Singh', 'varun@student.com', 20, 177.00, 87.00, 27.75, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=varun'),
('Isha Agarwal', 'isha@student.com', 19, 157.00, 54.00, 21.91, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=isha'),
('Abhishek Srivastava', 'abhishek@student.com', 22, 181.00, 96.00, 29.27, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=abhishek'),
('Ananya Dutta', 'ananya@student.com', 20, 163.00, 70.00, 26.35, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=ananya'),
('Karthik Nath', 'karthik@student.com', 21, 174.00, 80.00, 26.42, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=karthik'),
('Priyanka Sharma', 'priyanka@student.com', 19, 160.00, 57.00, 22.27, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=priyanka'),
('Harshit Verma', 'harshit@student.com', 20, 171.00, 86.00, 29.40, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=harshit'),
('Tanvi Joshi', 'tanvi@student.com', 21, 165.00, 67.00, 24.62, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=tanvi'),
('Rishabh Bhatnagar', 'rishabh@student.com', 20, 179.00, 94.00, 29.27, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rishabh'),
('Nisha Yadav', 'nisha@student.com', 19, 158.00, 72.00, 28.83, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=nisha'),
('Sameer Khan', 'sameer@student.com', 22, 173.00, 89.00, 29.74, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sameer'),
('Avni Tiwari', 'avni@student.com', 20, 162.00, 56.00, 21.33, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=avni'),
('Darsh Malhotra', 'darsh@student.com', 21, 176.00, 91.00, 29.37, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=darsh'),
('Esha Bansal', 'esha@student.com', 19, 159.00, 61.00, 24.14, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=esha'),
('Faisal Ahmed', 'faisal@student.com', 20, 170.00, 84.00, 29.07, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=faisal'),
('Girija Sinha', 'girija@student.com', 21, 164.00, 75.00, 27.89, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=girija'),
('Himanshu Rathore', 'himanshu@student.com', 20, 175.00, 85.00, 27.76, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=himanshu'),
('Indira Bhat', 'indira@student.com', 19, 156.00, 53.00, 21.74, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=indira'),
('Jitendra Patel', 'jitendra@student.com', 22, 180.00, 99.00, 30.56, 'critical', 'https://api.dicebear.com/7.x/avataaars/svg?seed=jitendra'),
('Kanika Pandey', 'kanika@student.com', 20, 161.00, 70.00, 27.02, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=kanika'),
('Lakshay Gupta', 'lakshay@student.com', 21, 170.00, 88.00, 30.41, 'critical', 'https://api.dicebear.com/7.x/avataaars/svg?seed=lakshay'),
('Mahima Singh', 'mahima@student.com', 19, 158.00, 54.00, 21.62, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=mahima'),
('Nitin Deshmukh', 'nitin@student.com', 20, 174.00, 91.00, 30.05, 'critical', 'https://api.dicebear.com/7.x/avataaars/svg?seed=nitin'),
('Ojaswi Mehta', 'ojaswi@student.com', 21, 162.00, 68.00, 25.89, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=ojaswi'),
('Pankaj Sinha', 'pankaj@student.com', 20, 172.00, 77.00, 26.03, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=pankaj'),
('Quratulain Khan', 'quratulain@student.com', 19, 160.00, 59.00, 23.05, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=quratulain'),
('Rajesh Trivedi', 'rajesh@student.com', 22, 179.00, 97.00, 30.25, 'critical', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rajesh'),
('Sakshi Bajaj', 'sakshi@student.com', 20, 163.00, 72.00, 27.11, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sakshi'),
('Tushar Reddy', 'tushar@student.com', 21, 177.00, 90.00, 28.71, 'at_risk', 'https://api.dicebear.com/7.x/avataaars/svg?seed=tushar'),
('Usha Prabhu', 'usha@student.com', 19, 157.00, 55.00, 22.32, 'healthy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=usha');

-- ============================================================
-- 3. INSERT DIET PLANS FOR ALL 50 STUDENTS
-- ============================================================
INSERT INTO diet_plans (student_id, target_calories, target_protein, target_carbs, target_fats, dietary_restrictions) 
SELECT id, 2200, 60.00, 320.00, 70.00, 'None' FROM students WHERE id BETWEEN 1 AND 50;

-- ============================================================
-- 4. INSERT FOOD LOGS FOR VARIETY
-- ============================================================
INSERT INTO food_logs (student_id, food_item, served_grams, estimated_calories, protein, carbs, fats, logged_at) VALUES
-- Student 1
(1, 'Chicken Biryani', 250.00, 450.00, 25.00, 55.00, 18.00, NOW() - INTERVAL '1 day'),
(1, 'Mixed Vegetable Salad', 150.00, 80.00, 5.00, 12.00, 3.00, NOW() - INTERVAL '12 hours'),
(1, 'Whole Wheat Bread', 100.00, 265.00, 10.00, 50.00, 3.00, NOW() - INTERVAL '6 hours'),
-- Student 2
(2, 'Paneer Tikka', 200.00, 320.00, 28.00, 8.00, 20.00, NOW() - INTERVAL '1 day'),
(2, 'Brown Rice', 200.00, 260.00, 6.00, 58.00, 2.00, NOW() - INTERVAL '18 hours'),
(2, 'Apple', 200.00, 104.00, 0.50, 27.00, 0.30, NOW() - INTERVAL '8 hours'),
-- Student 3
(3, 'Butter Chicken', 300.00, 520.00, 30.00, 35.00, 25.00, NOW() - INTERVAL '1 day'),
(3, 'Naan Bread', 120.00, 330.00, 11.00, 50.00, 8.00, NOW() - INTERVAL '12 hours'),
-- Student 4
(4, 'Fish Curry', 250.00, 380.00, 35.00, 15.00, 18.00, NOW() - INTERVAL '1 day'),
(4, 'White Rice', 180.00, 234.00, 4.00, 52.00, 1.00, NOW() - INTERVAL '18 hours'),
-- Student 5
(5, 'Mutton Biryani', 320.00, 580.00, 40.00, 60.00, 22.00, NOW() - INTERVAL '1 day'),
(5, 'Cucumber Salad', 100.00, 45.00, 2.00, 8.00, 1.00, NOW() - INTERVAL '12 hours'),
-- Student 6
(6, 'Chole Bhature', 400.00, 650.00, 22.00, 95.00, 18.00, NOW() - INTERVAL '1 day'),
(6, 'Mango Lassi', 250.00, 190.00, 8.00, 32.00, 2.00, NOW() - INTERVAL '12 hours'),
-- Additional entries for other students
(7, 'Grilled Chicken', 200.00, 280.00, 40.00, 0.00, 15.00, NOW() - INTERVAL '1 day'),
(8, 'Dosa', 150.00, 280.00, 8.00, 42.00, 8.00, NOW() - INTERVAL '1 day'),
(9, 'Idli with Sambar', 200.00, 220.00, 6.00, 40.00, 4.00, NOW() - INTERVAL '1 day'),
(10, 'Roti and Dal', 250.00, 320.00, 15.00, 48.00, 8.00, NOW() - INTERVAL '1 day'),
(11, 'Paratha', 150.00, 400.00, 10.00, 50.00, 18.00, NOW() - INTERVAL '1 day'),
(12, 'Upma', 180.00, 240.00, 7.00, 42.00, 5.00, NOW() - INTERVAL '1 day'),
(13, 'Rajma Rice', 300.00, 380.00, 14.00, 65.00, 5.00, NOW() - INTERVAL '1 day'),
(14, 'Poha', 200.00, 180.00, 4.00, 38.00, 1.00, NOW() - INTERVAL '1 day'),
(15, 'Samosa', 100.00, 280.00, 6.00, 32.00, 14.00, NOW() - INTERVAL '1 day'),
(16, 'Halwa', 100.00, 320.00, 4.00, 40.00, 16.00, NOW() - INTERVAL '1 day');

-- ============================================================
-- 5. INSERT BMI RECORDS FOR TRACKING
-- ============================================================
INSERT INTO bmi_records (student_id, bmi, weight, height, status, risk_flag) VALUES
(1, 22.49, 65.00, 170.00, 'Normal', 'healthy'),
(2, 22.66, 58.00, 160.00, 'Normal', 'healthy'),
(3, 26.84, 85.00, 178.00, 'Overweight', 'at_risk'),
(4, 29.39, 80.00, 165.00, 'Obese', 'at_risk'),
(5, 28.63, 95.00, 182.00, 'Obese', 'at_risk'),
(6, 30.06, 75.00, 158.00, 'Obese', 'critical'),
(7, 20.20, 62.00, 175.00, 'Normal', 'healthy'),
(8, 19.82, 52.00, 162.00, 'Normal', 'healthy'),
(9, 27.16, 88.00, 180.00, 'Overweight', 'at_risk'),
(10, 22.58, 55.00, 156.00, 'Normal', 'healthy');

-- ============================================================
-- 6. INSERT HEALTH ALERTS
-- ============================================================
INSERT INTO alerts (student_id, alert_type, severity, message, risk_level, bmi_value, resolved) VALUES
(3, 'BMI_ALERT', 'warning', 'Student BMI is in overweight range', 'at_risk', 26.84, false),
(4, 'NUTRITION_ALERT', 'warning', 'Excessive calorie intake detected', 'at_risk', 29.39, false),
(5, 'BMI_ALERT', 'critical', 'Critical BMI level - immediate attention needed', 'critical', 28.63, false),
(6, 'BMI_ALERT', 'critical', 'Critical BMI level - requires intervention', 'critical', 30.06, false),
(9, 'BMI_ALERT', 'warning', 'Student BMI entering overweight range', 'at_risk', 27.16, false),
(11, 'BMI_ALERT', 'critical', 'Critical BMI level detected', 'critical', 30.41, false),
(15, 'NUTRITION_ALERT', 'warning', 'Unbalanced nutrition pattern detected', 'at_risk', 28.98, false),
(18, 'BMI_ALERT', 'warning', 'Rapid weight gain detected', 'at_risk', 28.16, false);

-- ============================================================
-- SEED MIGRATION COMPLETE
-- ============================================================
