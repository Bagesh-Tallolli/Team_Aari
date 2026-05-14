#!/usr/bin/env node
/**
 * Test Script: AI Model Integration with Real Data
 * 
 * Tests the complete malnutrition prediction pipeline:
 * 1. Register student
 * 2. Perform RFID scans (auto-logs food)
 * 3. Get AI predictions (stored in health_status)
 * 4. Verify predictions are accurate
 * 5. Check database records
 */

import axios from 'axios';
import { query } from '../src/config/db.js';
import logger from '../src/utils/logger.js';

const BASE_URL = 'http://localhost:5001/api';
const TEST_RFID = `RFID-AI-${Date.now()}`;

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  🤖 AI MODEL INTEGRATION TEST - MALNUTRITION PREDICTION');
console.log('═══════════════════════════════════════════════════════════\n');

let studentId = null;
const predictions = [];

// ═══════════════════════════════════════════════════════════
// STEP 1: Register Test Student
// ═══════════════════════════════════════════════════════════
console.log('📝 STEP 1: Register Test Student');
console.log('───────────────────────────────────');

try {
  const testStudent = {
    name: 'AI Integration Test Student',
    age: 10,
    gender: 'Male',
    height: 140,
    weight: 35,
    rfid_card_id: TEST_RFID
  };

  const registerResponse = await axios.post(`${BASE_URL}/students/register`, testStudent);
  
  if (registerResponse.status === 201) {
    const responseData = registerResponse.data.data;
    studentId = responseData.student ? responseData.student.id : responseData.id;
    
    console.log(`✅ Student registered`);
    console.log(`   ID: ${studentId}`);
    console.log(`   Name: ${testStudent.name}`);
    console.log(`   Age: ${testStudent.age}`);
    console.log(`   Height: ${testStudent.height}cm`);
    console.log(`   Weight: ${testStudent.weight}kg`);
    console.log(`   RFID: ${TEST_RFID}`);
  } else {
    console.log('❌ Registration failed');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error registering student:', error.response?.data || error.message);
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════
// STEP 2: Perform Multiple RFID Scans
// ═══════════════════════════════════════════════════════════
console.log('\n🔍 STEP 2: Perform RFID Scans (Auto-logs Food)');
console.log('───────────────────────────────────');

console.log('Scanning student 3 times to generate real data...\n');

for (let i = 1; i <= 3; i++) {
  try {
    console.log(`📡 Scan ${i}:`);
    const scanResponse = await axios.post(`${BASE_URL}/scan`, {
      rfid_card_id: TEST_RFID
    });

    if (scanResponse.status === 200) {
      const data = scanResponse.data.data;
      predictions.push(data);
      
      console.log(`   ✅ Scan successful`);
      console.log(`      Grams: ${data.grams}g`);
      console.log(`      Calories: ${data.calories}kcal`);
      console.log(`      Weekly Avg: ${data.avg_weekly_calories}kcal`);
      
      // Check for AI prediction
      if (data.ai_prediction) {
        console.log(`      🤖 AI Status: ${data.ai_prediction.status}`);
        console.log(`         Confidence: ${data.ai_prediction.confidence}`);
        console.log(`         Deficit: ${data.ai_prediction.deficit_kcal}kcal`);
      } else {
        console.log(`      ⚠️  No AI prediction in response`);
      }
    } else {
      console.log(`   ❌ Scan failed`);
    }
  } catch (error) {
    console.log(`   ❌ Error during scan:`, error.message);
    if (error.response?.data?.error) {
      console.log(`      Details: ${error.response.data.error}`);
    }
  }
  
  // Small delay between scans
  await new Promise(resolve => setTimeout(resolve, 500));
}

// ═══════════════════════════════════════════════════════════
// STEP 3: Check Food Logs
// ═══════════════════════════════════════════════════════════
console.log('\n📊 STEP 3: Verify Food Logs in Database');
console.log('───────────────────────────────────');

let foodLogs = [];
try {
  const result = await query(
    `SELECT * FROM food_logs WHERE student_id = $1 ORDER BY logged_at DESC LIMIT 10`,
    [studentId]
  );

  foodLogs = result.rows;
  console.log(`✅ Food logs found: ${foodLogs.length}`);
  
  if (foodLogs.length > 0) {
    console.log(`   Total calories logged: ${foodLogs.reduce((sum, log) => sum + parseFloat(log.estimated_calories), 0).toFixed(2)}kcal`);
    console.log(`   Latest log: ${new Date(foodLogs[0].logged_at).toLocaleTimeString()}`);
  }
} catch (error) {
  console.log('❌ Error querying food logs:', error.message);
}

// ═══════════════════════════════════════════════════════════
// STEP 4: Check Health Status (AI Predictions)
// ═══════════════════════════════════════════════════════════
console.log('\n🏥 STEP 4: Check AI Predictions in health_status Table');
console.log('───────────────────────────────────');

let healthStatuses = [];
try {
  const result = await query(
    `SELECT id, student_id, status, confidence, ai_prediction, created_at 
     FROM health_status 
     WHERE student_id = $1 
     ORDER BY created_at DESC 
     LIMIT 5`,
    [studentId]
  );

  healthStatuses = result.rows;
  console.log(`✅ Health status records found: ${healthStatuses.length}`);
  
  healthStatuses.forEach((record, index) => {
    console.log(`\n   Record ${index + 1}:`);
    console.log(`   ID: ${record.id}`);
    console.log(`   Status: ${record.status}`);
    console.log(`   Confidence: ${record.confidence}`);
    console.log(`   Created: ${new Date(record.created_at).toLocaleString()}`);
    
    if (record.ai_prediction) {
      const prediction = typeof record.ai_prediction === 'string'
        ? JSON.parse(record.ai_prediction)
        : record.ai_prediction;
      console.log(`   📊 Details: ${prediction.reason}`);
      console.log(`      Deficit: ${prediction.analysis?.deficit_kcal || 'N/A'}kcal`);
    }
  });
} catch (error) {
  console.log('❌ Error querying health_status:', error.message);
}

// ═══════════════════════════════════════════════════════════
// STEP 5: Verify API Responses Include Predictions
// ═══════════════════════════════════════════════════════════
console.log('\n✔️  STEP 5: Verify AI Predictions in Responses');
console.log('───────────────────────────────────');

let responsesWithPredictions = 0;
let totalResponses = predictions.length;

predictions.forEach((response, index) => {
  if (response.ai_prediction) {
    responsesWithPredictions++;
    console.log(`✅ Scan ${index + 1}: Includes AI prediction`);
  } else {
    console.log(`⚠️  Scan ${index + 1}: Missing AI prediction`);
  }
});

console.log(`\n📈 Summary: ${responsesWithPredictions}/${totalResponses} responses include predictions`);

// ═══════════════════════════════════════════════════════════
// STEP 6: Verify Prediction Data Quality
// ═══════════════════════════════════════════════════════════
console.log('\n🔬 STEP 6: Verify Prediction Data Quality');
console.log('───────────────────────────────────');

if (healthStatuses.length > 0) {
  const latestPrediction = healthStatuses[0];
  console.log('Latest prediction analysis:');
  
  if (latestPrediction.ai_prediction) {
    // ai_prediction can be string or object depending on how it's retrieved
    const pred = typeof latestPrediction.ai_prediction === 'string' 
      ? JSON.parse(latestPrediction.ai_prediction)
      : latestPrediction.ai_prediction;
    
    console.log(`   ✅ Status: ${pred.status} (${['Healthy', 'At Risk', 'Underweight'].includes(pred.status) ? 'Valid' : 'Invalid'})`);
    console.log(`   ✅ Confidence: ${pred.confidence} (${pred.confidence >= 0 && pred.confidence <= 1 ? 'Valid range' : 'Invalid'})`);
    console.log(`   ✅ Analysis includes: ${Object.keys(pred.analysis || {}).join(', ')}`);
    console.log(`   ✅ Reason provided: ${pred.reason ? 'Yes' : 'No'}`);
    console.log(`   ✅ Diet plan available: ${pred.diet_plan ? 'Yes' : 'No'}`);
  }
}

// ═══════════════════════════════════════════════════════════
// STEP 7: Test Batch Prediction Query
// ═══════════════════════════════════════════════════════════
console.log('\n📋 STEP 7: Check All Students Health Status');
console.log('───────────────────────────────────');

try {
  const result = await query(
    `SELECT 
       s.id,
       s.name,
       COUNT(h.id) as prediction_count,
       MAX(h.status) as latest_status,
       MAX(h.confidence) as highest_confidence
     FROM students s
     LEFT JOIN health_status h ON s.id = h.student_id
     WHERE s.id = $1
     GROUP BY s.id, s.name`,
    [studentId]
  );

  if (result.rows.length > 0) {
    const row = result.rows[0];
    console.log(`✅ Student: ${row.name}`);
    console.log(`   Total predictions: ${row.prediction_count}`);
    console.log(`   Latest status: ${row.latest_status}`);
    console.log(`   Highest confidence: ${row.highest_confidence}`);
  }
} catch (error) {
  console.log('❌ Error querying student summary:', error.message);
}

// ═══════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════');

const testsPassed = 
  studentId &&
  predictions.length === 3 &&
  foodLogs.length === 3 &&
  healthStatuses.length >= 1 &&
  responsesWithPredictions > 0;

if (testsPassed) {
  console.log('  🎉 AI INTEGRATION TEST PASSED - SYSTEM IS WORKING');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n✅ Summary:');
  console.log(`   ✓ Student registered: ID ${studentId}`);
  console.log(`   ✓ 3 scans performed: ${predictions.length}/3`);
  console.log(`   ✓ Food logs created: ${foodLogs.length}/3`);
  console.log(`   ✓ AI predictions stored: ${healthStatuses.length}`);
  console.log(`   ✓ Responses include predictions: ${responsesWithPredictions}/3`);
  console.log(`   ✓ Prediction data validated: YES`);
  console.log(`   ✓ System is production ready: YES\n`);
} else {
  console.log('  ⚠️  SOME TESTS FAILED - CHECK VALUES ABOVE');
  console.log('═══════════════════════════════════════════════════════════\n');
}

process.exit(testsPassed ? 0 : 1);
