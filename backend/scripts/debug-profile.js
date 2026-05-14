/**
 * Debug comprehensive profile function
 */
import * as studentService from '../src/services/studentService.js';
import * as studentModel from '../src/models/studentModel.js';

async function debug() {
  try {
    console.log('\n=== Testing Comprehensive Profile ===\n');
    
    // First check if student exists
    console.log('Step 1: Fetching student 59...');
    const student = await studentModel.getStudentById(59);
    console.log('Student found:', student ? student.name : 'NOT FOUND');
    
    // Now try comprehensive profile
    console.log('\nStep 2: Fetching comprehensive profile...');
    const profile = await studentService.getComprehensiveStudentProfile(59);
    
    console.log('\n✅ SUCCESS! Profile data:');
    console.log(JSON.stringify(profile, null, 2));
    
  } catch (error) {
    console.log('\n❌ ERROR:');
    console.log('Message:', error.message);
    console.log('Stack:', error.stack);
  }
}

debug();
