// Centralized error handling middleware
const AuditLog = require('../models/AuditLog');

// Standard error response format
const sendErrorResponse = (res, error, statusCode = 500) => {
  const errorResponse = {
    success: false,
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  return res.status(statusCode).json(errorResponse);
};

// Async route handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error(`Error in ${req.method} ${req.path}:`, error);
    
    // Log to audit
    AuditLog.logAction({
      action: 'error',
      category: 'system',
      entityType: 'API',
      user: {
        userId: req.user?.id || 'anonymous',
        name: req.user?.name || 'Anonymous',
        ipAddress: req.ip
      },
      metadata: {
        apiEndpoint: req.originalUrl,
        httpMethod: req.method,
        errorMessage: error.message,
        stackTrace: error.stack
      },
      result: 'failure',
      severity: 'high'
    }).catch(console.error);

    sendErrorResponse(res, error);
  });
};

// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Global error handler:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return sendErrorResponse(res, { message: errors.join(', ') }, 400);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendErrorResponse(res, { message: `${field} already exists` }, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendErrorResponse(res, { message: 'Invalid token' }, 401);
  }

  if (err.name === 'TokenExpiredError') {
    return sendErrorResponse(res, { message: 'Token expired' }, 401);
  }

  // Default error
  sendErrorResponse(res, err);
};

module.exports = {
  asyncHandler,
  errorHandler,
  sendErrorResponse
};