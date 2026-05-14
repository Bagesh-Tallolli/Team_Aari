#!/usr/bin/env node
/**
 * Migration Script: Add gender and rfid_card_id to students table (PostgreSQL)
 */

import { query } from '../src/config/db.js';
import logger from '../src/utils/logger.js';

console.log('🔄 Running migration: Add gender and rfid_card_id to students table\n');

try {
  // Step 1: Check if columns already exist
  console.log('📝 STEP 1: Checking existing columns...');
  
  const columnsCheck = await query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'students' 
    AND column_name IN ('gender', 'rfid_card_id')
  `);
  
  const existingColumns = columnsCheck.rows.map(row => row.column_name);
  console.log('   Existing columns:', existingColumns.length === 0 ? 'None' : existingColumns.join(', '));
  
  // Step 2: Add gender column if missing
  if (!existingColumns.includes('gender')) {
    console.log('\n📝 STEP 2: Adding gender column...');
    await query(`
      ALTER TABLE students 
      ADD COLUMN gender VARCHAR(20)
    `);
    console.log('   ✅ Gender column added');
  } else {
    console.log('\n📝 STEP 2: Gender column already exists');
  }
  
  // Step 3: Add rfid_card_id column if missing
  if (!existingColumns.includes('rfid_card_id')) {
    console.log('\n📝 STEP 3: Adding rfid_card_id column...');
    await query(`
      ALTER TABLE students 
      ADD COLUMN rfid_card_id VARCHAR(100) UNIQUE
    `);
    console.log('   ✅ RFID card ID column added');
  } else {
    console.log('\n📝 STEP 3: RFID card ID column already exists');
  }
  
  // Step 4: Create index on rfid_card_id for fast lookups
  console.log('\n📝 STEP 4: Creating index on rfid_card_id...');
  try {
    await query(`
      CREATE INDEX IF NOT EXISTS idx_students_rfid ON students(rfid_card_id)
    `);
    console.log('   ✅ Index created');
  } catch (err) {
    if (err.code === '42P07') {
      console.log('   ℹ️  Index already exists');
    } else {
      throw err;
    }
  }
  
  // Step 5: Verify schema
  console.log('\n📝 STEP 5: Verifying schema...');
  const verifyColumns = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'students' 
    ORDER BY ordinal_position
  `);
  
  console.log('   Students table columns:');
  verifyColumns.rows.forEach(col => {
    if (['gender', 'rfid_card_id', 'name', 'age', 'height', 'weight', 'current_bmi'].includes(col.column_name)) {
      console.log(`   ✅ ${col.column_name}: ${col.data_type}`);
    }
  });
  
  console.log('\n✅ Migration completed successfully!\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
}
