const express = require('express');

/**
 * Base router class to prevent duplicate route definitions
 * and provide common middleware and error handling
 */
class BaseRouter {
  constructor(routeName) {
    this.router = express.Router();
    this.routeName = routeName;
    this.setupCommonMiddleware();
    this.setupRoutes();
  }

  setupCommonMiddleware() {
    // Common middleware for all routes
    this.router.use((req, res, next) => {
      console.log(`📍 ${this.routeName} - ${req.method} ${req.originalUrl}`);
      next();
    });

    // Add request timestamp
    this.router.use((req, res, next) => {
      req.timestamp = new Date().toISOString();
      next();
    });
  }

  setupRoutes() {
    // Default routes that all routers should have
    this.router.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        route: this.routeName,
        timestamp: req.timestamp
      });
    });
  }

  // Common response methods to prevent code duplication
  sendSuccess(res, data, message = 'Success', statusCode = 200) {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  sendError(res, error, message = 'An error occurred', statusCode = 500) {
    console.error(`❌ ${this.routeName} Error:`, error);
    res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }

  sendNotFound(res, message = 'Resource not found') {
    res.status(404).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  sendValidationError(res, errors, message = 'Validation failed') {
    res.status(400).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  getRouter() {
    return this.router;
  }
}

module.exports = BaseRouter;