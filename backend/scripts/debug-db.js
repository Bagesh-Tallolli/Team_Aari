#!/usr/bin/env node
/**
 * Debug Script: Check Database and Test Registration
 */

import { query } from '../src/config/db.js';

console.log('🔍 Checking database schema...\n');

try {
  // Check students table columns
  const columns = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'students' 
    ORDER BY ordinal_position
  `);
  
  console.log('📋 Students table columns:');
  columns.rows.forEach(col => {
    console.log(`   - ${col.column_name}: ${col.data_type}`);
  });
  
  // Check if food_logs table exists
  const foodLogsCols = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'food_logs' 
    ORDER BY ordinal_position
  `);
  
  console.log('\n📋 Food_logs table columns:');
  if (foodLogsCols.rows.length > 0) {
    foodLogsCols.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
  } else {
    console.log('   ❌ Table does not exist');
  }
  
  // Test insert
  console.log('\n📝 Testing student insertion...');
  const testStudent = {
    name: 'Debug Test',
    age: 12,
    gender: 'Male',
    height: 150,
    weight: 45,
    rfid_card_id: `RFID-DEBUG-${Date.now()}`,
    email: null
  };
  
  const heightInMeters = testStudent.height / 100;
  const bmi = (testStudent.weight / (heightInMeters * heightInMeters)).toFixed(2);
  
  console.log('   Input data:', testStudent);
  console.log('   Calculated BMI:', bmi);
  
  const insertResult = await query(
    `INSERT INTO students (name, age, gender, height, weight, current_bmi, rfid_card_id, email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [testStudent.name, testStudent.age, testStudent.gender, testStudent.height, testStudent.weight, bmi, testStudent.rfid_card_id, testStudent.email]
  );
  
  console.log('✅ Insert successful!');
  console.log('   Student ID:', insertResult.rows[0].id);
  console.log('   Student:', insertResult.rows[0]);
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error);
  process.exit(1);
}
