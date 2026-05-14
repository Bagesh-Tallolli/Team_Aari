import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { setupRoutes } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import logger from './utils/logger.js';

/**
 * Express Application Setup
 * Configure all middlewares and routes
 */
const app = express();

// ============================================================
// MIDDLEWARE: Request Parsing
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================================
// MIDDLEWARE: CORS (Cross-Origin Resource Sharing)
// ============================================================
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000', '*'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-msw-bypass'],
};
app.use(cors(corsOptions));

// ============================================================
// MIDDLEWARE: Request Logging (Morgan)
// ============================================================
// Custom morgan format: timestamp method path status response-time
morgan.token('timestamp', () => {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
});

const morganFormat = ':timestamp :method :url :status :response-time ms';
app.use(morgan(morganFormat, {
  skip: (req) => req.path === '/health', // Don't log health checks
}));

// ============================================================
// MIDDLEWARE: Health Check Endpoint
// ============================================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================================
// ROUTES: API Endpoints
// ============================================================

/**
 * Mount all API routes
 * Routes setup:
 * - POST /api/auth/login - User login
 * - GET /api/auth/verify - Verify JWT token
 * - POST /api/scan - RFID scan processing
 * - POST /api/food-log - Food logging (triggers AI analysis)
 * - GET /api/food-log/student/:id - Food history
 * - GET /api/students - List students
 * - GET /api/students/:id - Student profile
 * - GET /api/dashboard - Dashboard aggregation
 * - GET /api/alerts - Get alerts
 * - PUT /api/alerts/:id - Mark alert resolved
 */
setupRoutes(app);

// ============================================================
// ERROR HANDLING: 404 Not Found
// ============================================================
app.use(notFoundHandler);

// ============================================================
// ERROR HANDLING: Global Error Handler
// MUST BE LAST MIDDLEWARE
// ============================================================
app.use(errorHandler);

// ============================================================
// Export App
// ============================================================
logger.info('Express app configured successfully');

export default app;
