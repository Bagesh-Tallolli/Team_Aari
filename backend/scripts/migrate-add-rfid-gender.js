#!/usr/bin/env node

/**
 * Migration Runner - Add RFID and Gender fields to students table
 * Run this script before starting the application to update the SQLite database
 * 
 * Usage: node scripts/migrate-add-rfid-gender.js
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../nutrition_db.sqlite');

console.log('🔄 Starting migration: Adding gender and rfid_card_id columns...');
console.log(`📁 Database path: ${DB_PATH}\n`);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.message);
    process.exit(1);
  }

  console.log('✅ Connected to SQLite database\n');

  // Run migrations sequentially
  runMigrations();
});

function runMigrations() {
  const migrations = [
    {
      name: 'Add gender column',
      sql: `
        ALTER TABLE students ADD COLUMN gender VARCHAR(20) DEFAULT 'Male';
      `,
    },
    {
      name: 'Add rfid_card_id column',
      sql: `
        ALTER TABLE students ADD COLUMN rfid_card_id VARCHAR(100) UNIQUE;
      `,
    },
    {
      name: 'Create index on rfid_card_id',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_students_rfid ON students(rfid_card_id);
      `,
    },
  ];

  let completed = 0;

  migrations.forEach((migration, index) => {
    db.run(migration.sql, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.warn(`⚠️  ${migration.name}: ${err.message}`);
      } else if (err && err.message.includes('duplicate column')) {
        console.log(`✓  ${migration.name}: Already exists (skipped)`);
      } else {
        console.log(`✓  ${migration.name}: Success`);
      }

      completed++;

      if (completed === migrations.length) {
        console.log('\n📊 Verifying schema...\n');
        verifySchema();
      }
    });
  });
}

function verifySchema() {
  db.all(
    `PRAGMA table_info(students);`,
    (err, rows) => {
      if (err) {
        console.error('❌ Error fetching schema:', err.message);
        process.exit(1);
      }

      console.log('📋 Students table schema:');
      console.log('─────────────────────────────────────────');
      rows.forEach((row) => {
        const notNull = row.notnull ? '✓ NOT NULL' : '○ nullable';
        console.log(`  ${row.name.padEnd(20)} ${row.type.padEnd(15)} ${notNull}`);
      });
      console.log('─────────────────────────────────────────\n');

      // Check for key columns
      const hasGender = rows.some((r) => r.name === 'gender');
      const hasRFID = rows.some((r) => r.name === 'rfid_card_id');

      if (hasGender && hasRFID) {
        console.log('✅ Migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('  1. Restart your backend server');
        console.log('  2. Navigate to /students/register to register new students');
        console.log('  3. RFID card IDs will be enforced as unique\n');
      } else {
        console.error('❌ Migration incomplete - missing columns');
        if (!hasGender) console.error('   - Missing: gender');
        if (!hasRFID) console.error('   - Missing: rfid_card_id\n');
      }

      db.close();
    }
  );
}
