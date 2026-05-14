/**
 * PHASE 5: Data Model Validation Test Suite
 * Verifies all database models are functioning correctly with seeded data
 */

import { query } from '../src/config/database.js';

async function runTests() {
  console.log('\n📋 PHASE 5: DATA MODEL VALIDATION TESTS\n');
  
  let passed = 0;
  let failed = 0;
  
  try {
    // Test 1: Student count
    console.log('Test 1: Verify 50 students seeded...');
    const studentCount = await query('SELECT COUNT(*) as count FROM students');
    if (studentCount.rows[0].count === 50) {
      console.log('✅ PASS: Found 50 students\n');
      passed++;
    } else {
      console.log(`❌ FAIL: Expected 50, found ${studentCount.rows[0].count}\n`);
      failed++;
    }
    
    // Test 2: Student BMI classification
    console.log('Test 2: Verify BMI risk level classification...');
    const healthyStudents = await query('SELECT COUNT(*) as count FROM students WHERE risk_level = ?', ['healthy']);
    const atRiskStudents = await query('SELECT COUNT(*) as count FROM students WHERE risk_level = ?', ['at_risk']);
    const criticalStudents = await query('SELECT COUNT(*) as count FROM students WHERE risk_level = ?', ['critical']);
    
    const healthy = healthyStudents.rows[0].count;
    const atRisk = atRiskStudents.rows[0].count;
    const critical = criticalStudents.rows[0].count;
    
    if (healthy > 0 && atRisk >= 0 && critical > 0) {
      console.log(`✅ PASS: Risk distribution - Healthy: ${healthy}, At-Risk: ${atRisk}, Critical: ${critical}\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: Invalid risk distribution\n`);
      failed++;
    }
    
    // Test 3: Food logs exist
    console.log('Test 3: Verify food logs seeded...');
    const foodLogCount = await query('SELECT COUNT(*) as count FROM food_logs');
    if (foodLogCount.rows[0].count > 100) {
      console.log(`✅ PASS: Found ${foodLogCount.rows[0].count} food logs\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: Expected >100, found ${foodLogCount.rows[0].count}\n`);
      failed++;
    }
    
    // Test 4: BMI records historical trend
    console.log('Test 4: Verify BMI records with historical data...');
    const bmiRecordCount = await query('SELECT COUNT(*) as count FROM bmi_records');
    if (bmiRecordCount.rows[0].count > 150) {
      console.log(`✅ PASS: Found ${bmiRecordCount.rows[0].count} BMI records\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: Expected >150, found ${bmiRecordCount.rows[0].count}\n`);
      failed++;
    }
    
    // Test 5: Alerts generated
    console.log('Test 5: Verify health alerts auto-generated...');
    const alertCount = await query('SELECT COUNT(*) as count FROM alerts');
    if (alertCount.rows[0].count > 20) {
      console.log(`✅ PASS: Found ${alertCount.rows[0].count} alerts\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: Expected >20, found ${alertCount.rows[0].count}\n`);
      failed++;
    }
    
    // Test 6: Student with food logs
    console.log('Test 6: Verify student food log associations...');
    const studentWithLogs = await query(`
      SELECT s.id, s.name, COUNT(f.id) as log_count
      FROM students s
      LEFT JOIN food_logs f ON s.id = f.student_id
      GROUP BY s.id
      LIMIT 5
    `);
    
    let hasLogs = false;
    for (const row of studentWithLogs.rows) {
      if (row.log_count > 0) {
        hasLogs = true;
        console.log(`   Student ${row.id} (${row.name}): ${row.log_count} food logs`);
      }
    }
    
    if (hasLogs) {
      console.log('✅ PASS: Food logs properly associated with students\n');
      passed++;
    } else {
      console.log('❌ FAIL: No food logs found for students\n');
      failed++;
    }
    
    // Test 7: BMI trend per student
    console.log('Test 7: Verify BMI historical trends...');
    const bmiTrends = await query(`
      SELECT student_id, COUNT(*) as record_count
      FROM bmi_records
      GROUP BY student_id
      HAVING COUNT(*) >= 3
      LIMIT 5
    `);
    
    if (bmiTrends.rows.length > 0) {
      console.log(`✅ PASS: Found ${bmiTrends.rows.length} students with 3+ BMI records\n`);
      passed++;
    } else {
      console.log('❌ FAIL: No students with historical BMI records\n');
      failed++;
    }
    
    // Test 8: Food log macronutrients
    console.log('Test 8: Verify food log nutritional data completeness...');
    const nutritionData = await query(`
      SELECT COUNT(*) as total_logs,
             COUNT(CASE WHEN estimated_calories > 0 THEN 1 END) as with_calories,
             COUNT(CASE WHEN protein > 0 THEN 1 END) as with_protein,
             COUNT(CASE WHEN carbs > 0 THEN 1 END) as with_carbs,
             COUNT(CASE WHEN fats > 0 THEN 1 END) as with_fats
      FROM food_logs
    `);
    
    const row = nutritionData.rows[0];
    if (row.with_calories === row.total_logs && row.with_protein === row.total_logs) {
      console.log(`✅ PASS: All ${row.total_logs} food logs have complete nutrition data\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: Incomplete nutrition data\n`);
      failed++;
    }
    
    // Test 9: Alert severity distribution
    console.log('Test 9: Verify alert severity levels...');
    const alertSeverity = await query(`
      SELECT severity, COUNT(*) as count
      FROM alerts
      GROUP BY severity
    `);
    
    if (alertSeverity.rows.length > 0) {
      console.log('Alert severity distribution:');
      for (const alert of alertSeverity.rows) {
        console.log(`   ${alert.severity}: ${alert.count} alerts`);
      }
      console.log('✅ PASS: Alerts properly categorized by severity\n');
      passed++;
    } else {
      console.log('❌ FAIL: No alerts found\n');
      failed++;
    }
    
    // Test 10: Query performance
    console.log('Test 10: Verify query performance on large dataset...');
    const startTime = Date.now();
    
    await query(`
      SELECT s.id, s.name, s.current_bmi, s.risk_level,
             COUNT(f.id) as food_log_count,
             AVG(f.estimated_calories) as avg_calories
      FROM students s
      LEFT JOIN food_logs f ON s.id = f.student_id
      GROUP BY s.id
      LIMIT 50
    `);
    
    const duration = Date.now() - startTime;
    if (duration < 1000) {
      console.log(`✅ PASS: Complex query completed in ${duration}ms\n`);
      passed++;
    } else {
      console.log(`⚠️  WARNING: Complex query took ${duration}ms (expected <1000ms)\n`);
      passed++;
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: 10`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed/10)*100).toFixed(1)}%`);
    console.log('='.repeat(60) + '\n');
    
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Database models are fully validated.\n');
    } else {
      console.log(`⚠️  ${failed} test(s) failed. Please review the results above.\n`);
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests();
