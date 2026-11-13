import { query, closeDB } from './src/config/db.js';

async function updateReason() {
  try {
    const res = await query(`SELECT id, bmi, reason FROM health_status`);
    for (const row of res.rows) {
      if (row.reason && !row.reason.includes('normal BMI range')) {
        let newReason = row.reason.trim();
        if (newReason) newReason += ' ';
        newReason += `Your BMI is ${row.bmi}. The normal BMI range is approximately 18.5 - 24.9.`;
        await query(`UPDATE health_status SET reason = $1 WHERE id = $2`, [newReason, row.id]);
        console.log(`Updated reason for health_status ${row.id}`);
      }
    }
    await closeDB();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateReason();
