import pg from 'pg';
import env from './env.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

/**
 * PostgreSQL Database Connection & Query Handler
 * Uses connection pooling for better performance
 * 
 * Features:
 * - Connection pooling with configurable limits
 * - Parameterized queries to prevent SQL injection
 * - Error logging and handling
 * - Support for both SELECT and DML queries
 */

const pool = new Pool({
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Handle pool errors
 */
pool.on('error', (err) => {
  logger.error('❌ Unexpected error on idle client:', err);
});

/**
 * Connect to database
 * Tests the connection and logs status
 */
export const connectDB = async () => {
  try {
    const client = await pool.connect();
    logger.info('✓ Database connected successfully');
    logger.info(`  Host: ${env.DB_HOST}:${env.DB_PORT}`);
    logger.info(`  Database: ${env.DB_NAME}`);
    client.release();
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

/**
 * Execute database query with parameterized values
 * Uses PostgreSQL parameterized query format ($1, $2, etc.)
 * 
 * @param {string} queryText - SQL query with $1, $2, etc. placeholders
 * @param {array} params - Values for parameterized query
 * @returns {Promise<object>} Query result with rows property
 * @throws {Error} If query execution fails
 */
export const query = async (queryText, params = []) => {
  const start = Date.now();
  
  try {
    const result = await pool.query(queryText, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      logger.warn(`⚠️  Slow query (${duration}ms): ${queryText.substring(0, 50)}...`);
    }

    return {
      rows: result.rows || [],
      rowCount: result.rowCount || 0,
    };
  } catch (error) {
    logger.error('❌ Database query error:', error.message);
    logger.error('Query:', queryText.substring(0, 100));
    logger.error('Params:', params);
    throw error;
  }
};

/**
 * Execute a raw query without error handling
 * Used for schema initialization and migrations
 * 
 * @param {string} queryText - SQL query
 * @param {array} params - Parameters (optional)
 * @returns {Promise<object>} Raw query result
 */
export const rawQuery = async (queryText, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(queryText, params);
    return result;
  } finally {
    client.release();
  }
};

/**
 * Close database connection pool
 */
export const closeDB = async () => {
  try {
    await pool.end();
    logger.info('✓ Database connection pool closed');
  } catch (error) {
    logger.error('❌ Error closing database connection:', error.message);
  }
};

export default pool;
