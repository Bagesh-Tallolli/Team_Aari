/**
 * Seed Admin User for PostgreSQL
 * Creates admin user with email: admin@nutrition.com, password: password123
 */

import pool from '../src/config/db.js';
import bcrypt from 'bcryptjs';
import logger from '../src/utils/logger.js';

async function seedAdminUser() {
  const client = await pool.connect();
  try {
    // Check if admin user already exists
    const checkResult = await client.query(
      'SELECT * FROM users WHERE email = $1',
      ['admin@nutrition.com']
    );

    if (checkResult.rows.length > 0) {
      logger.info('✓ Admin user already exists in PostgreSQL');
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash('password123', 10);

    // Insert admin user
    const insertResult = await client.query(
      `INSERT INTO users (email, password_hash, name, role, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, email, name, role`,
      ['admin@nutrition.com', passwordHash, 'Admin User', 'admin', true]
    );

    const adminUser = insertResult.rows[0];
    console.log('\n✅ Admin user created successfully!');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Password: password123\n`);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedAdminUser().catch(console.error);
