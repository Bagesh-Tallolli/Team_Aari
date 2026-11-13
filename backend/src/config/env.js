import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Environment configuration loader
 * Validates required environment variables on startup
 */
const env = {
  // Server
  PORT: parseInt(process.env.PORT || '5001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT_AUTO_INCREMENT: process.env.PORT_AUTO_INCREMENT !== 'false',
  PORT_RETRY_LIMIT: parseInt(process.env.PORT_RETRY_LIMIT || '20', 10),

  // Database (PostgreSQL)
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME || 'nutrition_db',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',

  // AI Service
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:5000/analyze',

  // Hardware Integration Mode
  HARDWARE_MODE: process.env.HARDWARE_MODE === 'true',
  HARDWARE_TIMEOUT_MS: parseInt(process.env.HARDWARE_TIMEOUT_MS || '100', 10),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',

  // Email & SMTP Configuration (Phase 7 & Real-Time Admin Dispatch)
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '465', 10),
  SMTP_USER: process.env.SMTP_USER || 'bagesh.rvce@gmail.com',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  SMTP_SECURE: process.env.SMTP_SECURE !== 'false',
  EMAIL_FROM: process.env.EMAIL_FROM || '"PM POSHAN Administration" <bagesh.rvce@gmail.com>',
  SMTP_TEST_MODE: process.env.SMTP_TEST_MODE === 'true',
};

/**
 * Validate required environment variables
 * Call this on app startup to fail fast if config is incomplete
 */
export const validateEnv = () => {
  const required = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
  ];

  const missing = required.filter(key => !process.env[key] && !env[key]);

  if (missing.length > 0) {
    console.warn(
      `⚠️  Some environment variables not set, using defaults: ${missing.join(', ')}`
    );
  }

  if (Number.isNaN(env.PORT) || env.PORT <= 0 || env.PORT > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`);
  }

  if (Number.isNaN(env.PORT_RETRY_LIMIT) || env.PORT_RETRY_LIMIT < 0) {
    throw new Error(`Invalid PORT_RETRY_LIMIT value: ${process.env.PORT_RETRY_LIMIT}`);
  }

  if (Number.isNaN(env.DB_PORT) || env.DB_PORT <= 0 || env.DB_PORT > 65535) {
    throw new Error(`Invalid DB_PORT value: ${process.env.DB_PORT}`);
  }

  console.log('✓ Environment variables validated');
};

/**
 * Check if running in production
 */
export const isProduction = () => env.NODE_ENV === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = () => env.NODE_ENV === 'development';

export default env;

// Named exports for convenience in ESM imports
export const HARDWARE_MODE = env.HARDWARE_MODE;
export const HARDWARE_TIMEOUT_MS = env.HARDWARE_TIMEOUT_MS;
