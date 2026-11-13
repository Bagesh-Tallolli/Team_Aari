import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

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

function runPythonSnippet(snippet) {
  return new Promise((resolve, reject) => {
    const py = spawn('python', ['-c', snippet]);
    let stdout = '';
    let stderr = '';
    py.stdout.on('data', d => stdout += d.toString());
    py.stderr.on('data', d => stderr += d.toString());
    py.on('close', code => {
      if (code === 0) {
        const lines = stdout.trim().split(/\r?\n/);
        // Find last non-empty line
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].trim()) {
            return resolve(lines[i].trim());
          }
        }
        resolve('');
      } else {
        reject(new Error(stderr || stdout || `Exited with code ${code}`));
      }
    });
  });
}

async function run() {
  console.log('======================================================================');
  console.log('🧪 PHASE 3 TEST SUITE: RANDOM FOREST AI PIPELINE RESTORATION');
  console.log('======================================================================\n');

  console.log('▶ SECTION 1: Model Artifacts & Metadata Inspection');
  it('Model file (model.pkl) exists and is non-empty', () => {
    const p = path.resolve('ai-service/model.pkl');
    assert.ok(fs.existsSync(p), 'model.pkl exists');
    assert.ok(fs.statSync(p).size > 1000, 'model.pkl has valid size');
  });

  it('Metadata file (model_metadata.json) exists and defines 17 features', () => {
    const p = path.resolve('ai-service/model_metadata.json');
    assert.ok(fs.existsSync(p), 'model_metadata.json exists');
    const meta = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.strictEqual(meta.feature_count, 17, 'Features count is 17');
    assert.strictEqual(meta.feature_columns.length, 17, 'Feature columns length is 17');
    assert.ok(meta.feature_columns.includes('pediatric_z_score_category'), 'Includes pediatric z-category');
    assert.ok(meta.feature_columns.includes('school_meal_calories_target'), 'Includes school meal calories target');
    assert.ok(meta.feature_columns.includes('full_day_calories_required'), 'Includes full day calories requirement');
    assert.ok(meta.feature_columns.includes('school_meal_calorie_fulfillment_pct'), 'Includes calorie fulfillment pct');
    assert.ok(meta.feature_columns.includes('recorded_school_days_count'), 'Includes recorded school days count');
  });

  it('Metadata explicitly labels dataset as synthetic and experimental', () => {
    const meta = JSON.parse(fs.readFileSync(path.resolve('ai-service/model_metadata.json'), 'utf8'));
    assert.strictEqual(meta.dataset_info.type, 'synthetic', 'Dataset type is marked synthetic');
    assert.ok(meta.disclaimer.includes('NOT clinically validated'), 'Contains clear non-clinical disclaimer');
  });

  console.log('\n▶ SECTION 2: Real Random Forest Inference & Probability Restoration');
  await itAsync('Real model.predict and predict_proba are executed (no hardcoded bypass)', async () => {
    const pyCode = `
import sys, json
sys.path.insert(0, 'ai-service')
import app
client = app.app.test_client()
res = client.post('/predict', json={
    'age': 10,
    'gender': 1,
    'height_cm': 138.0,
    'weight_kg': 31.0,
    'actual_school_calories_served': 450.0,
    'avg_weekly_calories': 450.0
})
d = res.get_json()
assert res.status_code == 200, f'Status {res.status_code}'
assert d['success'] == True
assert 'probabilities' in d
assert 'healthy' in d['probabilities']
assert 'at_risk' in d['probabilities']
assert 'underweight' in d['probabilities']
# Verify probabilities are genuine floats summing to ~1.0
total_p = sum(d['probabilities'].values())
assert abs(total_p - 1.0) < 0.05, f'Probabilities sum to {total_p}'
assert d['model_metadata']['inference_engine'] == 'scikit-learn'
print(json.dumps({'status': d['status'], 'confidence': d['confidence'], 'probs': d['probabilities']}))
`;
    const out = await runPythonSnippet(pyCode);
    const parsed = JSON.parse(out);
    assert.ok(typeof parsed.confidence === 'number', 'Confidence is numeric');
    assert.ok(parsed.confidence > 0.5, 'Model identified confident class');
  });

  await itAsync('Model predicts Underweight for severe thinness with calorie deficit', async () => {
    const pyCode = `
import sys, json
sys.path.insert(0, 'ai-service')
import app
client = app.app.test_client()
res = client.post('/predict', json={
    'age': 8,
    'gender': 1,
    'height_cm': 120.0,
    'weight_kg': 17.0,
    'actual_school_calories_served': 180.0,
    'avg_weekly_calories': 180.0
})
d = res.get_json()
assert res.status_code == 200
print(d['status'])
`;
    const status = await runPythonSnippet(pyCode);
    assert.strictEqual(status, 'Underweight', 'Underweight accurately predicted');
  });

  console.log('\n▶ SECTION 3: Input Validation & Edge Case Handling');
  await itAsync('Missing age returns controlled 400 error with insufficient_data', async () => {
    const pyCode = `
import sys
sys.path.insert(0, 'ai-service')
import app
client = app.app.test_client()
res = client.post('/predict', json={
    'gender': 1,
    'height': 130,
    'weight': 25
})
d = res.get_json()
assert res.status_code == 400
assert d['status'] == 'insufficient_data'
print('OK')
`;
    const out = await runPythonSnippet(pyCode);
    assert.strictEqual(out, 'OK');
  });

  await itAsync('Invalid age out of school range (e.g. 25) is safely rejected', async () => {
    const pyCode = `
import sys
sys.path.insert(0, 'ai-service')
import app
client = app.app.test_client()
res = client.post('/predict', json={
    'age': 25,
    'gender': 1,
    'height': 175,
    'weight': 70
})
assert res.status_code == 400
print('REJECTED_OUT_OF_RANGE')
`;
    const out = await runPythonSnippet(pyCode);
    assert.strictEqual(out, 'REJECTED_OUT_OF_RANGE');
  });

  console.log('\n▶ SECTION 4: Independent Pediatric Growth Screening (WHO 5-19)');
  await itAsync('Pediatric screening is independent of AI model and preserves WHO references', async () => {
    const pyCode = `
import sys, json
sys.path.insert(0, 'ai-service')
import app
client = app.app.test_client()
res = client.post('/predict', json={
    'age': 12,
    'gender': 0, # Female
    'height_cm': 148.0,
    'weight_kg': 40.0,
    'actual_school_calories_served': 700.0
})
d = res.get_json()
ps = d['pediatric_screening']
assert ps['standard'] == 'WHO Growth Reference (5-19 years)'
assert ps['label'] == 'Healthy Weight'
assert 'screening_disclaimer' in ps
print(json.dumps({'label': ps['label'], 'bmi': ps['bmi']}))
`;
    const out = await runPythonSnippet(pyCode);
    const parsed = JSON.parse(out);
    assert.strictEqual(parsed.label, 'Healthy Weight');
  });

  console.log('\n▶ SECTION 5: Separation of PM POSHAN Targets vs Full-Day Requirements');
  await itAsync('Primary (<=10) and Upper Primary (11-15) targets remain distinct', async () => {
    const pyCode = `
import sys, json
sys.path.insert(0, 'ai-service')
import app
client = app.app.test_client()
res_prim = client.post('/predict', json={'age': 9, 'gender': 1, 'height': 130, 'weight': 27, 'avg_weekly_calories': 400})
d_prim = res_prim.get_json()

res_upper = client.post('/predict', json={'age': 13, 'gender': 1, 'height': 152, 'weight': 42, 'avg_weekly_calories': 650})
d_upper = res_upper.get_json()

prim_target = d_prim['nutrition_summary']['school_meal_calories_target']
upper_target = d_upper['nutrition_summary']['school_meal_calories_target']

assert prim_target == 450.0, f'Expected 450, got {prim_target}'
assert upper_target == 700.0, f'Expected 700, got {upper_target}'
print(f'Primary:{prim_target}, UpperPrimary:{upper_target}')
`;
    const out = await runPythonSnippet(pyCode);
    assert.strictEqual(out, 'Primary:450.0, UpperPrimary:700.0');
  });

  console.log('\n▶ SECTION 6: Frontend & Backend Integration Verification');
  it('predictionService.js supplies 17-feature payload with pediatric assessment', () => {
    const src = fs.readFileSync(path.resolve('backend/src/services/predictionService.js'), 'utf8');
    assert.ok(src.includes('pediatric_z_score_category'), 'Includes pediatric_z_score_category');
    assert.ok(src.includes('school_meal_protein_fulfillment_pct'), 'Includes school_meal_protein_fulfillment_pct');
    assert.ok(src.includes('seven_day_avg_daily_calories'), 'Includes seven_day_avg_daily_calories');
    assert.ok(src.includes('recorded_school_days_count'), 'Includes recorded_school_days_count');
    assert.ok(!src.includes('confidence: 0.85'), 'Removed hardcoded fake confidence in fallback');
  });

  it('aiService.js integrates with Flask predict endpoint', () => {
    const src = fs.readFileSync(path.resolve('backend/src/services/aiService.js'), 'utf8');
    assert.ok(src.includes('/predict'), 'Targets /predict endpoint');
    assert.ok(src.includes('contributing_factors'), 'Propagates contributing factors');
  });

  it('StudentProfilePage.jsx visibly marks AI screening as experimental with non-clinical disclaimer', () => {
    const src = fs.readFileSync(path.resolve('frontend/src/features/students/pages/StudentProfilePage.jsx'), 'utf8');
    assert.ok(src.includes('Random Forest (Experimental)'), 'Displays Experimental badge');
    assert.ok(src.includes('Not a medical or clinical diagnosis'), 'Displays medical disclaimer');
  });

  it('StudentNutritionTracker.jsx displays experimental AI screening badge and disclaimer', () => {
    const src = fs.readFileSync(path.resolve('frontend/src/features/students/pages/StudentNutritionTracker.jsx'), 'utf8');
    assert.ok(src.includes('Random Forest (Experimental Prototype)'), 'Displays Experimental Prototype badge');
    assert.ok(src.includes('Not a medical or clinical diagnosis'), 'Displays medical disclaimer');
  });

  console.log('\n======================================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 ALL PHASE 3 AI PIPELINE TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================================\n');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED');
    console.log('======================================================================\n');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal error during Phase 3 tests:', err);
  process.exit(1);
});
