import { query, closeDB } from './src/config/db.js';

async function syncStatus() {
  try {
    const res = await query(`
      SELECT DISTINCT ON (student_id) student_id, status 
      FROM health_status 
      ORDER BY student_id, created_at DESC
    `);
    
    for (const row of res.rows) {
      let riskLevel = 'healthy';
      if (row.status === 'Underweight' || row.status === 'Obese') {
        riskLevel = 'critical';
      } else if (row.status === 'At Risk') {
        riskLevel = 'at_risk';
      }
      
      await query(`UPDATE students SET risk_level = $1 WHERE id = $2`, [riskLevel, row.student_id]);
      console.log(`Updated student ${row.student_id} to risk_level: ${riskLevel}`);
    }

    console.log('Sync complete');
    await closeDB();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

syncStatus();
