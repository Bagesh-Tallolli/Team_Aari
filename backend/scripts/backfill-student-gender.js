import { query } from '../src/config/db.js';

async function run() {
  try {
    const result = await query(
      "UPDATE students SET gender = 'Not specified' WHERE gender IS NULL OR TRIM(gender) = '' RETURNING id"
    );

    console.log(`Updated gender for ${result.rowCount} students.`);
  } catch (error) {
    console.error('Failed to backfill gender:', error.message);
    process.exitCode = 1;
  }
}

run();
