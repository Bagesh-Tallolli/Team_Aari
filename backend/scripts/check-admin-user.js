/**
 * Check admin user in PostgreSQL database
 */
import pool from '../src/config/db.js';

async function checkAdminUser() {
  const client = await pool.connect();
  try {
    console.log('\n=== Checking Admin User in PostgreSQL ===\n');
    
    // Check all users first
    const allUsersResult = await client.query('SELECT id, email, name, role, active FROM users');
    console.log(`Total users in database: ${allUsersResult.rows.length}`);
    console.log('\nAll users:');
    allUsersResult.rows.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Role: ${user.role}, Active: ${user.active}`);
    });

    // Check for admin user specifically
    console.log('\n--- Checking for admin@nutrition.com ---');
    const adminResult = await client.query(
      'SELECT id, email, name, role, active, password_hash FROM users WHERE email = $1',
      ['admin@nutrition.com']
    );

    if (adminResult.rows.length === 0) {
      console.log('❌ Admin user NOT FOUND in database');
    } else {
      const admin = adminResult.rows[0];
      console.log('✅ Admin user found:');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Active: ${admin.active}`);
      console.log(`   Password Hash Length: ${admin.password_hash.length}`);
      console.log(`   Password Hash Starts With: ${admin.password_hash.substring(0, 20)}...`);
    }

    // Check for active users only
    console.log('\n--- Checking for active admin users ---');
    const activeAdminResult = await client.query(
      'SELECT id, email, name, role, active FROM users WHERE email = $1 AND active = $2',
      ['admin@nutrition.com', true]
    );

    if (activeAdminResult.rows.length === 0) {
      console.log('❌ Active admin user NOT FOUND');
    } else {
      console.log('✅ Active admin user found');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAdminUser();
