const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { CacheManager } = require('../lib/cache-manager');
const PerformanceMonitor = require('../lib/performance-monitor');

class PerformanceMiddleware {
  constructor(options = {}) {
    this.cacheManager = new CacheManager(options.cache);
    this.performanceMonitor = new PerformanceMonitor(options.monitoring);
    this.config = {
      compression: {
        threshold: 1024, // Compress responses larger than 1KB
        level: 6, // Compression level (1-9)
        filter: this.shouldCompress,
        ...options.compression
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
        ...options.rateLimit
      },
      slowDown: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        delayAfter: 50, // Allow 50 requests per windowMs without delay
        delayMs: 500, // Add 500ms delay per request after delayAfter
        maxDelayMs: 20000, // Maximum delay of 20 seconds
        ...options.slowDown
      },
      security: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "ws:", "wss:"],
          },
        },
        ...options.security
      },
      ...options
    };
  }

  // Main middleware setup
  setupMiddleware(app) {
    // Security headers
    app.use(helmet({
      contentSecurityPolicy: this.config.security.contentSecurityPolicy,
      crossOriginEmbedderPolicy: false // Allow embedding for certain use cases
    }));

    // Compression
    app.use(compression({
      threshold: this.config.compression.threshold,
      level: this.config.compression.level,
      filter: this.config.compression.filter
    }));

    // Rate limiting
    app.use('/api/', rateLimit(this.config.rateLimit));

    // Slow down repeated requests
    app.use('/api/', slowDown(this.config.slowDown));

    // Performance monitoring
    app.use(this.performanceMonitor.createMiddleware());

    // Cache middleware
    app.use(this.createCacheMiddleware());

    // Response optimization
    app.use(this.createResponseOptimizationMiddleware());

    // Error handling with performance tracking
    app.use(this.createErrorTrackingMiddleware());

    console.log('✅ Performance middleware configured');
  }

  // Custom middleware implementations
  createCacheMiddleware() {
    return async (req, res, next) => {
      // Skip caching for non-GET requests and certain paths
      if (req.method !== 'GET' || this.shouldSkipCache(req.path)) {
        return next();
      }

      const cacheKey = this.generateCacheKey(req);
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('Cache-Control', 'public, max-age=300');
        
        // Send cached response
        if (cached.contentType) {
          res.type(cached.contentType);
        }
        
        return res.send(cached.data);
      }

      // Cache miss - intercept response
      const originalSend = res.send;
      res.send = function(data) {
        // Cache successful responses
        if (res.statusCode === 200) {
          const cacheData = {
            data,
            contentType: res.get('Content-Type'),
            timestamp: Date.now()
          };
          
          const ttl = this.getCacheTTL(req.path);
          this.cacheManager.set(cacheKey, cacheData, ttl);
        }

        res.set('X-Cache', 'MISS');
        return originalSend.call(this, data);
      }.bind(this);

      next();
    };
  }

  createResponseOptimizationMiddleware() {
    return (req, res, next) => {
      // Add performance headers
      res.set('X-Response-Time', Date.now().toString());
      
      // Enable keep-alive
      res.set('Connection', 'keep-alive');
      
      // Add ETag support for static content
      if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
        res.set('ETag', this.generateETag(req.path));
      }

      // Preload critical resources
      if (req.path === '/') {
        res.set('Link', [
          '</css/main.css>; rel=preload; as=style',
          '</js/main.js>; rel=preload; as=script',
          '</fonts/inter.woff2>; rel=preload; as=font; type=font/woff2; crossorigin'
        ].join(', '));
      }

      next();
    };
  }

  createErrorTrackingMiddleware() {
    return (err, req, res, next) => {
      // Record error in performance monitor
      this.performanceMonitor.recordError(err, {
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Continue with error handling
      next(err);
    };
  }

  // API Response Caching
  createApiCacheMiddleware(ttl = 300) {
    return async (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = `api:${req.originalUrl}:${JSON.stringify(req.query)}`;
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        res.set('X-Cache', 'HIT');
        res.set('Cache-Control', `public, max-age=${ttl}`);
        return res.json(cached);
      }

      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200) {
          this.cacheManager.set(cacheKey, data, ttl);
        }
        
        res.set('X-Cache', 'MISS');
        return originalJson.call(this, data);
      }.bind(this);

      next();
    };
  }

  // Database Query Caching
  createDbCacheWrapper(db) {
    return new Proxy(db, {
      get: (target, prop) => {
        if (typeof target[prop] === 'function' && this.isCacheableDbMethod(prop)) {
          return (...args) => {
            const cacheKey = `db:${prop}:${JSON.stringify(args)}`;
            return this.cacheManager.cacheQuery(cacheKey, () => target[prop](...args), 300);
          };
        }
        return target[prop];
      }
    });
  }

  // Utility methods
  shouldCompress(req, res) {
    // Don't compress if response is already compressed
    if (res.get('Content-Encoding')) {
      return false;
    }

    // Don't compress small responses
    const contentLength = res.get('Content-Length');
    if (contentLength && parseInt(contentLength) < 1024) {
      return false;
    }

    // Use default compression filter
    return compression.filter(req, res);
  }

  shouldSkipCache(path) {
    const skipPaths = [
      '/api/auth/',
      '/api/upload/',
      '/api/realtime/',
      '/api/websocket/',
      '/admin/',
      '/health'
    ];

    return skipPaths.some(skipPath => path.startsWith(skipPath));
  }

  generateCacheKey(req) {
    const keyParts = [
      req.path,
      JSON.stringify(req.query),
      req.get('Accept-Language') || 'en',
      req.get('User-Agent') ? this.hashString(req.get('User-Agent')) : 'unknown'
    ];

    return this.hashString(keyParts.join(':'));
  }

  getCacheTTL(path) {
    if (path.startsWith('/api/')) return 300; // 5 minutes for API
    if (path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) return 86400; // 1 day for static assets
    return 3600; // 1 hour for pages
  }

  generateETag(content) {
    return `"${this.hashString(content)}"`;
  }

  hashString(str) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
  }

  isCacheableDbMethod(method) {
    const cacheableMethods = ['find', 'findOne', 'findById', 'count', 'aggregate'];
    return cacheableMethods.includes(method);
  }

  // Performance optimization utilities
  static createStaticFileMiddleware(options = {}) {
    const express = require('express');
    const path = require('path');

    return express.static(options.root || 'public', {
      maxAge: options.maxAge || '1y',
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        // Set appropriate cache headers based on file type
        if (path.endsWith('.html')) {
          res.set('Cache-Control', 'public, max-age=3600'); // 1 hour for HTML
        } else if (path.match(/\.(css|js)$/)) {
          res.set('Cache-Control', 'public, max-age=31536000'); // 1 year for CSS/JS
        } else if (path.match(/\.(png|jpg|jpeg|gif|ico|svg|webp)$/)) {
          res.set('Cache-Control', 'public, max-age=2592000'); // 30 days for images
        }
      }
    });
  }

  static createGracefulShutdown(server, options = {}) {
    const { timeout = 30000 } = options;
    
    const shutdown = (signal) => {
      console.log(`🔄 Received ${signal}, starting graceful shutdown...`);
      
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });

      // Force close after timeout
      setTimeout(() => {
        console.error('❌ Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, timeout);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  // Memory leak detection
  startMemoryMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      const threshold = 500 * 1024 * 1024; // 500MB
      
      if (usage.heapUsed > threshold) {
        console.warn(`⚠️ High memory usage detected: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          console.log('🗑️ Forced garbage collection');
        }
      }
    }, 60000); // Check every minute
  }
}

module.exports = PerformanceMiddleware;