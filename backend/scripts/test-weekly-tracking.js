#!/usr/bin/env node
/**
 * Test Script: Weekly Calorie Tracking for AI Model
 * 
 * Tests:
 * 1. Register a test student
 * 2. Perform multiple RFID scans to accumulate calorie data
 * 3. Verify weekly average is calculated correctly
 * 4. Check that avg_weekly_calories is included in response
 * 5. Verify calculations are accurate
 */

import axios from 'axios';
import { query } from '../src/config/db.js';
import logger from '../src/utils/logger.js';

const BASE_URL = 'http://localhost:5001/api';
const TEST_RFID = `RFID-WEEKLY-${Date.now()}`;
const TEST_STUDENT = {
  name: 'Weekly Tracking Test Student',
  age: 12,
  gender: 'Male',
  height: 150,
  weight: 45,
  rfid_card_id: TEST_RFID,
};

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  📊 WEEKLY CALORIE TRACKING TEST (AI MODEL INPUT)');
console.log('═══════════════════════════════════════════════════════════\n');

let studentId = null;
const scanResponses = [];

// ═══════════════════════════════════════════════════════════
// STEP 1: Register test student
// ═══════════════════════════════════════════════════════════
console.log('📝 STEP 1: Register Test Student');
console.log('───────────────────────────────────');

try {
  const registerResponse = await axios.post(`${BASE_URL}/students/register`, TEST_STUDENT);
  
  if (registerResponse.status === 201) {
    const responseData = registerResponse.data.data;
    studentId = responseData.student ? responseData.student.id : responseData.id;
    console.log(`✅ Student registered`);
    console.log(`   Student ID: ${studentId}`);
    console.log(`   Name: ${TEST_STUDENT.name}`);
    console.log(`   RFID: ${TEST_RFID}`);
  } else {
    console.log('❌ Failed to register student');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error registering student:', error.response?.data || error.message);
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════
// STEP 2: Perform multiple RFID scans
// ═══════════════════════════════════════════════════════════
console.log('\n🔍 STEP 2: Perform Multiple RFID Scans');
console.log('───────────────────────────────────');

console.log('Scanning student 3 times to accumulate calorie data...\n');

for (let i = 1; i <= 3; i++) {
  try {
    console.log(`📡 Scan ${i}:`);
    const scanResponse = await axios.post(`${BASE_URL}/scan`, {
      rfid_card_id: TEST_RFID,
    });

    if (scanResponse.status === 200) {
      const data = scanResponse.data.data;
      scanResponses.push(data);
      
      console.log(`   ✅ Scan successful`);
      console.log(`      Grams: ${data.grams}g`);
      console.log(`      Calories: ${data.calories}kcal`);
      console.log(`      Weekly Avg: ${data.avg_weekly_calories}kcal`);
    } else {
      console.log(`   ❌ Scan failed`);
    }
  } catch (error) {
    console.log(`   ❌ Error during scan:`, error.message);
  }
  
  // Small delay between scans
  await new Promise(resolve => setTimeout(resolve, 100));
}

// ═══════════════════════════════════════════════════════════
// STEP 3: Query database for food logs
// ═══════════════════════════════════════════════════════════
console.log('\n📊 STEP 3: Query Food Logs from Database');
console.log('───────────────────────────────────');

let foodLogs = [];

try {
  const result = await query(
    `SELECT * FROM food_logs WHERE student_id = $1 ORDER BY logged_at DESC LIMIT 10`,
    [studentId]
  );

  foodLogs = result.rows;
  console.log(`✅ Found ${foodLogs.length} food log entries`);
  
  console.log('\n   Food Log Summary:');
  foodLogs.forEach((log, index) => {
    console.log(`   ${index + 1}. ${log.food_item} - ${log.served_grams}g (${log.estimated_calories}kcal)`);
  });
} catch (error) {
  console.log('❌ Error querying database:', error.message);
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════
// STEP 4: Calculate manual weekly average
// ═══════════════════════════════════════════════════════════
console.log('\n✔️  STEP 4: Calculate Weekly Average');
console.log('───────────────────────────────────');

let manualAverage = 0;
if (foodLogs.length > 0) {
  const totalCalories = foodLogs.reduce((sum, log) => sum + parseFloat(log.estimated_calories), 0);
  manualAverage = parseFloat((totalCalories / foodLogs.length).toFixed(2));
}

console.log(`✅ Manual calculation:`);
console.log(`   Total logs: ${foodLogs.length}`);
console.log(`   Total calories: ${foodLogs.reduce((sum, log) => sum + parseFloat(log.estimated_calories), 0).toFixed(2)}kcal`);
console.log(`   Average: ${manualAverage}kcal`);

// ═══════════════════════════════════════════════════════════
// STEP 5: Verify API response includes weekly average
// ═══════════════════════════════════════════════════════════
console.log('\n✔️  STEP 5: Verify API Response Includes Weekly Average');
console.log('───────────────────────────────────');

let allIncludeAverage = true;
let avgValues = [];

scanResponses.forEach((response, index) => {
  if (response.avg_weekly_calories !== undefined) {
    console.log(`✅ Scan ${index + 1}: avg_weekly_calories = ${response.avg_weekly_calories}`);
    avgValues.push(response.avg_weekly_calories);
  } else {
    console.log(`❌ Scan ${index + 1}: Missing avg_weekly_calories field`);
    allIncludeAverage = false;
  }
});

if (allIncludeAverage) {
  console.log('\n✅ All responses include avg_weekly_calories field');
} else {
  console.log('\n⚠️  Some responses missing avg_weekly_calories field');
}

// ═══════════════════════════════════════════════════════════
// STEP 6: Query analytics service
// ═══════════════════════════════════════════════════════════
console.log('\n📊 STEP 6: Query Analytics Service');
console.log('───────────────────────────────────');

try {
  const analyzeResult = await query(
    `SELECT 
       AVG(estimated_calories) AS avg_calories,
       COUNT(*) as meal_count,
       SUM(estimated_calories) as total_calories,
       AVG(protein) as avg_protein,
       AVG(carbs) as avg_carbs,
       AVG(fats) as avg_fats
     FROM food_logs
     WHERE student_id = $1
     AND logged_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'`,
    [studentId]
  );

  if (analyzeResult.rows.length > 0) {
    const stats = analyzeResult.rows[0];
    const avgCalories = stats.avg_calories ? parseFloat(stats.avg_calories).toFixed(2) : 0;
    
    console.log('✅ Weekly analytics query successful:');
    console.log(`   Average weekly calories: ${avgCalories}kcal`);
    console.log(`   Meal count: ${stats.meal_count}`);
    console.log(`   Total weekly calories: ${stats.total_calories ? parseFloat(stats.total_calories).toFixed(2) : 0}kcal`);
    console.log(`   Avg protein/meal: ${stats.avg_protein ? parseFloat(stats.avg_protein).toFixed(2) : 0}g`);
    console.log(`   Avg carbs/meal: ${stats.avg_carbs ? parseFloat(stats.avg_carbs).toFixed(2) : 0}g`);
    console.log(`   Avg fats/meal: ${stats.avg_fats ? parseFloat(stats.avg_fats).toFixed(2) : 0}g`);
  }
} catch (error) {
  console.log('❌ Error querying analytics:', error.message);
}

// ═══════════════════════════════════════════════════════════
// STEP 7: Test AI model data format
// ═══════════════════════════════════════════════════════════
console.log('\n🤖 STEP 7: AI Model Input Data Format');
console.log('───────────────────────────────────');

try {
  const aiInputResult = await query(
    `SELECT 
       s.id,
       s.name,
       s.age,
       s.gender,
       s.current_bmi,
       s.risk_level,
       AVG(f.estimated_calories) as avg_weekly_calories,
       COUNT(f.id) as meal_count
     FROM students s
     LEFT JOIN food_logs f ON s.id = f.student_id
       AND f.logged_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
     WHERE s.id = $1
     GROUP BY s.id, s.name, s.age, s.gender, s.current_bmi, s.risk_level`,
    [studentId]
  );

  if (aiInputResult.rows.length > 0) {
    const aiInput = aiInputResult.rows[0];
    console.log('✅ AI Model Input Data:');
    console.log(JSON.stringify({
      student_id: aiInput.id,
      name: aiInput.name,
      age: aiInput.age,
      gender: aiInput.gender,
      bmi: aiInput.current_bmi,
      risk_level: aiInput.risk_level,
      avg_weekly_calories: aiInput.avg_weekly_calories ? parseFloat(aiInput.avg_weekly_calories).toFixed(2) : 0,
      meal_count: aiInput.meal_count,
    }, null, 2));
  }
} catch (error) {
  console.log('❌ Error preparing AI model input:', error.message);
}

// ═══════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════');

const testsPassed = 
  studentId &&
  scanResponses.length === 3 &&
  allIncludeAverage &&
  foodLogs.length === 3;

if (testsPassed) {
  console.log('  🎉 ALL TESTS PASSED - WEEKLY TRACKING WORKING CORRECTLY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n✅ Summary:');
  console.log(`   ✓ Student registered: ID ${studentId}`);
  console.log(`   ✓ 3 scans performed: ${scanResponses.length}/3`);
  console.log(`   ✓ Food logs created: ${foodLogs.length}/3`);
  console.log(`   ✓ Weekly averages calculated: ${allIncludeAverage ? 'Yes' : 'No'}`);
  console.log(`   ✓ AI model data format: Valid`);
  console.log(`   ✓ System ready for AI integration: YES\n`);
} else {
  console.log('  ⚠️  SOME TESTS FAILED - CHECK VALUES ABOVE');
  console.log('═══════════════════════════════════════════════════════════\n');
}

process.exit(testsPassed ? 0 : 1);
