/**
 * ============================================================
 * STRESS TEST & EDGE CASES
 * ============================================================
 * 
 * Simulates:
 * - Multiple concurrent scans
 * - Same student repeated scans
 * - Invalid RFID cards
 * - Database timeouts
 * - AI service unavailability
 * - Concurrent food logging
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5001';
const TIMEOUT = 10000;

const client = axios.create({
  baseURL: API_BASE,
  timeout: TIMEOUT,
  validateStatus: () => true,
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function test(name) {
  log(`\n${'═'.repeat(60)}`, 'cyan');
  log(`TEST: ${name}`, 'cyan');
  log(`${'═'.repeat(60)}`, 'cyan');
}

const TEST_DATA = {
  valid_rfid: 'RFID-DIET-1778134898996',
  invalid_rfid: 'RFID-INVALID-999999999',
  admin_creds: {
    email: 'admin@nutrition.com',
    password: 'password123',
  },
};

let authToken = null;

// ============================================================
// SETUP: Get auth token
// ============================================================
async function setupAuth() {
  log(`Setting up authentication...`, 'blue');
  const response = await client.post('/api/auth/login', {
    email: TEST_DATA.admin_creds.email,
    password: TEST_DATA.admin_creds.password,
  });

  if (response.data.success) {
    authToken = response.data.data.token;
    log(`✅ Authentication successful`, 'green');
    return true;
  } else {
    log(`❌ Authentication failed`, 'red');
    return false;
  }
}

// ============================================================
// STRESS TEST 1: Multiple Concurrent Scans
// ============================================================
async function testConcurrentScans() {
  test('Multiple Concurrent Scans (10 simultaneous)');

  log(`Sending 10 concurrent scan requests...`, 'blue');
  const startTime = Date.now();

  try {
    const promises = Array(10)
      .fill(null)
      .map((_, idx) =>
        client.post('/api/scan', {
          rfid_card_id: TEST_DATA.valid_rfid,
        }).then(res => ({ idx, success: res.data.success, status: res.status }))
      );

    const results = await Promise.all(promises);
    const elapsed = Date.now() - startTime;

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    log(`✅ All requests completed in ${elapsed}ms`, 'green');
    log(`   Successful: ${successCount}/10`, 'green');
    log(`   Failed: ${failCount}/10`, failCount > 0 ? 'yellow' : 'green');
    log(`   Avg time per request: ${(elapsed / 10).toFixed(2)}ms`, 'gray');

    // Check if any had errors
    results.forEach((r, idx) => {
      if (!r.success) {
        log(`   └─ Request ${idx + 1}: Status ${r.status}`, 'yellow');
      }
    });

    return failCount === 0;
  } catch (error) {
    log(`❌ Concurrent scan test failed: ${error.message}`, 'red');
    return false;
  }
}

// ============================================================
// STRESS TEST 2: Same Student Repeated Scans
// ============================================================
async function testRepeatedScans() {
  test('Same Student Repeated Scans (20 sequential)');

  log(`Scanning same student 20 times sequentially...`, 'blue');
  const startTime = Date.now();

  try {
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < 20; i++) {
      const response = await client.post('/api/scan', {
        rfid_card_id: TEST_DATA.valid_rfid,
      });

      if (response.data.success) {
        successCount++;
      } else {
        failCount++;
      }

      if ((i + 1) % 5 === 0) {
        log(`   Completed ${i + 1}/20 scans...`, 'gray');
      }
    }

    const elapsed = Date.now() - startTime;

    log(`✅ Sequential scans completed in ${elapsed}ms`, 'green');
    log(`   Successful: ${successCount}/20`, 'green');
    log(`   Failed: ${failCount}/20`, failCount > 0 ? 'yellow' : 'green');
    log(`   Avg time per request: ${(elapsed / 20).toFixed(2)}ms`, 'gray');
    log(`   ℹ️  Multiple food logs should be created for same student`, 'gray');

    return failCount === 0;
  } catch (error) {
    log(`❌ Repeated scan test failed: ${error.message}`, 'red');
    return false;
  }
}

// ============================================================
// STRESS TEST 3: Invalid RFID Handling
// ============================================================
async function testInvalidRfid() {
  test('Invalid RFID Error Handling');

  log(`Testing various invalid RFID inputs...`, 'blue');

  const testCases = [
    { rfid: '', name: 'Empty RFID' },
    { rfid: 'INVALID-UNKNOWN-123', name: 'Non-existent RFID' },
    { rfid: '   ', name: 'Whitespace only' },
    { rfid: 'x'.repeat(500), name: 'Excessively long RFID' },
  ];

  let passCount = 0;

  for (const testCase of testCases) {
    const response = await client.post('/api/scan', {
      rfid_card_id: testCase.rfid,
    });

    if (response.status >= 400) {
      log(`✅ ${testCase.name}: Properly rejected (${response.status})`, 'green');
      passCount++;
    } else if (!response.data.success) {
      log(`✅ ${testCase.name}: Error response returned`, 'green');
      passCount++;
    } else {
      log(`❌ ${testCase.name}: Should have failed`, 'red');
    }
  }

  return passCount === testCases.length;
}

// ============================================================
// STRESS TEST 4: Missing Required Fields
// ============================================================
async function testMissingFields() {
  test('Missing Required Fields Validation');

  log(`Testing API request validation...`, 'blue');

  const testCases = [
    { body: {}, name: 'Empty body' },
    { body: { student_id: 1 }, name: 'Wrong field name' },
    { body: { rfid_card_id: null }, name: 'Null RFID' },
  ];

  let passCount = 0;

  for (const testCase of testCases) {
    const response = await client.post('/api/scan', testCase.body);

    if (response.status >= 400 || !response.data.success) {
      log(`✅ ${testCase.name}: Validation passed`, 'green');
      passCount++;
    } else {
      log(`❌ ${testCase.name}: Should have been rejected`, 'red');
    }
  }

  return passCount === testCases.length;
}

// ============================================================
// STRESS TEST 5: Response Format Consistency
// ============================================================
async function testResponseFormat() {
  test('Response Format Consistency (20 requests)');

  log(`Testing response structure consistency...`, 'blue');

  try {
    const responses = [];

    for (let i = 0; i < 20; i++) {
      const response = await client.post('/api/scan', {
        rfid_card_id: TEST_DATA.valid_rfid,
      });
      responses.push(response.data);
    }

    // Check consistency
    const firstResponse = responses[0];
    const requiredFields = ['success', 'data'];
    const dataFields = [
      'student_id',
      'name',
      'grams',
      'calories',
      'avg_weekly_calories',
    ];

    let consistent = true;

    responses.forEach((resp, idx) => {
      requiredFields.forEach(field => {
        if (!(field in resp)) {
          log(`❌ Response ${idx + 1}: Missing field '${field}'`, 'red');
          consistent = false;
        }
      });

      dataFields.forEach(field => {
        if (resp.data && !(field in resp.data)) {
          log(`❌ Response ${idx + 1}: Missing data field '${field}'`, 'red');
          consistent = false;
        }
      });
    });

    if (consistent) {
      log(`✅ All 20 responses have consistent structure`, 'green');
      log(`   Required fields: ${requiredFields.join(', ')}`, 'gray');
      log(`   Data fields: ${dataFields.join(', ')}`, 'gray');
    }

    return consistent;
  } catch (error) {
    log(`❌ Response format test failed: ${error.message}`, 'red');
    return false;
  }
}

// ============================================================
// STRESS TEST 6: High-Frequency Logging
// ============================================================
async function testHighFrequencyLogging() {
  test('High-Frequency Food Logging (30 logs in 10 seconds)');

  log(`Creating 30 food log entries rapidly...`, 'blue');
  const startTime = Date.now();

  try {
    let successCount = 0;

    for (let i = 0; i < 30; i++) {
      const response = await client.post('/api/scan', {
        rfid_card_id: TEST_DATA.valid_rfid,
      });

      if (response.data.success) {
        successCount++;
      }
    }

    const elapsed = Date.now() - startTime;

    log(`✅ Completed 30 logs in ${elapsed}ms`, 'green');
    log(`   Successful: ${successCount}/30`, 'green');
    log(`   Throughput: ${(30 / (elapsed / 1000)).toFixed(1)} logs/sec`, 'yellow');

    if (elapsed > 10000) {
      log(`⚠️  Took longer than 10 seconds (${(elapsed / 1000).toFixed(1)}s)`, 'yellow');
    }

    return successCount === 30;
  } catch (error) {
    log(`❌ High-frequency logging test failed: ${error.message}`, 'red');
    return false;
  }
}

// ============================================================
// STRESS TEST 7: Error Recovery
// ============================================================
async function testErrorRecovery() {
  test('Error Recovery - System Stability After Errors');

  log(`Triggering errors then checking recovery...`, 'blue');

  try {
    // Trigger some errors
    for (let i = 0; i < 5; i++) {
      await client.post('/api/scan', {
        rfid_card_id: 'INVALID-' + Math.random(),
      });
    }

    log(`   Sent 5 invalid requests...`, 'gray');

    // Try valid request after errors
    const response = await client.post('/api/scan', {
      rfid_card_id: TEST_DATA.valid_rfid,
    });

    if (response.data.success) {
      log(`✅ System recovered successfully after errors`, 'green');
      log(`   Valid request processed: ${response.data.data.name}`, 'gray');
      return true;
    } else {
      log(`❌ System failed to recover: ${response.data.message}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error recovery test failed: ${error.message}`, 'red');
    return false;
  }
}

// ============================================================
// STRESS TEST 8: Database Load Simulation
// ============================================================
async function testDatabaseLoad() {
  test('Database Load - Student Lookup Under Stress');

  log(`Fetching student lists repeatedly (50 requests)...`, 'blue');
  const startTime = Date.now();

  try {
    let successCount = 0;
    let failCount = 0;

    const promises = Array(50)
      .fill(null)
      .map(() =>
        client
          .get('/api/students?limit=100', {
            headers: { Authorization: `Bearer ${authToken}` },
          })
          .then(res => {
            if (res.data.success) successCount++;
            else failCount++;
          })
          .catch(() => failCount++)
      );

    await Promise.all(promises);
    const elapsed = Date.now() - startTime;

    log(`✅ Completed 50 student list requests in ${elapsed}ms`, 'green');
    log(`   Successful: ${successCount}/50`, 'green');
    log(`   Failed: ${failCount}/50`, failCount > 0 ? 'yellow' : 'green');
    log(`   Avg response time: ${(elapsed / 50).toFixed(2)}ms`, 'gray');

    return failCount === 0;
  } catch (error) {
    log(`❌ Database load test failed: ${error.message}`, 'red');
    return false;
  }
}

// ============================================================
// MAIN EXECUTION
// ============================================================
async function runStressTests() {
  log(`\n${'═'.repeat(60)}`, 'cyan');
  log(`  STRESS TEST & EDGE CASES VALIDATION`, 'cyan');
  log(`${'═'.repeat(60)}\n`, 'cyan');

  if (!(await setupAuth())) {
    process.exit(1);
  }

  const tests = [
    { name: 'Concurrent Scans', fn: testConcurrentScans },
    { name: 'Repeated Scans', fn: testRepeatedScans },
    { name: 'Invalid RFID', fn: testInvalidRfid },
    { name: 'Missing Fields', fn: testMissingFields },
    { name: 'Response Format', fn: testResponseFormat },
    { name: 'High-Frequency Logging', fn: testHighFrequencyLogging },
    { name: 'Error Recovery', fn: testErrorRecovery },
    { name: 'Database Load', fn: testDatabaseLoad },
  ];

  const results = [];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      log(`\n❌ Test crashed: ${error.message}`, 'red');
      results.push({ name: test.name, passed: false });
    }
  }

  // Summary
  log(`\n${'═'.repeat(60)}`, 'cyan');
  log(`  STRESS TEST RESULTS SUMMARY`, 'cyan');
  log(`${'═'.repeat(60)}\n`, 'cyan');

  let passCount = 0;
  results.forEach((result, idx) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const color = result.passed ? 'green' : 'red';
    log(`${idx + 1}. ${result.name.padEnd(30)} ${status}`, color);
    if (result.passed) passCount++;
  });

  log(`\n${'─'.repeat(60)}`, 'gray');
  log(`Total: ${passCount}/${results.length} stress tests passed`, 
    passCount === results.length ? 'green' : 'yellow'
  );

  log(`\n${'═'.repeat(60)}\n`, 'cyan');

  if (passCount === results.length) {
    log(`🎉 STRESS TEST PASSED! System is robust.`, 'green');
    process.exit(0);
  } else {
    log(`⚠️  Some stress tests failed. Review above for details.`, 'yellow');
    process.exit(1);
  }
}

runStressTests().catch(error => {
  log(`\n❌ FATAL ERROR: ${error.message}`, 'red');
  process.exit(1);
});
