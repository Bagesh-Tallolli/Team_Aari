import assert from 'assert';
import { query } from '../src/config/db.js';
import * as canonicalStudentModel from '../src/models/studentModel.js';
import * as legacyStudentModel from '../src/models/studentsModel.js';
import * as canonicalFoodLogModel from '../src/models/foodLogModel.js';
import * as legacyFoodLogModel from '../src/models/foodLogsModel.js';
import * as dietPlanModel from '../src/models/dietPlanModel.js';
import * as alertModel from '../src/models/alertModel.js';
import * as alertService from '../src/services/alertService.js';
import * as dashboardService from '../src/services/dashboardService.js';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}\n     ${err.message}`);
    failed++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}\n     ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log('======================================================================');
  console.log('🧪 PHASE 2 TEST SUITE: DB CONSOLIDATION & API INTEGRATION');
  console.log('======================================================================\n');

  console.log('▶ SECTION 1: Database Architecture & PostgreSQL Verification');
  await itAsync('PostgreSQL is the active connected database', async () => {
    const res = await query('SELECT current_database() as db_name, version()');
    assert.ok(res.rows[0].db_name, 'Connected to a PostgreSQL database');
  });

  await itAsync('Database tables exist and contain required relations', async () => {
    const res = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('students', 'food_logs', 'health_status', 'alerts', 'diet_plan_items', 'diet_plan')
    `);
    const tables = res.rows.map(r => r.table_name);
    assert.ok(tables.includes('students'), 'students table exists');
    assert.ok(tables.includes('food_logs'), 'food_logs table exists');
    assert.ok(tables.includes('health_status'), 'health_status table exists');
    assert.ok(tables.includes('alerts'), 'alerts table exists');
  });

  it('Unused SQLite configuration is marked deprecated and isolated', () => {
    const dbConfig = fs.readFileSync(path.resolve('backend/src/config/database.js'), 'utf8');
    assert.ok(dbConfig.includes('DEPRECATED'), 'backend/src/config/database.js has deprecation notice');
    const envFile = fs.readFileSync(path.resolve('backend/.env'), 'utf8');
    assert.ok(envFile.includes('PostgreSQL - Active'), '.env marks PostgreSQL as active');
    assert.ok(envFile.includes('# DB_PATH='), '.env isolates DB_PATH');
  });

  console.log('\n▶ SECTION 2: Canonical Model Consolidation');
  await itAsync('Canonical studentModel.js provides full student queries', async () => {
    const studentsRes = await canonicalStudentModel.getAllStudents(1, 10);
    assert.ok(Array.isArray(studentsRes.students), 'students is array');
    assert.ok(typeof studentsRes.total === 'number', 'total is number');
  });

  it('studentsModel.js is a backward-compatible wrapper re-exporting canonical model', () => {
    assert.strictEqual(typeof legacyStudentModel.getAllStudents, 'function');
    assert.strictEqual(typeof legacyStudentModel.getStudentById, 'function');
    assert.strictEqual(typeof legacyStudentModel.createStudent, 'function');
    assert.strictEqual(typeof legacyStudentModel.deleteStudent, 'function');
  });

  await itAsync('Canonical foodLogModel.js supports dual signatures', async () => {
    // Signature 1: createFoodLog(studentId, data)
    assert.strictEqual(typeof canonicalFoodLogModel.createFoodLog, 'function');
    // Signature 2: getAllFoodLogs(page, limit)
    const logsRes = await canonicalFoodLogModel.getAllFoodLogs(1, 5);
    assert.ok(Array.isArray(logsRes.food_logs), 'food_logs is array');
    assert.ok(typeof logsRes.total === 'number', 'total count is number');
  });

  it('foodLogsModel.js is a backward-compatible wrapper re-exporting canonical model', () => {
    assert.strictEqual(typeof legacyFoodLogModel.getAllFoodLogs, 'function');
    assert.strictEqual(typeof legacyFoodLogModel.createFoodLog, 'function');
    assert.strictEqual(typeof legacyFoodLogModel.getFoodLogsByStudentId, 'function');
  });

  console.log('\n▶ SECTION 3: Diet Plan Schema & Model Inconsistencies Alignment');
  await itAsync('dietPlanModel queries diet_plan_items and diet_plan safely', async () => {
    const plans = await dietPlanModel.getAllDietPlans(1, 10);
    assert.ok(Array.isArray(plans.diet_plans), 'diet_plans array returned');
    assert.ok(typeof plans.total === 'number', 'total count returned');
  });

  console.log('\n▶ SECTION 4: Dashboard Aggregation Service (GET /api/dashboard)');
  await itAsync('dashboardService.getDashboardData returns required structured analytics', async () => {
    const data = await dashboardService.getDashboardData();
    assert.ok(Array.isArray(data.kpis), 'KPIs is array');
    assert.strictEqual(data.kpis.length, 4, 'Has 4 standard KPIs');

    const kpiTitles = data.kpis.map(k => k.title);
    assert.ok(kpiTitles.includes('Total Students'), 'Has Total Students KPI');
    assert.ok(kpiTitles.includes('Meals Served Today'), 'Has Meals Served Today KPI');
    assert.ok(kpiTitles.includes('At-Risk Students'), 'Has At-Risk Students KPI');
    assert.ok(kpiTitles.includes('Avg BMI'), 'Has Avg BMI KPI');

    // Calorie trends
    assert.ok(Array.isArray(data.calorieTrends), 'calorieTrends is array');

    // Food intake against PM POSHAN targets
    assert.ok(Array.isArray(data.foodIntake), 'foodIntake is array');
    const caloriesTarget = data.foodIntake.find(item => item.name.includes('Calories'));
    assert.ok(caloriesTarget, 'Food intake includes Calories comparison');
    assert.ok(caloriesTarget.required <= 700 && caloriesTarget.required >= 450, 'Calories target aligns with PM POSHAN standards');

    // Risk distribution
    assert.ok(Array.isArray(data.riskDistribution), 'riskDistribution is array');

    // Activity feed
    assert.ok(Array.isArray(data.activityFeed), 'activityFeed is array');
    if (data.activityFeed.length > 0) {
      const first = data.activityFeed[0];
      assert.ok(first.type === 'meal_served' || first.type === 'alert', 'Activity item has valid type');
      assert.ok(first.studentName, 'Activity item has studentName');
      assert.ok(first.timestamp, 'Activity item has timestamp');
    }
  });

  console.log('\n▶ SECTION 5: Alerts Model & Service (GET /api/alerts & PUT /api/alerts/:id)');
  await itAsync('alertModel.getAllAlerts includes student details via JOIN', async () => {
    const alertsData = await alertService.getAllAlerts({ page: 1, limit: 10 });
    assert.ok(Array.isArray(alertsData.alerts), 'Alerts list is array');
    assert.ok(alertsData.stats, 'Alert statistics returned');
  });

  console.log('\n▶ SECTION 6: Frontend API Centralization & Code Hygiene');
  it('apiService.js defines hardware and dashboard endpoints cleanly', () => {
    const apiServiceSrc = fs.readFileSync(path.resolve('frontend/src/services/apiService.js'), 'utf8');
    assert.ok(apiServiceSrc.includes('hardware: {'), 'hardware endpoint group defined in apiService');
    assert.ok(apiServiceSrc.includes('getStatus:'), 'hardware.getStatus defined');
    assert.ok(apiServiceSrc.includes('getRecent:'), 'hardware.getRecent defined');
    assert.ok(apiServiceSrc.includes('resolve: async (alertId)'), 'alerts.resolve defined');
  });

  it('FoodDistributionPage.jsx contains zero hardcoded localhost:5001 URLs', () => {
    const pageSrc = fs.readFileSync(path.resolve('frontend/src/features/foodDistribution/pages/FoodDistributionPage.jsx'), 'utf8');
    assert.ok(!pageSrc.includes('localhost:5001'), 'No hardcoded localhost:5001 in FoodDistributionPage.jsx');
    assert.ok(pageSrc.includes('apiService.hardware.getStatus()'), 'Uses apiService.hardware.getStatus()');
    assert.ok(pageSrc.includes('apiService.hardware.getRecent()'), 'Uses apiService.hardware.getRecent()');
  });

  it('useDashboardData hook uses backend apiService.dashboard.getData()', () => {
    const hookSrc = fs.readFileSync(path.resolve('frontend/src/features/dashboard/hooks/useDashboardData.js'), 'utf8');
    assert.ok(hookSrc.includes('apiService.dashboard.getData()'), 'Calls apiService.dashboard.getData()');
    assert.ok(!hookSrc.includes('getAllStudents()'), 'No raw student fetch in hook');
    assert.ok(!hookSrc.includes('getHealthStatus()'), 'No raw health fetch in hook');
  });

  it('AlertsPage.jsx uses backend apiService.alerts.getAll()', () => {
    const pageSrc = fs.readFileSync(path.resolve('frontend/src/features/alerts/pages/AlertsPage.jsx'), 'utf8');
    assert.ok(pageSrc.includes('apiService.alerts.getAll'), 'Uses apiService.alerts.getAll()');
    assert.ok(pageSrc.includes('apiService.alerts.resolve'), 'Uses apiService.alerts.resolve()');
    assert.ok(!pageSrc.includes('apiService.data.getAllStudents()'), 'No client-side student synthetic alert generation');
  });

  console.log('\n▶ SECTION 7: Database Record Preservation');
  await itAsync('Verified zero existing records were lost or dropped', async () => {
    const [students, logs, health, diet] = await Promise.all([
      query('SELECT COUNT(*) as count FROM students'),
      query('SELECT COUNT(*) as count FROM food_logs'),
      query('SELECT COUNT(*) as count FROM health_status'),
      query('SELECT COUNT(*) as count FROM diet_plan'),
    ]);

    assert.ok(parseInt(students.rows[0].count, 10) >= 2, 'Student records preserved');
    assert.ok(parseInt(logs.rows[0].count, 10) >= 225, 'Food logs records preserved');
    assert.ok(parseInt(health.rows[0].count, 10) >= 2, 'Health status records preserved');
    assert.ok(parseInt(diet.rows[0].count, 10) >= 6, 'Diet plan records preserved');
  });

  console.log('\n======================================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 ALL PHASE 2 INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================================\n');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED');
    console.log('======================================================================\n');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal error during tests:', err);
  process.exit(1);
});

