import { query } from '../src/config/db.js';

const migrate = async () => {
  try {
    console.log("Adding food_preference column...");
    await query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS food_preference VARCHAR(50) DEFAULT 'Vegetarian'`);
    console.log("Column added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error migrating:", error);
    process.exit(1);
  }
};

migrate();
