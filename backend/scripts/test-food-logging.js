#!/usr/bin/env node
/**
 * Test Script: Automatic Food Logging on RFID Scan
 * 
 * Tests:
 * 1. Register a test student with RFID card
 * 2. Perform RFID scan (which auto-logs food)
 * 3. Verify food log entry in database
 * 4. Check calories calculation
 * 5. Verify all nutrition data
 */

import axios from 'axios';
import { query } from '../src/config/db.js';
import logger from '../src/utils/logger.js';

const BASE_URL = 'http://localhost:5001/api';
const TEST_RFID = `RFID-TEST-${Date.now()}`;
const TEST_STUDENT = {
  name: 'Logging Test Student',
  age: 12,
  gender: 'Male',
  height: 150,
  weight: 45,
  rfid_card_id: TEST_RFID,
};

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  🧪 AUTOMATIC FOOD LOGGING TEST SUITE');
console.log('═══════════════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════════════
// STEP 1: Register test student
// ═══════════════════════════════════════════════════════════
console.log('📝 STEP 1: Register Test Student');
console.log('───────────────────────────────────');

let studentId = null;

try {
  const registerResponse = await axios.post(`${BASE_URL}/students/register`, TEST_STUDENT);
  
  if (registerResponse.status === 201) {
    const responseData = registerResponse.data.data;
    studentId = responseData.student ? responseData.student.id : responseData.id;
    console.log(`✅ Student registered successfully`);
    console.log(`   Student ID: ${studentId}`);
    console.log(`   Name: ${responseData.student ? responseData.student.name : responseData.name}`);
    console.log(`   RFID: ${TEST_RFID}`);
    console.log(`   Age: ${TEST_STUDENT.age}`);
  } else {
    console.log('❌ Failed to register student');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error registering student:', error.response?.data || error.message);
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════
// STEP 2: Perform RFID scan (should auto-log food)
// ═══════════════════════════════════════════════════════════
console.log('\n🔍 STEP 2: Perform RFID Scan');
console.log('───────────────────────────────────');

let scanResponse = null;
let expectedGrams = null;
let expectedCalories = null;

try {
  const startTime = Date.now();
  
  scanResponse = await axios.post(`${BASE_URL}/scan`, {
    rfid_card_id: TEST_RFID,
  });
  
  const responseTime = Date.now() - startTime;

  if (scanResponse.status === 200) {
    const data = scanResponse.data.data;
    expectedGrams = data.grams;
    expectedCalories = data.calories;

    console.log(`✅ RFID scan successful`);
    console.log(`   Student: ${data.name}`);
    console.log(`   Age: ${data.age}`);
    console.log(`   BMI: ${data.bmi}`);
    console.log(`   Grams Served: ${data.grams}g`);
    console.log(`   Calories: ${data.calories}kcal`);
    console.log(`   Message: ${data.message}`);
    console.log(`   Response Time: ${responseTime}ms`);
    
    // Verify calories calculation
    const calculatedCalories = (expectedGrams / 100) * 130;
    if (Math.abs(data.calories - calculatedCalories) < 0.01) {
      console.log(`✅ Calories calculation correct: ${expectedGrams}g × 130kcal/100g = ${expectedCalories}kcal`);
    } else {
      console.log(`⚠️  Calories calculation mismatch`);
    }
  } else {
    console.log('❌ Failed to scan RFID');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error during RFID scan:', error.message);
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════
// STEP 3: Query database for food log entry
// ═══════════════════════════════════════════════════════════
console.log('\n📊 STEP 3: Query Food Logs from Database');
console.log('───────────────────────────────────');

let foodLogEntry = null;

try {
  const result = await query(
    `SELECT * FROM food_logs WHERE student_id = $1 ORDER BY logged_at DESC LIMIT 1`,
    [studentId]
  );

  if (result.rows.length > 0) {
    foodLogEntry = result.rows[0];
    console.log(`✅ Food log entry found in database`);
    console.log(`   Entry ID: ${foodLogEntry.id}`);
    console.log(`   Student ID: ${foodLogEntry.student_id}`);
    console.log(`   Food Item: ${foodLogEntry.food_item}`);
    console.log(`   Served Grams: ${foodLogEntry.served_grams}g`);
    console.log(`   Estimated Calories: ${foodLogEntry.estimated_calories}kcal`);
    console.log(`   Protein: ${foodLogEntry.protein}g`);
    console.log(`   Carbs: ${foodLogEntry.carbs}g`);
    console.log(`   Fats: ${foodLogEntry.fats}g`);
    console.log(`   Logged At: ${foodLogEntry.logged_at}`);
    console.log(`   Created At: ${foodLogEntry.created_at}`);
  } else {
    console.log('❌ No food log entry found for this student');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error querying database:', error.message);
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════
// STEP 4: Verify data accuracy
// ═══════════════════════════════════════════════════════════
console.log('\n✔️  STEP 4: Verify Data Accuracy');
console.log('───────────────────────────────────');

let allVerified = true;

// Check student_id
if (foodLogEntry.student_id === studentId) {
  console.log('✅ Student ID matches');
} else {
  console.log(`❌ Student ID mismatch: expected ${studentId}, got ${foodLogEntry.student_id}`);
  allVerified = false;
}

// Check grams
if (parseFloat(foodLogEntry.served_grams) === expectedGrams) {
  console.log(`✅ Grams match: ${expectedGrams}g`);
} else {
  console.log(`❌ Grams mismatch: expected ${expectedGrams}, got ${foodLogEntry.served_grams}`);
  allVerified = false;
}

// Check calories
if (Math.abs(foodLogEntry.estimated_calories - expectedCalories) < 0.1) {
  console.log(`✅ Calories match: ${expectedCalories}kcal`);
} else {
  console.log(`❌ Calories mismatch: expected ${expectedCalories}, got ${foodLogEntry.estimated_calories}`);
  allVerified = false;
}

// Check food item
if (foodLogEntry.food_item === 'rice') {
  console.log(`✅ Food item correct: 'rice'`);
} else {
  console.log(`⚠️  Food item: '${foodLogEntry.food_item}'`);
}

// Check nutrition values exist
if (foodLogEntry.protein && foodLogEntry.carbs && foodLogEntry.fats) {
  console.log(`✅ Nutrition data present: P:${foodLogEntry.protein}g, C:${foodLogEntry.carbs}g, F:${foodLogEntry.fats}g`);
} else {
  console.log(`⚠️  Some nutrition values missing`);
}

// ═══════════════════════════════════════════════════════════
// STEP 5: Test with detailed scan
// ═══════════════════════════════════════════════════════════
console.log('\n🔍 STEP 5: Detailed Scan (Full Meal Logging)');
console.log('───────────────────────────────────');

try {
  const detailedResponse = await axios.post(`${BASE_URL}/scan/detailed`, {
    rfid_card_id: TEST_RFID,
  });

  if (detailedResponse.status === 200) {
    const data = detailedResponse.data.data;
    console.log(`✅ Detailed scan successful`);
    console.log(`   Food logged: ${data.food_logged.grams}g`);
    console.log(`   Calories: ${data.food_logged.calories}kcal`);
    console.log(`   Message: ${data.food_logged.message}`);

    // Query latest food log entry
    const latestResult = await query(
      `SELECT * FROM food_logs WHERE student_id = $1 ORDER BY logged_at DESC LIMIT 1`,
      [studentId]
    );

    if (latestResult.rows.length > 0) {
      const latestEntry = latestResult.rows[0];
      console.log(`   ✅ Food log updated in database`);
      console.log(`      Latest entry: ${latestEntry.food_item} (${latestEntry.served_grams}g)`);
    }
  }
} catch (error) {
  console.log('⚠️  Detailed scan error:', error.message);
}

// ═══════════════════════════════════════════════════════════
// STEP 6: Show all logs for this student
// ═══════════════════════════════════════════════════════════
console.log('\n📋 STEP 6: All Food Logs for Student');
console.log('───────────────────────────────────');

try {
  const allLogsResult = await query(
    `SELECT * FROM food_logs WHERE student_id = $1 ORDER BY logged_at DESC`,
    [studentId]
  );

  console.log(`Total entries: ${allLogsResult.rows.length}`);
  
  allLogsResult.rows.forEach((log, index) => {
    console.log(`\n  ${index + 1}. ${log.food_item.toUpperCase()}`);
    console.log(`     - Grams: ${log.served_grams}g`);
    console.log(`     - Calories: ${log.estimated_calories}kcal`);
    console.log(`     - Logged: ${log.logged_at}`);
  });
} catch (error) {
  console.log('❌ Error fetching all logs:', error.message);
}

// ═══════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════');
if (allVerified) {
  console.log('  🎉 ALL TESTS PASSED - FOOD LOGGING WORKING CORRECTLY');
} else {
  console.log('  ⚠️  SOME TESTS FAILED - CHECK VALUES ABOVE');
}
console.log('═══════════════════════════════════════════════════════════\n');

process.exit(allVerified ? 0 : 1);
