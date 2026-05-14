import authRoutes from './authRoutes.js';
import scanRoutes from './scanRoutes.js';
import foodLogRoutes from './foodLogRoutes.js';
import studentRoutes from './studentRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import alertRoutes from './alertRoutes.js';
import dataRoutes from './dataRoutes.js';
import aiRoutes from './aiRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';

/**
 * Route Aggregator
 * Combines all API routes with their prefixes
 * 
 * Usage in app.js:
 * import apiRoutes from './routes/index.js';
 * app.use('/api', apiRoutes);
 */
export const setupRoutes = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/scan', scanRoutes);
  app.use('/api/food-log', foodLogRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/data', dataRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/analytics', analyticsRoutes);

  return app;
};

export default {
  setupRoutes,
};
