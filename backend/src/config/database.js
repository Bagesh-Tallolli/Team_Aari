import initSqlJs from 'sql.js';
import env from './env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

/**
 * ⚠️ DEPRECATED & ISOLATED: Legacy SQLite Configuration (sql.js)
 * 
 * PostgreSQL (backend/src/config/db.js) is the canonical production database.
 * This file is retained exclusively as an offline/in-memory fallback module.
 * No production controllers, routes, or services depend on this module.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(process.cwd(), env.DB_PATH || './nutrition_db.sqlite');

let db = null;
let SQL = null;

/**
 * Initialize sql.js
 */
const initSQL = async () => {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
};

/**
 * Load or create database
 */
const loadOrCreateDB = async () => {
  const SQL = await initSQL();
  
  if (fs.existsSync(dbPath)) {
    console.log(`📂 Loading existing database: ${dbPath}`);
    const buf = fs.readFileSync(dbPath);
    return new SQL.Database(buf);
  } else {
    console.log(`📂 Creating new database: ${dbPath}`);
    return new SQL.Database();
  }
};

/**
 * Save database to disk
 */
const saveDatabase = () => {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (error) {
    console.error('❌ Failed to save database:', error.message);
  }
};

/**
 * Initialize database schema
 */
const initializeSchema = () => {
  try {
    if (!db) return;
    
    // Check if tables already exist
    const tableCheck = db.exec(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='students'
    `);
    
    if (tableCheck.length > 0) {
      console.log('✓ Database schema already exists');
      return;
    }
    
    console.log('📋 Creating database schema...');
    
    // Read and execute schema
    const schemaPath = path.resolve(process.cwd(), './database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Use exec() for multiple statements (handles newlines better than splitting)
    try {
      db.exec(schema);
    } catch (err) {
      // If exec fails, try splitting and running individually
      const statements = schema.split(';').filter(stmt => stmt.trim());
      for (const stmt of statements) {
        if (stmt.trim()) {
          try {
            db.run(stmt.trim());
          } catch (stmtErr) {
            console.warn(`⚠️  Skipping statement: ${stmt.substring(0, 50)}...`);
          }
        }
      }
    }
    console.log('✓ Database schema created successfully');
    
    // Seed data
    const seedPath = path.resolve(process.cwd(), './database/seed.sqlite.sql');
    if (fs.existsSync(seedPath)) {
      console.log('🌱 Seeding database with sample data...');
      const seedData = fs.readFileSync(seedPath, 'utf8');
      
      // Use exec() for seed data as well
      try {
        db.exec(seedData);
      } catch (err) {
        // If exec fails, try splitting and running individually
        const seedStatements = seedData.split(';').filter(stmt => stmt.trim());
        for (const stmt of seedStatements) {
          if (stmt.trim()) {
            try {
              db.run(stmt.trim());
            } catch (stmtErr) {
              console.warn(`⚠️  Skipping seed statement: ${stmt.substring(0, 50)}...`);
            }
          }
        }
      }
      console.log('✓ Database seeded successfully');
    }
    
    // Save after initialization
    saveDatabase();
  } catch (error) {
    console.error('❌ Failed to initialize schema:', error.message);
    throw error;
  }
};

/**
 * Connect to database
 * Tests the connection and initializes the database
 */
export const connectDB = async () => {
  try {
    if (!db) {
      db = await loadOrCreateDB();
      initializeSchema();
    }
    
    // Test connection
    const result = db.exec('SELECT 1');
    console.log('✓ Database connected successfully');
    console.log(`  Database file: ${dbPath}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

/**
 * Query execution with parameterized queries
 * Handles both SELECT and INSERT/UPDATE/DELETE queries
 * 
 * @param {string} queryText - SQL query with ? placeholders
 * @param {array} params - Parameters to substitute in placeholders
 * @returns {Promise<object>} Query result object with rows property
 */
export const query = async (queryText, params = []) => {
  try {
    if (!db) {
      db = await loadOrCreateDB();
      initializeSchema();
    }

    const start = Date.now();
    
    // Determine if it's a SELECT query
    const isSelect = /^\s*SELECT/i.test(queryText);
    
    let result;
    
    if (isSelect) {
      // SELECT queries
      try {
        const stmt = db.prepare(queryText);
        stmt.bind(params);
        
        const rows = [];
        while (stmt.step()) {
          const row = stmt.getAsObject();
          rows.push(row);
        }
        stmt.free();
        
        result = {
          rows: rows,
          rowCount: rows.length,
        };
      } catch (error) {
        // If binding fails, try without binding (for queries without params)
        const results = db.exec(queryText);
        const rows = [];
        if (results.length > 0) {
          const columns = results[0].columns;
          const values = results[0].values;
          values.forEach(row => {
            const obj = {};
            columns.forEach((col, idx) => {
              obj[col] = row[idx];
            });
            rows.push(obj);
          });
        }
        result = {
          rows: rows,
          rowCount: rows.length,
        };
      }
    } else {
      // INSERT, UPDATE, DELETE queries
      const stmt = db.prepare(queryText);
      stmt.bind(params);
      stmt.step();
      stmt.free();
      
      // Get changes count
      const changes = db.exec('SELECT changes() as changes');
      const rowCount = changes.length > 0 ? changes[0].values[0][0] : 0;
      
      result = {
        rows: [],
        rowCount: rowCount,
      };
    }
    
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`⚠️  Slow query (${duration}ms): ${queryText.substring(0, 50)}...`);
    }
    
    // Save database after modifications
    if (!isSelect) {
      saveDatabase();
    }
    
    return result;
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    console.error('Query:', queryText);
    console.error('Params:', params);
    throw error;
  }
};

/**
 * Get connection for transactions
 * Returns an object that supports transaction operations
 */
export const getClient = async () => {
  if (!db) {
    db = await loadOrCreateDB();
    initializeSchema();
  }
  
  return {
    query: (queryText, params = []) => query(queryText, params),
    release: () => Promise.resolve(),
  };
};

/**
 * Close database connection
 * Call on application shutdown
 */
export const closeDB = async () => {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    console.log('✓ Database connection closed');
  }
};

export default db;
