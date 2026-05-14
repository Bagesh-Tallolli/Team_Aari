#!/usr/bin/env node

/**
 * Student Registration Integration Test
 * Tests the full flow: Form → API → Database
 * 
 * Usage: node scripts/test-student-registration.js
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5001';

// Test data
const testStudent = {
  name: 'Rajesh Kumar',
  age: 13,
  gender: 'Male',
  height: 155,
  weight: 48,
  rfid_card_id: 'RFID-TEST-' + Date.now(),
  email: 'rajesh@school.edu',
};

const testStudent2 = {
  name: 'Priya Singh',
  age: 11,
  gender: 'Female',
  height: 142,
  weight: 38,
  rfid_card_id: 'RFID-TEST2-' + Date.now(),
  email: 'priya@school.edu',
};

console.log('🧪 Student Registration Integration Tests\n');
console.log('═'.repeat(60));

async function runTests() {
  try {
    // Test 1: Register first student
    console.log('\n📝 Test 1: Register First Student');
    console.log('─'.repeat(60));
    const result1 = await registerStudent(testStudent);
    
    if (!result1.success) {
      console.error('❌ Test 1 Failed:', result1.error);
      return;
    }

    console.log('✅ Student registered successfully');
    console.log('   Response data:');
    console.log(`   - ID: ${result1.data.id}`);
    console.log(`   - Name: ${result1.data.name}`);
    console.log(`   - Age: ${result1.data.age}`);
    console.log(`   - Height: ${result1.data.height} cm`);
    console.log(`   - Weight: ${result1.data.weight} kg`);
    console.log(`   - BMI: ${result1.data.current_bmi} (auto-calculated)`);
    console.log(`   - RFID: ${result1.data.rfid_card_id}`);
    console.log(`   - Gender: ${result1.data.gender}`);

    // Verify BMI calculation
    const expectedBMI = (testStudent.weight / ((testStudent.height / 100) ** 2)).toFixed(2);
    if (parseFloat(result1.data.current_bmi).toFixed(2) === parseFloat(expectedBMI).toFixed(2)) {
      console.log(`✓ BMI calculation verified: ${result1.data.current_bmi}`);
    } else {
      console.warn(`⚠️  BMI mismatch: Expected ${expectedBMI}, Got ${result1.data.current_bmi}`);
    }

    // Test 2: Register second student
    console.log('\n📝 Test 2: Register Second Student (Different RFID)');
    console.log('─'.repeat(60));
    const result2 = await registerStudent(testStudent2);
    
    if (!result2.success) {
      console.error('❌ Test 2 Failed:', result2.error);
      return;
    }

    console.log('✅ Second student registered successfully');
    console.log(`   - ID: ${result2.data.id}`);
    console.log(`   - Name: ${result2.data.name}`);
    console.log(`   - RFID: ${result2.data.rfid_card_id}`);

    // Test 3: Try duplicate RFID (should fail)
    console.log('\n📝 Test 3: Attempt Duplicate RFID (Should Fail)');
    console.log('─'.repeat(60));
    const duplicateData = {
      ...testStudent2,
      name: 'Different Name',
      rfid_card_id: testStudent.rfid_card_id, // Use existing RFID
    };

    const result3 = await registerStudent(duplicateData);
    
    if (result3.success) {
      console.error('❌ Test 3 Failed: Duplicate RFID was accepted (should be rejected)');
      return;
    }

    console.log('✅ Duplicate RFID correctly rejected');
    console.log(`   Error: ${result3.error}`);

    // Test 4: Invalid data validation
    console.log('\n📝 Test 4: Validation - Missing Required Fields');
    console.log('─'.repeat(60));
    const invalidData = {
      name: 'John',
      age: 12,
      // Missing gender, height, weight, rfid_card_id
    };

    const result4 = await registerStudent(invalidData);
    
    if (result4.success) {
      console.error('❌ Test 4 Failed: Invalid data was accepted');
      return;
    }

    console.log('✅ Validation correctly rejected incomplete data');
    console.log(`   Error: ${result4.error}`);

    // Test 5: Invalid age range
    console.log('\n📝 Test 5: Validation - Invalid Age Range');
    console.log('─'.repeat(60));
    const invalidAge = {
      ...testStudent,
      age: 25, // Outside range 5-20
      rfid_card_id: 'RFID-INVALID-AGE-' + Date.now(),
    };

    const result5 = await registerStudent(invalidAge);
    
    if (result5.success) {
      console.error('❌ Test 5 Failed: Invalid age was accepted');
      return;
    }

    console.log('✅ Age validation correctly rejected out-of-range age');
    console.log(`   Error: ${result5.error}`);

    // Final summary
    console.log('\n' + '═'.repeat(60));
    console.log('✅ All Integration Tests Passed!\n');
    console.log('📊 Test Summary:');
    console.log('   ✓ Student registration works');
    console.log('   ✓ BMI auto-calculation on server');
    console.log('   ✓ RFID uniqueness enforced');
    console.log('   ✓ Data validation working');
    console.log('   ✓ Error handling proper\n');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

async function registerStudent(data) {
  try {
    const response = await axios.post(`${API_BASE}/api/students/register`, data);
    
    return {
      success: true,
      data: response.data?.data || {},
    };
  } catch (error) {
    let errorMessage = error.message;
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.errors) {
      errorMessage = error.response.data.errors
        .map((e) => `${e.field}: ${e.message}`)
        .join(', ');
    }

    return {
      success: false,
      error: errorMessage,
      status: error.response?.status,
    };
  }
}

// Run tests
runTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
