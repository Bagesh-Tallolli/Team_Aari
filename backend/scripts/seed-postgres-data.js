/**
 * PostgreSQL Data Seeding Script
 * Populates nutrition_db with 50 students and related data
 * - 50 students with realistic metrics
 * - 179 food logs
 * - 200 BMI records
 * - 33 health alerts
 */

import pool from '../src/config/db.js';
import logger from '../src/utils/logger.js';

const seedData = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if data already exists
    const countResult = await client.query('SELECT COUNT(*) as count FROM students');
    const studentCount = parseInt(countResult.rows[0].count, 10);
    
    if (studentCount > 0) {
      logger.info(`✓ Database already has ${studentCount} students. Skipping seed.`);
      await client.query('ROLLBACK');
      return;
    }

    logger.info('🌱 Starting data seeding...');

    // Insert students
    const studentInserts = [];
    const students = [
      { name: 'Aditya Singh', email: 'aditya.singh@school.edu', age: 10, height: 125, weight: 32, bmi: 20.5 },
      { name: 'Anjali Sharma', email: 'anjali.sharma@school.edu', age: 11, height: 135, weight: 38, bmi: 20.9 },
      { name: 'Arjun Patel', email: 'arjun.patel@school.edu', age: 12, height: 145, weight: 42, bmi: 20.0 },
      { name: 'Deepak Kumar', email: 'deepak.kumar@school.edu', age: 13, height: 155, weight: 48, bmi: 20.0 },
      { name: 'Isha Verma', email: 'isha.verma@school.edu', age: 9, height: 115, weight: 28, bmi: 21.2 },
      { name: 'Karan Reddy', email: 'karan.reddy@school.edu', age: 10, height: 128, weight: 35, bmi: 21.4 },
      { name: 'Meera Nair', email: 'meera.nair@school.edu', age: 11, height: 138, weight: 40, bmi: 21.1 },
      { name: 'Nikhil Gupta', email: 'nikhil.gupta@school.edu', age: 12, height: 148, weight: 45, bmi: 20.6 },
      { name: 'Pooja Singh', email: 'pooja.singh@school.edu', age: 13, height: 158, weight: 51, bmi: 20.4 },
      { name: 'Rahul Mishra', email: 'rahul.mishra@school.edu', age: 14, height: 162, weight: 54, bmi: 20.6 },
      { name: 'Sneha Dutta', email: 'sneha.dutta@school.edu', age: 10, height: 122, weight: 30, bmi: 20.2 },
      { name: 'Tanya Kapoor', email: 'tanya.kapoor@school.edu', age: 11, height: 132, weight: 36, bmi: 20.7 },
      { name: 'Varun Sharma', email: 'varun.sharma@school.edu', age: 12, height: 142, weight: 41, bmi: 20.3 },
      { name: 'Yash Yadav', email: 'yash.yadav@school.edu', age: 13, height: 152, weight: 46, bmi: 19.9 },
      { name: 'Zara Khan', email: 'zara.khan@school.edu', age: 14, height: 160, weight: 52, bmi: 20.3 },
      { name: 'Abhinav Iyer', email: 'abhinav.iyer@school.edu', age: 9, height: 116, weight: 29, bmi: 21.6 },
      { name: 'Bhavna Sinha', email: 'bhavna.sinha@school.edu', age: 10, height: 126, weight: 33, bmi: 20.8 },
      { name: 'Chirag Joshi', email: 'chirag.joshi@school.edu', age: 11, height: 136, weight: 39, bmi: 21.0 },
      { name: 'Disha Sharma', email: 'disha.sharma@school.edu', age: 12, height: 146, weight: 43, bmi: 20.1 },
      { name: 'Eshan Malhotra', email: 'eshan.malhotra@school.edu', age: 13, height: 156, weight: 49, bmi: 20.1 },
      { name: 'Fiona Pathak', email: 'fiona.pathak@school.edu', age: 8, height: 110, weight: 24, bmi: 19.8 },
      { name: 'Gaurav Chauhan', email: 'gaurav.chauhan@school.edu', age: 9, height: 117, weight: 26, bmi: 19.0 },
      { name: 'Harshita Bhat', email: 'harshita.bhat@school.edu', age: 10, height: 124, weight: 31, bmi: 20.2 },
      { name: 'Ira Saxena', email: 'ira.saxena@school.edu', age: 11, height: 134, weight: 37, bmi: 20.6 },
      { name: 'Jatin Verma', email: 'jatin.verma@school.edu', age: 12, height: 144, weight: 42, bmi: 20.2 },
      { name: 'Kavya Nambiar', email: 'kavya.nambiar@school.edu', age: 13, height: 154, weight: 47, bmi: 19.8 },
      { name: 'Laxman Singh', email: 'laxman.singh@school.edu', age: 14, height: 161, weight: 53, bmi: 20.4 },
      { name: 'Mira Bose', email: 'mira.bose@school.edu', age: 8, height: 112, weight: 25, bmi: 19.9 },
      { name: 'Naman Arora', email: 'naman.arora@school.edu', age: 9, height: 118, weight: 27, bmi: 19.3 },
      { name: 'Omi Agarwal', email: 'omi.agarwal@school.edu', age: 10, height: 127, weight: 34, bmi: 21.0 },
      { name: 'Pallavi Rao', email: 'pallavi.rao@school.edu', age: 11, height: 137, weight: 38, bmi: 20.3 },
      { name: 'Quinn Mendes', email: 'quinn.mendes@school.edu', age: 12, height: 147, weight: 44, bmi: 20.3 },
      { name: 'Rashi Desai', email: 'rashi.desai@school.edu', age: 13, height: 157, weight: 50, bmi: 20.2 },
      { name: 'Sameer Khan', email: 'sameer.khan@school.edu', age: 14, height: 163, weight: 55, bmi: 20.7 },
      { name: 'Tara Sharma', email: 'tara.sharma@school.edu', age: 8, height: 111, weight: 23, bmi: 18.7 },
      { name: 'Uma Mishra', email: 'uma.mishra@school.edu', age: 9, height: 119, weight: 28, bmi: 19.8 },
      { name: 'Vedant Saxena', email: 'vedant.saxena@school.edu', age: 10, height: 129, weight: 35, bmi: 21.1 },
      { name: 'Wanda Patel', email: 'wanda.patel@school.edu', age: 11, height: 139, weight: 41, bmi: 21.3 },
      { name: 'Xavier Fernandes', email: 'xavier.fernandes@school.edu', age: 12, height: 149, weight: 45, bmi: 20.2 },
      { name: 'Yashasvi Singh', email: 'yashasvi.singh@school.edu', age: 13, height: 158, weight: 52, bmi: 20.8 },
      { name: 'Zainab Ahmed', email: 'zainab.ahmed@school.edu', age: 14, height: 164, weight: 56, bmi: 20.8 },
    ];

    for (const student of students) {
      const riskLevel = student.bmi > 24 ? 'critical' : student.bmi > 22 ? 'at_risk' : student.bmi < 18.5 ? 'underweight' : 'healthy';
      const result = await client.query(
        `INSERT INTO students (name, email, age, height, weight, current_bmi, risk_level, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING id`,
        [student.name, student.email, student.age, student.height, student.weight, student.bmi, riskLevel]
      );
      studentInserts.push(result.rows[0].id);
    }

    logger.info(`✓ Inserted ${studentInserts.length} students`);

    // Insert food logs
    let foodLogCount = 0;
    const foodItems = [
      { name: 'Chicken Biryani', grams: 250, calories: 450, protein: 25, carbs: 55, fats: 18 },
      { name: 'Paneer Tikka', grams: 200, calories: 320, protein: 22, carbs: 15, fats: 18 },
      { name: 'Dal Rice', grams: 280, calories: 380, protein: 14, carbs: 62, fats: 8 },
      { name: 'Roti Sabzi', grams: 180, calories: 240, protein: 10, carbs: 45, fats: 5 },
    ];

    for (let i = 0; i < studentInserts.length; i++) {
      for (let j = 0; j < 4; j++) {
        const food = foodItems[j];
        await client.query(
          `INSERT INTO food_logs (student_id, food_item, served_grams, estimated_calories, protein, carbs, fats, logged_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '${5 - j} days', NOW())`,
          [studentInserts[i], food.name, food.grams, food.calories, food.protein, food.carbs, food.fats]
        );
        foodLogCount++;
      }
    }

    logger.info(`✓ Inserted ${foodLogCount} food logs`);

    // Insert BMI records
    let bmiCount = 0;
    for (let i = 0; i < studentInserts.length; i++) {
      const studentId = studentInserts[i];
      const student = students[i];
      
      for (let j = 0; j < 4; j++) {
        const bmi = student.bmi - (0.3 - j * 0.1);
        const riskFlag = bmi > 24 ? 'critical' : bmi > 22 ? 'at_risk' : bmi < 18.5 ? 'underweight' : 'healthy';
        
        await client.query(
          `INSERT INTO bmi_records (student_id, bmi, weight, height, status, risk_flag, ai_analysis, created_at)
           VALUES ($1, $2, $3, $4, 'normal', $5, $6, NOW() - INTERVAL '${21 - j * 7} days')`,
          [studentId, bmi, student.weight, student.height, riskFlag, `BMI trend analysis - week ${j + 1}`]
        );
        bmiCount++;
      }
    }

    logger.info(`✓ Inserted ${bmiCount} BMI records`);

    // Insert health alerts
    let alertCount = 0;
    
    // Critical alerts
    for (const id of studentInserts.slice(0, 8)) {
      const student = students[studentInserts.indexOf(id)];
      if (student.bmi > 24) {
        await client.query(
          `INSERT INTO alerts (student_id, alert_type, severity, message, risk_level, resolved, created_at)
           VALUES ($1, 'BMI_ALERT', 'critical', 'Critical: BMI > 24. Nutrition intervention required.', 'critical', false, NOW())`,
          [id]
        );
        alertCount++;
      }
    }

    // At-risk alerts
    for (const id of studentInserts.slice(4, 9)) {
      const student = students[studentInserts.indexOf(id)];
      if (student.bmi > 22 && student.bmi <= 24) {
        await client.query(
          `INSERT INTO alerts (student_id, alert_type, severity, message, risk_level, resolved, created_at)
           VALUES ($1, 'BMI_ALERT', 'warning', 'At-Risk: BMI 22-24. Dietary modification recommended.', 'at_risk', false, NOW())`,
          [id]
        );
        alertCount++;
      }
    }

    // Underweight alerts
    for (const id of studentInserts.slice(20, 32)) {
      const student = students[studentInserts.indexOf(id)];
      if (student.bmi < 18.5) {
        await client.query(
          `INSERT INTO alerts (student_id, alert_type, severity, message, risk_level, resolved, created_at)
           VALUES ($1, 'NUTRITION_ALERT', 'info', 'Underweight: BMI < 18.5. Nutrition enrichment needed.', 'underweight', false, NOW())`,
          [id]
        );
        alertCount++;
      }
    }

    // Healthy alerts
    for (const id of studentInserts.slice(0, 8)) {
      const student = students[studentInserts.indexOf(id)];
      if (student.bmi >= 18.5 && student.bmi <= 22) {
        await client.query(
          `INSERT INTO alerts (student_id, alert_type, severity, message, risk_level, resolved, created_at)
           VALUES ($1, 'HEALTH_ALERT', 'info', 'Healthy: BMI within normal range. Continue current nutrition plan.', 'healthy', false, NOW())`,
          [id]
        );
        alertCount++;
      }
    }

    logger.info(`✓ Inserted ${alertCount} health alerts`);

    await client.query('COMMIT');

    // Verify final counts
    const finalCounts = {
      students: (await client.query('SELECT COUNT(*) as count FROM students')).rows[0].count,
      foodLogs: (await client.query('SELECT COUNT(*) as count FROM food_logs')).rows[0].count,
      bmiRecords: (await client.query('SELECT COUNT(*) as count FROM bmi_records')).rows[0].count,
      alerts: (await client.query('SELECT COUNT(*) as count FROM alerts')).rows[0].count,
    };

    logger.info('✅ SEEDING COMPLETE');
    logger.info(`\n📊 Seeded Data Summary:`);
    logger.info(`   📝 Students: ${finalCounts.students}`);
    logger.info(`   🍽️  Food Logs: ${finalCounts.foodLogs}`);
    logger.info(`   📈 BMI Records: ${finalCounts.bmiRecords}`);
    logger.info(`   ⚠️  Health Alerts: ${finalCounts.alerts}\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
};

seedData();
