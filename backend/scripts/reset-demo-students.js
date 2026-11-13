import { query } from '../src/config/db.js';

const resetStudents = async () => {
  try {
    console.log("Clearing existing students...");
    await query('DELETE FROM students');
    await query('DELETE FROM food_logs');
    
    console.log("Inserting demo students...");
    
    // Ravi
    // BMI: weight / (height/100)^2 = 32 / (1.38 * 1.38) = 16.8
    await query(`
      INSERT INTO students (name, rfid_card_id, age, gender, height, weight, current_bmi, food_preference, risk_level)
      VALUES ('Ravi', '77 47 2F 64', 10, 'Male', 138, 32, 16.80, 'Vegetarian', 'healthy')
    `);
    
    // Nayana
    // BMI: weight / (height/100)^2 = 28 / (1.32 * 1.32) = 16.07
    await query(`
      INSERT INTO students (name, rfid_card_id, age, gender, height, weight, current_bmi, food_preference, risk_level)
      VALUES ('Nayana', 'A3 18 B9 2C', 9, 'Female', 132, 28, 16.07, 'Non Vegetarian', 'healthy')
    `);

    console.log("Demo students inserted successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error resetting students:", error);
    process.exit(1);
  }
};

resetStudents();
