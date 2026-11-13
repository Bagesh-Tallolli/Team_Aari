import app from './app.js';
import env, { validateEnv } from './config/env.js';
import { connectDB, closeDB } from './config/db.js';
import logger from './utils/logger.js';

/**
 * Server Entry Point
 * Starts Express server and connects to PostgreSQL database
 */

const isPortConflictError = (error) => error?.code === 'EADDRINUSE';

const isPermissionError = (error) => error?.code === 'EACCES';

const openHttpServer = (port) => new Promise((resolve, reject) => {
  const server = app.listen(port, '0.0.0.0');

  server.once('listening', () => resolve(server));
  server.once('error', (error) => reject(error));
});

const startServerWithFallback = async (startPort, retryLimit, allowAutoIncrement) => {
  let port = startPort;

  for (let attempt = 0; attempt <= retryLimit; attempt += 1) {
    try {
      const server = await openHttpServer(port);
      return { server, port };
    } catch (error) {
      if (isPortConflictError(error) && allowAutoIncrement && attempt < retryLimit) {
        logger.warn(`⚠️  Port ${port} is already in use. Trying port ${port + 1}...`);
        port += 1;
        continue;
      }

      throw error;
    }
  }

  throw new Error(`No available port found after ${retryLimit + 1} attempts starting at ${startPort}`);
};

const startServer = async () => {
  let server;
  let isShuttingDown = false;

  try {
    // ============================================================
    // STEP 1: Validate Environment Variables
    // ============================================================
    logger.info('🔍 Validating environment variables...');
    validateEnv();

    // ============================================================
    // STEP 2: Connect to Database
    // ============================================================
    logger.info('🗄️  Connecting to PostgreSQL database...');
    await connectDB();

    // ============================================================
    // STEP 3: Start Server
    // ============================================================
    const startPort = env.PORT;
    const { server: startedServer, port: activePort } = await startServerWithFallback(
      startPort,
      env.PORT_RETRY_LIMIT,
      env.PORT_AUTO_INCREMENT
    );
    server = startedServer;

    logger.info(`🚀 Server running on http://localhost:${activePort}`);
    logger.info(`📝 Environment: ${env.NODE_ENV}`);
    logger.info(`AI Service URL: ${env.AI_SERVICE_URL}`);

    if (activePort !== startPort) {
      logger.warn(`⚠️  Requested port ${startPort} was unavailable. Using ${activePort} instead.`);
    }

    server.on('error', (error) => {
      if (isPortConflictError(error)) {
        logger.error(`❌ Port ${activePort} is already in use.`);
      } else if (isPermissionError(error)) {
        logger.error(`❌ Permission denied on port ${activePort}.`);
      } else {
        logger.error('❌ Server runtime error:', error);
      }
      process.exit(1);
    });

    // ============================================================
    // GRACEFUL SHUTDOWN
    // ============================================================
    const gracefulShutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.warn(`Received ${signal}, shutting down gracefully...`);

      server.close(async () => {
        logger.info('Server closed');
        await closeDB();
        logger.info('Database connection closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown - timeout reached');
        process.exit(1);
      }, 10000);
    };

    process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.once('SIGINT', () => gracefulShutdown('SIGINT'));

    // ============================================================
    // Handle Uncaught Exceptions
    // ============================================================
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught Exception:', error);
      await closeDB();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      await closeDB();
      process.exit(1);
    });
  } catch (error) {
    if (isPortConflictError(error)) {
      logger.error(
        `❌ Failed to start server: port ${env.PORT} is in use and no fallback port was available. `
        + 'Stop the conflicting process or enable PORT_AUTO_INCREMENT=true.'
      );
    } else if (isPermissionError(error)) {
      logger.error(`❌ Failed to start server: permission denied for port ${env.PORT}.`);
    } else {
      logger.error('❌ Failed to start server:', error.message);
    }

    await closeDB();
    process.exit(1);
  }
};

// Start the server
startServer();
