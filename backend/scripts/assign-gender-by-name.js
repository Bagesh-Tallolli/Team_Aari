import { query } from '../src/config/db.js';

const FEMALE_FIRST_NAMES = new Set([
  'ananya', 'anita', 'anjali', 'aarti', 'bhavana', 'divya', 'fatima', 'gayatri', 'harsimran', 'isha',
  'jasleen', 'kavya', 'mahima', 'nisha', 'ojaswi', 'pooja', 'priya', 'quratulain', 'riya', 'sakshi',
  'sana', 'shreya', 'simran', 'sneha', 'sunita', 'usha', 'zoya'
]);

const MALE_FIRST_NAMES = new Set([
  'aditya', 'ajay', 'akash', 'amit', 'arjun', 'chirag', 'dev', 'karan', 'mohit', 'nikhil',
  'nitin', 'pankaj', 'pranav', 'rahul', 'raj', 'rajesh', 'ravi', 'rohan', 'sanjay', 'saurabh',
  'shubham', 'tushar', 'vijay'
]);

const TRANSGENDER_FIRST_NAMES = new Set([
  // Add known names here if your institution data has explicit transgender naming preferences.
]);

function classifyGender(name) {
  const firstName = (name || '').trim().split(/\s+/)[0].toLowerCase();
  if (TRANSGENDER_FIRST_NAMES.has(firstName)) return 'Transgender';
  if (FEMALE_FIRST_NAMES.has(firstName)) return 'Female';
  if (MALE_FIRST_NAMES.has(firstName)) return 'Male';
  return 'Other';
}

async function run() {
  try {
    const { rows } = await query(
      "SELECT id, name, gender FROM students WHERE gender IS NULL OR TRIM(gender) = '' OR gender = 'Not specified'"
    );

    let updated = 0;
    const bucket = { Male: 0, Female: 0, Transgender: 0, Other: 0 };

    for (const row of rows) {
      const gender = classifyGender(row.name);
      await query('UPDATE students SET gender = $1 WHERE id = $2', [gender, row.id]);
      updated += 1;
      bucket[gender] += 1;
    }

    console.log(`Updated ${updated} students.`);
    console.log('Breakdown:', bucket);
  } catch (error) {
    console.error('Failed to assign gender by name:', error.message);
    process.exitCode = 1;
  }
}

run();
