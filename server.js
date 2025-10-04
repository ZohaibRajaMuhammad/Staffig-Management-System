const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Database connection test
const initializeServer = async () => {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Cannot start server without database connection');
      process.exit(1);
    }

    console.log('✅ Database connection established');

    // Routes
    app.use('/api/candidates', require('./routes/candidates'));

    // Basic route
    app.get('/', (req, res) => {
      res.json({ 
        message: 'Staffing Management System API',
        version: '1.0.0',
        database: 'SQL Server',
        timestamp: new Date().toISOString()
      });
    });

    // Health check endpoint
    app.get('/health', async (req, res) => {
      try {
        const isHealthy = await testConnection();
        res.json({ 
          status: isHealthy ? 'OK' : 'Degraded',
          database: isHealthy ? 'Connected' : 'Disconnected',
          server: 'Running',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development'
        });
      } catch (error) {
        res.status(503).json({ 
          status: 'Error',
          database: 'Disconnected',
          server: 'Running',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // API info endpoint
    app.get('/api/info', (req, res) => {
      res.json({
        name: 'Staffing Management API',
        version: '1.0.0',
        description: 'Backend API for Staffing Management System',
        database: 'SQL Server',
        endpoints: {
          candidates: '/api/candidates',
          health: '/health'
        }
      });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Error Stack:', err.stack);
      console.error('Error Details:', {
        message: err.message,
        code: err.code,
        number: err.number
      });

      // SQL Server error handling
      if (err.originalError && err.originalError.info) {
        const sqlError = err.originalError.info;
        console.error('SQL Server Error:', {
          message: sqlError.message,
          number: sqlError.number,
          state: sqlError.state,
          procedure: sqlError.procedure,
          lineNumber: sqlError.lineNumber
        });
      }

      res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ 
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method
      });
    });

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: SQL Server`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`❤️  Health check: http://localhost:${PORT}/health`);
      console.log(`📋 API Info: http://localhost:${PORT}/api/info`);
    });

  } catch (error) {
    console.error('💥 Failed to initialize server:', error.message);
    process.exit(1);
  }
};

// Start the server
initializeServer();

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Uncaught exception handlers
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});