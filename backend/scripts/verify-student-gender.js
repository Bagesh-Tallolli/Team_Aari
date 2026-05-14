import { query } from '../src/config/db.js';

async function run() {
  try {
    const unspecified = await query(
      "SELECT COUNT(*)::int AS count FROM students WHERE gender IS NULL OR TRIM(gender) = '' OR gender = 'Not specified'"
    );

    const distribution = await query(
      'SELECT gender, COUNT(*)::int AS count FROM students GROUP BY gender ORDER BY count DESC'
    );

    console.log('remaining_unspecified:', unspecified.rows[0].count);
    console.log('distribution:', distribution.rows);
  } catch (error) {
    console.error('Verification failed:', error.message);
    process.exitCode = 1;
  }
}

run();
