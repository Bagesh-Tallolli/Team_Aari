/**
 * Seed an admin user for testing API endpoints
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.resolve(process.cwd(), './nutrition_db.sqlite');

async function seedAdminUser() {
  try {
    const SQL = await initSqlJs();

    // Load database
    if (!fs.existsSync(dbPath)) {
      console.error('❌ Database file not found:', dbPath);
      process.exit(1);
    }

    const buf = fs.readFileSync(dbPath);
    const db = new SQL.Database(buf);

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Check if user exists
    const checkUser = db.exec(`SELECT * FROM users WHERE email = 'admin@nutrition.com'`);
    
    if (checkUser.length > 0 && checkUser[0].values.length > 0) {
      console.log('✓ Admin user already exists');
    } else {
      // Insert admin user
      const stmt = db.prepare(`
        INSERT INTO users (name, email, password, role, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);
      
      stmt.bind(['Admin User', 'admin@nutrition.com', hashedPassword, 'admin']);
      stmt.step();
      stmt.free();

      console.log('✓ Admin user created');
    }

    // Save database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);

    console.log('✅ Admin user seeding complete!');
    console.log('   Email: admin@nutrition.com');
    console.log('   Password: password123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedAdminUser();
