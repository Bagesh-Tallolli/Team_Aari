/**
 * Update admin user password to password123
 */
import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';

async function updateAdminPassword() {
  const client = await pool.connect();
  try {
    console.log('\n=== Updating Admin Password ===\n');
    
    // Hash the new password
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log(`New Password: ${newPassword}`);
    console.log(`New Hash: ${hashedPassword}\n`);

    // Update password
    const result = await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING id, email, name',
      [hashedPassword, 'admin@nutrition.com']
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Admin password updated successfully!');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`\n   New credentials:`);
      console.log(`   Email: admin@nutrition.com`);
      console.log(`   Password: password123\n`);
    } else {
      console.log('❌ Admin user not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

updateAdminPassword();
