/**
 * Seed Script: Insert mock health_status entries for students
 * Usage: node scripts/seed-health-status-mock.js
 */
import pool from '../src/config/db.js';
import logger from '../src/utils/logger.js';

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const studentsRes = await client.query('SELECT id, name, age, height, weight, current_bmi FROM students');
    const students = studentsRes.rows || [];

    if (students.length === 0) {
      logger.info('No students found to seed health_status');
      await client.query('ROLLBACK');
      return;
    }

    let inserted = 0;

    for (const s of students) {
      const bmi = parseFloat(s.current_bmi) || null;
      let status = 'Healthy';
      if (bmi === null) status = 'Unknown';
      else if (bmi < 18.5) status = 'Underweight';
      else if (bmi >= 18.5 && bmi < 24.9) status = 'Healthy';
      else status = 'At Risk';

      const required_calories = (s.age && s.age <= 8) ? 1400 : (s.age && s.age <= 12) ? 1800 : 2200;
      const avg_weekly_calories = Math.max(400, Math.round(required_calories * (status === 'Underweight' ? 0.6 : (status === 'Healthy' ? 1.0 : 0.85))));

      const diet_plan = {
        deficit_category: status === 'Underweight' ? 'HIGH_DEFICIT' : 'LOW_DEFICIT',
        deficit_kcal: Math.max(0, required_calories - avg_weekly_calories),
        breakfast: {
          type: 'veg',
          suggested: { name: 'Milk + Banana', quantity: '1 glass + 1 banana', calories: 250 }
        },
        dinner: {
          type: 'veg',
          suggested: { name: 'Roti + Dal', quantity: '2 rotis + 1 bowl dal', calories: 380 }
        },
        notes: ['This is a mock recommendation for UI demo only.']
      };

      const ai_prediction = {
        status,
        confidence: status === 'Healthy' ? 0.92 : 0.78,
        reason: `Mocked reason: BMI ${bmi}`,
      };

      await client.query(
        `INSERT INTO health_status (student_id, status, confidence, bmi, calories, required_calories, reason, diet_plan, ai_prediction, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
        [s.id, status, ai_prediction.confidence, bmi, avg_weekly_calories, required_calories, ai_prediction.reason, JSON.stringify(diet_plan), JSON.stringify(ai_prediction)]
      );
      inserted++;
    }

    await client.query('COMMIT');
    logger.info(`Inserted ${inserted} mock health_status records`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Seeding mock health_status failed:', err.message || err);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
};

run();
