import 'dotenv/config';
import { query } from './src/config/db.js';
import * as predictionService from './src/services/predictionService.js';
import logger from './src/utils/logger.js';

async function seedMockData() {
  try {
    const res = await query('SELECT id, name FROM students');
    const students = res.rows;
    console.log(`Found ${students.length} students to seed mock data for...`);

    const days = 7;
    for (const student of students) {
      console.log(`Seeding food logs for student ${student.name}...`);
      
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Mock 1200-1800 calories per day
        const calories = 1200 + Math.floor(Math.random() * 600);
        
        // Check if log exists for this day
        const checkRes = await query(
          'SELECT id FROM food_logs WHERE student_id = $1 AND DATE(created_at) = DATE($2)',
          [student.id, date]
        );
        
        if (checkRes.rows.length === 0) {
          await query(
            `INSERT INTO food_logs 
             (student_id, food_item, served_grams, estimated_calories, protein, carbs, fats, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              student.id,
              'Rice, Dal, Veggies (Mock)',
              300,
              calories,
              20, // protein
              80, // carbs
              15, // fats
              date
            ]
          );
        }
      }
      
      // Trigger AI Prediction
      console.log(`Triggering AI prediction for ${student.name}...`);
      try {
        await predictionService.getPrediction(student.id, 'veg');
        console.log(`AI prediction completed for ${student.name}`);
      } catch (e) {
        console.error(`AI prediction failed for ${student.name}:`, e.message);
      }
    }
    
    console.log('Mock data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding mock data:', error);
    process.exit(1);
  }
}

seedMockData();
