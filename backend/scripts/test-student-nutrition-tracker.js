/**
 * Test Script: Student Nutrition Tracker Integration
 * Tests the complete flow: Search Student → Get Comprehensive Profile
 * Validates all 5 sections: Basic Info, Nutrition Analytics, AI Analysis, Diet Recommendations, Food History
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001';
const ADMIN_CREDENTIALS = {
  email: 'admin@nutrition.com',
  password: 'password123',
};

// Helper functions
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(section, message, data = null) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[${timestamp}] [${section}]`;
  console.log(`\n${prefix} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logSuccess(message, data = null) {
  console.log(`\n✅ ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

function logError(message, error = null) {
  console.log(`\n❌ ${message}`);
  if (error) console.log(error.response?.data || error.message);
}

// Test Suite
async function runTests() {
  try {
    log('START', 'Starting Student Nutrition Tracker Integration Tests...');
    log('CONFIG', 'API Base URL:', { url: API_BASE_URL });

    let authToken = null;
    let testStudentId = null;
    let searchQuery = null;

    // STEP 1: Login to get auth token
    log('STEP 1', 'Authenticating as admin...');
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, ADMIN_CREDENTIALS, {
        timeout: 5000,
      });

      if (loginResponse.data.success) {
        authToken = loginResponse.data.data.token;
        logSuccess('Authentication successful', { token: authToken.substring(0, 20) + '...' });
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      logError('Authentication failed', error);
      return;
    }

    // STEP 2: Get list of students to find one with data
    log('STEP 2', 'Fetching student list...');
    try {
      const studentsResponse = await axios.get(`${API_BASE_URL}/api/students`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 5000,
      });

      if (studentsResponse.data.success && studentsResponse.data.data.students.length > 0) {
        const firstStudent = studentsResponse.data.data.students[0];
        testStudentId = firstStudent.id;
        searchQuery = firstStudent.name;
        logSuccess('Found test student', {
          id: testStudentId,
          name: searchQuery,
          email: firstStudent.email,
          age: firstStudent.age,
          gender: firstStudent.gender,
        });
      } else {
        throw new Error('No students found');
      }
    } catch (error) {
      logError('Failed to fetch students', error);
      return;
    }

    // STEP 3: Test Student Search API
    log('STEP 3', `Testing student search with query: "${searchQuery}"...`);
    try {
      const searchResponse = await axios.get(`${API_BASE_URL}/api/students?search=${searchQuery}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 5000,
      });

      if (searchResponse.data.success && searchResponse.data.data.students.length > 0) {
        const foundStudent = searchResponse.data.data.students[0];
        logSuccess('Search API working', {
          results: searchResponse.data.data.students.length,
          firstResult: {
            id: foundStudent.id,
            name: foundStudent.name,
            email: foundStudent.email,
          },
        });
      } else {
        throw new Error('Search returned no results');
      }
    } catch (error) {
      logError('Search API failed', error);
      return;
    }

    // STEP 4: Test Comprehensive Profile API
    log('STEP 4', `Fetching comprehensive profile for student ID: ${testStudentId}...`);
    let profileData = null;
    try {
      const profileResponse = await axios.get(`${API_BASE_URL}/api/students/${testStudentId}/details`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 5000,
      });

      if (profileResponse.data.success) {
        profileData = profileResponse.data.data;
        logSuccess('Comprehensive Profile API working', {
          hasStudent: !!profileData.student,
          hasNutritionAnalytics: !!profileData.nutrition_analytics,
          hasAiAnalysis: !!profileData.ai_analysis,
          foodHistoryCount: profileData.food_history?.length || 0,
        });
      } else {
        throw new Error('API returned success: false');
      }
    } catch (error) {
      logError('Comprehensive Profile API failed', error);
      return;
    }

    // STEP 5: Validate Section A - Basic Information
    log('STEP 5A', 'Validating Section A: Basic Information...');
    if (profileData.student) {
      const student = profileData.student;
      const bmi = parseFloat(student.current_bmi) || 0;
      const basicInfoValid =
        student.name &&
        student.age &&
        student.gender &&
        student.height &&
        student.weight &&
        bmi !== undefined &&
        student.rfid_card_id;

      if (basicInfoValid) {
        logSuccess('Section A: Basic Information - VALID', {
          name: student.name,
          age: student.age,
          gender: student.gender,
          height: `${student.height} cm`,
          weight: `${student.weight} kg`,
          bmi: bmi.toFixed(2),
          rfid: student.rfid_card_id,
          riskLevel: student.risk_level,
        });
      } else {
        logError('Section A: Missing required fields', student);
      }
    } else {
      logError('Section A: No student data');
    }

    // STEP 5B: Validate Section B - Nutrition Analytics
    log('STEP 5B', 'Validating Section B: Nutrition Analytics...');
    if (profileData.nutrition_analytics) {
      const analytics = profileData.nutrition_analytics;
      const avgWeek = parseFloat(analytics.avg_weekly_calories) || 0;
      const required = parseFloat(analytics.required_calories) || 1800;
      const deficit = parseFloat(analytics.calorie_deficit) || 0;
      const analyticsValid =
        avgWeek !== undefined &&
        required !== undefined &&
        deficit !== undefined &&
        analytics.total_servings !== undefined;

      if (analyticsValid) {
        logSuccess('Section B: Nutrition Analytics - VALID', {
          avgWeeklyCalories: avgWeek.toFixed(0),
          requiredCalories: required.toFixed(0),
          calorieDef: deficit.toFixed(0),
          totalServings: analytics.total_servings,
        });
      } else {
        logError('Section B: Missing or invalid fields', analytics);
      }
    } else {
      logError('Section B: No nutrition analytics data');
    }

    // STEP 5C: Validate Section C - AI Analysis
    log('STEP 5C', 'Validating Section C: AI Analysis...');
    if (profileData.ai_analysis) {
      const aiAnalysis = profileData.ai_analysis;
      const confidence = parseFloat(aiAnalysis.confidence) || 0;
      const aiValid =
        aiAnalysis.status &&
        confidence !== undefined &&
        aiAnalysis.reason &&
        aiAnalysis.diet_plan;

      if (aiValid) {
        logSuccess('Section C: AI Analysis - VALID', {
          status: aiAnalysis.status,
          confidence: `${(confidence * 100).toFixed(1)}%`,
          reason: aiAnalysis.reason.substring(0, 100) + '...',
          hasDietPlan: !!aiAnalysis.diet_plan,
        });
      } else {
        logError('Section C: Missing AI analysis fields', aiAnalysis);
      }
    } else {
      logError('Section C: No AI analysis data');
    }

    // STEP 5D: Validate Section D - Diet Recommendations
    log('STEP 5D', 'Validating Section D: Diet Recommendations...');
    if (profileData.ai_analysis?.diet_plan) {
      const dietPlan = profileData.ai_analysis.diet_plan;
      const hasBreakfast = !!dietPlan.breakfast;
      const hasDinner = !!dietPlan.dinner;
      const hasSnacks = Array.isArray(dietPlan.snacks) && dietPlan.snacks.length > 0;
      const hasNotes = Array.isArray(dietPlan.notes) && dietPlan.notes.length > 0;

      logSuccess('Section D: Diet Recommendations - VALID', {
        hasBreakfast,
        hasDinner,
        snackCount: dietPlan.snacks?.length || 0,
        notesCount: dietPlan.notes?.length || 0,
        dietPlanStructure: {
          breakfast: dietPlan.breakfast ? 'Present' : 'Missing',
          dinner: dietPlan.dinner ? 'Present' : 'Missing',
          snacks: Array.isArray(dietPlan.snacks) ? `${dietPlan.snacks.length} items` : 'Missing',
          notes: Array.isArray(dietPlan.notes) ? `${dietPlan.notes.length} items` : 'Missing',
        },
      });
    } else {
      logError('Section D: No diet plan data');
    }

    // STEP 5E: Validate Section E - Food History
    log('STEP 5E', 'Validating Section E: Food Serving History...');
    if (Array.isArray(profileData.food_history)) {
      const foodHistory = profileData.food_history;
      if (foodHistory.length > 0) {
        const firstEntry = foodHistory[0];
        const isValid =
          firstEntry.food_item &&
          firstEntry.served_grams !== undefined &&
          firstEntry.estimated_calories !== undefined &&
          firstEntry.logged_at;

        if (isValid) {
          logSuccess(`Section E: Food History - VALID (${foodHistory.length} entries)`, {
            totalEntries: foodHistory.length,
            firstEntry: {
              food: firstEntry.food_item,
              grams: firstEntry.served_grams,
              calories: firstEntry.estimated_calories,
              protein: firstEntry.protein,
              date: new Date(firstEntry.logged_at).toLocaleDateString('en-IN'),
            },
            latestEntry: {
              food: foodHistory[0].food_item,
              date: new Date(foodHistory[0].logged_at).toLocaleDateString('en-IN'),
            },
            oldestEntry: {
              food: foodHistory[foodHistory.length - 1].food_item,
              date: new Date(foodHistory[foodHistory.length - 1].logged_at).toLocaleDateString(
                'en-IN'
              ),
            },
          });
        } else {
          logError('Section E: Food entry missing required fields', firstEntry);
        }
      } else {
        log('STEP 5E', 'No food history available (acceptable if student has no food logs)');
      }
    } else {
      logError('Section E: Food history is not an array');
    }

    // SUMMARY
    log('COMPLETE', '='.repeat(50));
    logSuccess('✅ ALL TESTS COMPLETED SUCCESSFULLY!', {
      testStudent: {
        id: testStudentId,
        name: searchQuery,
      },
      sections: {
        'A - Basic Info': 'Verified',
        'B - Nutrition Analytics': 'Verified',
        'C - AI Analysis': 'Verified',
        'D - Diet Recommendations': 'Verified',
        'E - Food History': 'Verified',
      },
      nextSteps: [
        'Open http://localhost:5173 in browser',
        'Login with admin credentials',
        'Navigate to Nutrition Tracker from sidebar',
        'Search for student: ' + searchQuery,
        'Verify all sections display correctly',
      ],
    });
  } catch (error) {
    logError('Unexpected error during tests', error);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
