/**
 * Test bcrypt password verification
 */
import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';

async function testPasswordVerification() {
  const client = await pool.connect();
  try {
    console.log('\n=== Testing Password Verification ===\n');
    
    // Get admin user
    const result = await client.query(
      'SELECT password_hash FROM users WHERE email = $1',
      ['admin@nutrition.com']
    );

    if (result.rows.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }

    const storedHash = result.rows[0].password_hash;
    const testPassword = 'password123';

    console.log('Testing password: "' + testPassword + '"');
    console.log('Stored hash:', storedHash);
    console.log('Hash length:', storedHash.length);
    console.log('Hash starts with $2a$10$: ', storedHash.startsWith('$2a$10$'));
    console.log('');

    // Test verification
    try {
      const isValid = await bcrypt.compare(testPassword, storedHash);
      console.log(`bcrypt.compare result: ${isValid}`);
      
      if (isValid) {
        console.log('✅ Password verification SUCCESSFUL');
      } else {
        console.log('❌ Password verification FAILED');
        console.log('\nTrying other common passwords...');
        
        const commonPasswords = ['password', '123456', 'admin', 'admin123', 'password123'];
        for (const pwd of commonPasswords) {
          const test = await bcrypt.compare(pwd, storedHash);
          if (test) {
            console.log(`   ✅ Found working password: "${pwd}"`);
            break;
          }
        }
      }
    } catch (error) {
      console.log('❌ Error during bcrypt comparison:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testPasswordVerification();
