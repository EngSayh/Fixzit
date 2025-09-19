require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import services and middleware
const DatabaseService = require('./services/DatabaseService');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const userRoutes = require('./routes/userRoutes');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      }
    });
    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealth = await DatabaseService.healthCheck();
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: dbHealth,
          uptime: process.uptime(),
          memory: process.memoryUsage()
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // API routes
    this.app.use('/api/users', userRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Welcome to Fixzit API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          users: '/api/users',
          documentation: '/api/docs'
        },
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler for undefined routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use(errorHandler);

    // Unhandled promise rejection handler
    process.on('unhandledRejection', (err, promise) => {
      console.error('❌ Unhandled Promise Rejection:', err);
      this.gracefulShutdown('Unhandled Promise Rejection');
    });

    // Uncaught exception handler
    process.on('uncaughtException', (err) => {
      console.error('❌ Uncaught Exception:', err);
      this.gracefulShutdown('Uncaught Exception');
    });

    // Graceful shutdown on SIGTERM
    process.on('SIGTERM', () => {
      console.log('📨 SIGTERM received');
      this.gracefulShutdown('SIGTERM');
    });

    // Graceful shutdown on SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      console.log('📨 SIGINT received');
      this.gracefulShutdown('SIGINT');
    });
  }

  async gracefulShutdown(reason) {
    console.log(`🛑 Shutting down server: ${reason}`);
    
    if (this.server) {
      this.server.close(async () => {
        console.log('📴 HTTP server closed');
        
        try {
          await DatabaseService.cleanup();
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
    } else {
      process.exit(0);
    }
  }

  async start() {
    try {
      // Initialize database connection
      await DatabaseService.initialize();

      // Start the server
      this.server = this.app.listen(this.port, () => {
        console.log(`
🚀 Fixzit Server Started Successfully!
📍 Server running on port ${this.port}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Database: ${DatabaseService.isConnected() ? 'Connected' : 'Disconnected'}
⏰ Started at: ${new Date().toISOString()}

Available endpoints:
  🏠 Root: http://localhost:${this.port}/
  ❤️ Health: http://localhost:${this.port}/health
  👥 Users: http://localhost:${this.port}/api/users
        `);
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start();
}

module.exports = Server;