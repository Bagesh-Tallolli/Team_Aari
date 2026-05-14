import { query } from '../src/config/db.js';

const checkDb = async () => {
  try {
    const result = await query(
      'SELECT id, student_id, status, confidence, ai_prediction, created_at FROM health_status WHERE id >= 9 ORDER BY id DESC LIMIT 3'
    );

    console.log('\n🔍 Health Status Records:\n');
    result.rows.forEach((row, idx) => {
      console.log(`Record ${idx + 1}:`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Student ID: ${row.student_id}`);
      console.log(`  Status: ${row.status}`);
      console.log(`  Confidence: ${row.confidence}`);
      console.log(`  Created: ${row.created_at}`);
      console.log(`  AI Prediction Type: ${typeof row.ai_prediction}`);
      console.log(`  AI Prediction (raw): ${row.ai_prediction}`);
      
      if (row.ai_prediction) {
        try {
          if (typeof row.ai_prediction === 'string') {
            const parsed = JSON.parse(row.ai_prediction);
            console.log(`  AI Prediction (parsed): ${JSON.stringify(parsed, null, 2)}`);
          } else {
            console.log(`  AI Prediction (object): ${JSON.stringify(row.ai_prediction, null, 2)}`);
          }
        } catch (e) {
          console.log(`  ❌ Error parsing: ${e.message}`);
        }
      }
      console.log();
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkDb();
