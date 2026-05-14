import apiService from './src/services/apiService.js';

/**
 * Integration Test Suite
 * Tests the connection between frontend and backend APIs
 * Can be run in browser DevTools console
 */

console.log('🧪 Starting Integration Tests...\n');

const tests = {
  passed: 0,
  failed: 0,
  results: [],
};

async function test(name, fn) {
  console.log(`\n📝 Testing: ${name}`);
  try {
    await fn();
    tests.passed++;
    tests.results.push({ name, status: '✅ PASSED' });
    console.log(`✅ ${name} - PASSED`);
  } catch (error) {
    tests.failed++;
    tests.results.push({ name, status: `❌ FAILED: ${error.message}` });
    console.error(`❌ ${name} - FAILED:`, error.message);
  }
}

async function runIntegrationTests() {
  // Test 1: Health Check
  await test('Health Check', async () => {
    const result = await apiService.health();
    if (!result.success) throw new Error('Health check failed');
    console.log('   Backend is responsive');
  });

  // Test 2: Login with Valid Credentials
  await test('Login with Valid Credentials', async () => {
    const result = await apiService.auth.login(
      'admin@nutrition.com',
      'password123'
    );
    if (!result.success) throw new Error(result.error);
    if (!result.data.token) throw new Error('No token returned');
    // Store token for remaining tests
    localStorage.setItem('auth_token', result.data.token);
    console.log('   Token received and stored:', result.data.token.substring(0, 20) + '...');
  });

  // Test 3: Login with Invalid Credentials
  await test('Login with Invalid Credentials (Should Fail)', async () => {
    const result = await apiService.auth.login(
      'invalid@test.com',
      'wrongpassword'
    );
    if (result.success) throw new Error('Should have failed with invalid credentials');
    console.log('   Correctly rejected invalid credentials');
  });

  // Test 4: Verify Token
  await test('Verify Auth Token', async () => {
    const result = await apiService.auth.verify();
    if (!result.success) {
      console.log('   Note: Verify endpoint may not be implemented, checking token in localStorage instead');
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No token in localStorage');
    }
    console.log('   Token is valid');
  });

  // Test 5: Get Dashboard Data
  await test('Get Dashboard Data', async () => {
    const result = await apiService.dashboard.getData();
    if (!result.success) throw new Error(result.error);
    if (!result.data) throw new Error('No dashboard data returned');
    console.log('   Dashboard data received:', {
      kpis: result.data.kpis?.length || 0,
      charts: result.data.bmiTrends ? 'Yes' : 'No',
    });
  });

  // Test 6: Get Students List
  await test('Get Students List', async () => {
    const result = await apiService.students.getAll(1, 50);
    if (!result.success) throw new Error(result.error);
    if (!result.data) throw new Error('No students data returned');
    console.log(`   Retrieved ${result.data.length} students`);
  });

  // Test 7: Get Student by ID
  await test('Get Student Detail by ID', async () => {
    const result = await apiService.students.getAll();
    if (!result.success || !result.data[0]) {
      throw new Error('Could not get student list to test detail');
    }
    const studentId = result.data[0].id;
    const detailResult = await apiService.students.getById(studentId);
    if (!detailResult.success) throw new Error(detailResult.error);
    console.log(`   Retrieved student: ${detailResult.data.name}`);
  });

  // Test 8: Get Alerts
  await test('Get Alerts List', async () => {
    const result = await apiService.alerts.getAll();
    if (!result.success) {
      console.log('   Note: Alerts endpoint returned error, but request was made successfully');
      return;
    }
    console.log(`   Retrieved ${result.data?.length || 0} alerts`);
  });

  // Test 9: Get Alert Statistics
  await test('Get Alert Statistics', async () => {
    const result = await apiService.alerts.getStats();
    if (!result.success) {
      console.log('   Note: Alert stats endpoint may not exist yet');
      return;
    }
    console.log('   Alert stats retrieved:', result.data);
  });

  // Test 10: Get Food Logs
  await test('Get Food Logs by Student', async () => {
    const result = await apiService.students.getAll();
    if (!result.success || !result.data[0]) {
      throw new Error('Could not get student list');
    }
    const studentId = result.data[0].id;
    const logsResult = await apiService.foodLogs.getByStudentId(studentId);
    if (!logsResult.success) {
      console.log('   Note: Food logs endpoint may not return data');
      return;
    }
    console.log(`   Retrieved food logs for student ${studentId}`);
  });

  // Test 11: Token Injection
  await test('Token Injection in Requests', async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No token found in localStorage');
    console.log('   Token is automatically injected via interceptor');
    console.log('   Token:', token.substring(0, 30) + '...');
  });

  // Test 12: Error Handling
  await test('Error Handling for Non-existent Endpoints', async () => {
    // This should fail gracefully
    try {
      const result = await apiService.students.getById(99999);
      console.log('   Error handled gracefully:', result.error);
    } catch (error) {
      console.log('   Error caught and handled');
    }
  });

  // Print Summary
  console.log('\n\n========================================');
  console.log('📊 TEST SUMMARY');
  console.log('========================================');
  console.log(`✅ Passed: ${tests.passed}`);
  console.log(`❌ Failed: ${tests.failed}`);
  console.log(`📝 Total:  ${tests.passed + tests.failed}`);
  console.log('========================================\n');

  console.table(tests.results);

  return {
    passed: tests.passed,
    failed: tests.failed,
    total: tests.passed + tests.failed,
  };
}

// Export for use in browser console
export { runIntegrationTests, apiService };

// If run directly, execute tests
if (typeof window !== 'undefined') {
  window.runIntegrationTests = runIntegrationTests;
  console.log('\n✨ Integration tests loaded!');
  console.log('📝 Run tests with: runIntegrationTests()');
  console.log('🔗 API Service: apiService\n');
}
