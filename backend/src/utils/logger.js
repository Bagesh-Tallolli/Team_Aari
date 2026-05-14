/**
 * Logger utility for consistent logging across the application
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

/**
 * Format timestamp as HH:MM:SS
 */
const getTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Log error message
 */
export const error = (message, data = null) => {
  console.error(
    `${colors.red}[${getTimestamp()}] [${LEVELS.ERROR}]${colors.reset} ${message}`,
    data ? data : ''
  );
};

/**
 * Log warning message
 */
export const warn = (message, data = null) => {
  console.warn(
    `${colors.yellow}[${getTimestamp()}] [${LEVELS.WARN}]${colors.reset} ${message}`,
    data ? data : ''
  );
};

/**
 * Log info message
 */
export const info = (message, data = null) => {
  console.log(
    `${colors.green}[${getTimestamp()}] [${LEVELS.INFO}]${colors.reset} ${message}`,
    data ? data : ''
  );
};

/**
 * Log debug message (only in development)
 */
export const debug = (message, data = null) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `${colors.cyan}[${getTimestamp()}] [${LEVELS.DEBUG}]${colors.reset} ${message}`,
      data ? data : ''
    );
  }
};

export default {
  error,
  warn,
  info,
  debug,
};
