const os = require('os');
const process = require('process');
const { performance, PerformanceObserver } = require('perf_hooks');

class PerformanceMonitor {
  constructor(options = {}) {
    this.config = {
      collectInterval: options.collectInterval || 30000, // 30 seconds
      retentionPeriod: options.retentionPeriod || 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        cpuUsage: options.cpuUsage || 80,
        memoryUsage: options.memoryUsage || 80,
        responseTime: options.responseTime || 2000,
        errorRate: options.errorRate || 5,
        ...options.alertThresholds
      },
      ...options
    };

    this.metrics = {
      system: [],
      requests: [],
      database: [],
      cache: [],
      errors: []
    };

    this.requestTimers = new Map();
    this.activeConnections = 0;
    this.totalRequests = 0;
    this.totalErrors = 0;
    
    this.initialize();
  }

  initialize() {
    // Start system monitoring
    this.startSystemMonitoring();
    
    // Setup performance observers
    this.setupPerformanceObservers();
    
    // Start cleanup interval
    this.startCleanupInterval();
    
    console.log('✅ Performance Monitor initialized');
  }

  // System Metrics
  startSystemMonitoring() {
    setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.collectInterval);
    
    // Collect initial metrics
    this.collectSystemMetrics();
  }

  collectSystemMetrics() {
    const timestamp = Date.now();
    
    // CPU Usage
    const cpuUsage = process.cpuUsage();
    const cpuPercent = this.calculateCpuPercentage(cpuUsage);
    
    // Memory Usage
    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercent = (usedMemory / totalMemory) * 100;
    
    // Load Average
    const loadAvg = os.loadavg();
    
    // Event Loop Lag
    const eventLoopLag = this.measureEventLoopLag();
    
    const systemMetric = {
      timestamp,
      cpu: {
        usage: cpuPercent,
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      memory: {
        used: memUsage.rss,
        heap: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal
        },
        external: memUsage.external,
        percent: memoryPercent
      },
      system: {
        loadAvg: loadAvg[0],
        uptime: process.uptime(),
        platform: os.platform(),
        arch: os.arch()
      },
      eventLoop: {
        lag: eventLoopLag
      },
      connections: this.activeConnections,
      requests: this.totalRequests
    };

    this.metrics.system.push(systemMetric);
    this.checkAlerts(systemMetric);
  }

  calculateCpuPercentage(cpuUsage) {
    if (!this.previousCpuUsage) {
      this.previousCpuUsage = cpuUsage;
      return 0;
    }

    const userDiff = cpuUsage.user - this.previousCpuUsage.user;
    const systemDiff = cpuUsage.system - this.previousCpuUsage.system;
    const totalDiff = userDiff + systemDiff;
    
    this.previousCpuUsage = cpuUsage;
    
    return (totalDiff / 1000 / os.cpus().length) * 100;
  }

  measureEventLoopLag() {
    const start = process.hrtime.bigint();
    return new Promise(resolve => {
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
        resolve(lag);
      });
    });
  }

  // Request Monitoring
  startRequestTimer(requestId, metadata = {}) {
    const startTime = performance.now();
    this.requestTimers.set(requestId, {
      startTime,
      metadata
    });
    
    this.activeConnections++;
    this.totalRequests++;
  }

  endRequestTimer(requestId, statusCode = 200, error = null) {
    const timer = this.requestTimers.get(requestId);
    if (!timer) return;

    const endTime = performance.now();
    const duration = endTime - timer.startTime;
    
    const requestMetric = {
      timestamp: Date.now(),
      requestId,
      duration,
      statusCode,
      error: error ? error.message : null,
      metadata: timer.metadata
    };

    this.metrics.requests.push(requestMetric);
    this.requestTimers.delete(requestId);
    this.activeConnections--;

    if (error || statusCode >= 400) {
      this.totalErrors++;
      this.recordError(error || new Error(`HTTP ${statusCode}`), timer.metadata);
    }

    return requestMetric;
  }

  // Database Performance
  recordDatabaseQuery(query, duration, error = null) {
    const dbMetric = {
      timestamp: Date.now(),
      query: query.substring(0, 100), // Truncate for storage
      duration,
      error: error ? error.message : null,
      success: !error
    };

    this.metrics.database.push(dbMetric);
    
    if (error) {
      this.recordError(error, { type: 'database', query });
    }
  }

  // Cache Performance
  recordCacheOperation(operation, key, hit, duration) {
    const cacheMetric = {
      timestamp: Date.now(),
      operation, // 'get', 'set', 'del'
      key: key.substring(0, 50), // Truncate for storage
      hit,
      duration
    };

    this.metrics.cache.push(cacheMetric);
  }

  // Error Tracking
  recordError(error, metadata = {}) {
    const errorMetric = {
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      name: error.name,
      metadata
    };

    this.metrics.errors.push(errorMetric);
  }

  // Performance Observers
  setupPerformanceObservers() {
    // HTTP requests
    const httpObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.startsWith('http')) {
          this.recordHttpPerformance(entry);
        }
      });
    });
    httpObserver.observe({ entryTypes: ['measure'] });

    // DNS lookups
    const dnsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.recordDnsPerformance(entry);
      });
    });
    dnsObserver.observe({ entryTypes: ['dns'] });
  }

  recordHttpPerformance(entry) {
    const httpMetric = {
      timestamp: Date.now(),
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime
    };
    
    // Add to appropriate metrics collection
    this.metrics.requests.push(httpMetric);
  }

  recordDnsPerformance(entry) {
    const dnsMetric = {
      timestamp: Date.now(),
      hostname: entry.name,
      duration: entry.duration,
      startTime: entry.startTime
    };
    
    // DNS metrics could be tracked separately if needed
  }

  // Analytics and Reporting
  getMetricsSummary(timeRange = 3600000) { // Default 1 hour
    const now = Date.now();
    const cutoff = now - timeRange;

    const recentRequests = this.metrics.requests.filter(r => r.timestamp > cutoff);
    const recentErrors = this.metrics.errors.filter(e => e.timestamp > cutoff);
    const recentDbQueries = this.metrics.database.filter(d => d.timestamp > cutoff);
    const recentCacheOps = this.metrics.cache.filter(c => c.timestamp > cutoff);
    const recentSystemMetrics = this.metrics.system.filter(s => s.timestamp > cutoff);

    return {
      timeRange: {
        start: new Date(cutoff),
        end: new Date(now),
        duration: timeRange
      },
      requests: {
        total: recentRequests.length,
        errors: recentErrors.length,
        errorRate: recentRequests.length > 0 ? (recentErrors.length / recentRequests.length) * 100 : 0,
        avgResponseTime: this.calculateAverage(recentRequests, 'duration'),
        p95ResponseTime: this.calculatePercentile(recentRequests, 'duration', 95),
        p99ResponseTime: this.calculatePercentile(recentRequests, 'duration', 99),
        statusCodes: this.groupBy(recentRequests, 'statusCode')
      },
      database: {
        queries: recentDbQueries.length,
        avgQueryTime: this.calculateAverage(recentDbQueries, 'duration'),
        slowQueries: recentDbQueries.filter(q => q.duration > 1000).length,
        errors: recentDbQueries.filter(q => q.error).length
      },
      cache: {
        operations: recentCacheOps.length,
        hitRate: this.calculateCacheHitRate(recentCacheOps),
        avgOperationTime: this.calculateAverage(recentCacheOps, 'duration')
      },
      system: {
        avgCpuUsage: this.calculateAverage(recentSystemMetrics, 'cpu.usage'),
        avgMemoryUsage: this.calculateAverage(recentSystemMetrics, 'memory.percent'),
        avgEventLoopLag: this.calculateAverage(recentSystemMetrics, 'eventLoop.lag'),
        peakConnections: Math.max(...recentSystemMetrics.map(s => s.connections), 0)
      },
      errors: {
        total: recentErrors.length,
        byType: this.groupBy(recentErrors, 'name'),
        topErrors: this.getTopErrors(recentErrors)
      }
    };
  }

  // Alert System
  checkAlerts(systemMetric) {
    const alerts = [];

    // CPU Usage Alert
    if (systemMetric.cpu.usage > this.config.alertThresholds.cpuUsage) {
      alerts.push({
        type: 'cpu_high',
        severity: 'warning',
        message: `High CPU usage: ${systemMetric.cpu.usage.toFixed(2)}%`,
        value: systemMetric.cpu.usage,
        threshold: this.config.alertThresholds.cpuUsage
      });
    }

    // Memory Usage Alert
    if (systemMetric.memory.percent > this.config.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'memory_high',
        severity: 'warning',
        message: `High memory usage: ${systemMetric.memory.percent.toFixed(2)}%`,
        value: systemMetric.memory.percent,
        threshold: this.config.alertThresholds.memoryUsage
      });
    }

    // Event Loop Lag Alert
    if (systemMetric.eventLoop.lag > 100) { // 100ms lag
      alerts.push({
        type: 'event_loop_lag',
        severity: 'warning',
        message: `High event loop lag: ${systemMetric.eventLoop.lag.toFixed(2)}ms`,
        value: systemMetric.eventLoop.lag,
        threshold: 100
      });
    }

    // Error Rate Alert
    const recentRequests = this.metrics.requests.slice(-100); // Last 100 requests
    const recentErrors = recentRequests.filter(r => r.error || r.statusCode >= 400);
    const errorRate = recentRequests.length > 0 ? (recentErrors.length / recentRequests.length) * 100 : 0;

    if (errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        type: 'error_rate_high',
        severity: 'critical',
        message: `High error rate: ${errorRate.toFixed(2)}%`,
        value: errorRate,
        threshold: this.config.alertThresholds.errorRate
      });
    }

    // Emit alerts
    alerts.forEach(alert => {
      this.emitAlert(alert);
    });
  }

  emitAlert(alert) {
    console.warn(`🚨 Performance Alert [${alert.severity.toUpperCase()}]: ${alert.message}`);
    
    // In production, you might want to:
    // - Send to monitoring service (DataDog, New Relic, etc.)
    // - Send notifications via email/Slack
    // - Store in database for historical analysis
    
    if (this.alertCallback) {
      this.alertCallback(alert);
    }
  }

  // Utility Methods
  calculateAverage(array, path) {
    if (array.length === 0) return 0;
    
    const values = array.map(item => this.getNestedValue(item, path)).filter(v => typeof v === 'number');
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  calculatePercentile(array, path, percentile) {
    if (array.length === 0) return 0;
    
    const values = array.map(item => this.getNestedValue(item, path))
      .filter(v => typeof v === 'number')
      .sort((a, b) => a - b);
    
    if (values.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[index] || 0;
  }

  calculateCacheHitRate(cacheOps) {
    if (cacheOps.length === 0) return 0;
    
    const getOps = cacheOps.filter(op => op.operation === 'get');
    const hits = getOps.filter(op => op.hit);
    
    return getOps.length > 0 ? (hits.length / getOps.length) * 100 : 0;
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = this.getNestedValue(item, key);
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  getTopErrors(errors, limit = 5) {
    const errorCounts = this.groupBy(errors, 'message');
    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([message, count]) => ({ message, count }));
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  // Cleanup
  startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, this.config.collectInterval * 2); // Cleanup every 2 collection intervals
  }

  cleanup() {
    const cutoff = Date.now() - this.config.retentionPeriod;
    
    this.metrics.system = this.metrics.system.filter(m => m.timestamp > cutoff);
    this.metrics.requests = this.metrics.requests.filter(m => m.timestamp > cutoff);
    this.metrics.database = this.metrics.database.filter(m => m.timestamp > cutoff);
    this.metrics.cache = this.metrics.cache.filter(m => m.timestamp > cutoff);
    this.metrics.errors = this.metrics.errors.filter(m => m.timestamp > cutoff);
  }

  // Export/Import for external monitoring
  exportMetrics(format = 'json') {
    switch (format) {
      case 'prometheus':
        return this.exportPrometheusMetrics();
      case 'json':
      default:
        return {
          timestamp: Date.now(),
          summary: this.getMetricsSummary(),
          raw: this.metrics
        };
    }
  }

  exportPrometheusMetrics() {
    const summary = this.getMetricsSummary();
    
    return `
# HELP fixzit_requests_total Total number of requests
# TYPE fixzit_requests_total counter
fixzit_requests_total ${summary.requests.total}

# HELP fixzit_request_duration_ms Request duration in milliseconds
# TYPE fixzit_request_duration_ms histogram
fixzit_request_duration_ms_avg ${summary.requests.avgResponseTime}
fixzit_request_duration_ms_p95 ${summary.requests.p95ResponseTime}
fixzit_request_duration_ms_p99 ${summary.requests.p99ResponseTime}

# HELP fixzit_error_rate Error rate percentage
# TYPE fixzit_error_rate gauge
fixzit_error_rate ${summary.requests.errorRate}

# HELP fixzit_cpu_usage CPU usage percentage
# TYPE fixzit_cpu_usage gauge
fixzit_cpu_usage ${summary.system.avgCpuUsage}

# HELP fixzit_memory_usage Memory usage percentage
# TYPE fixzit_memory_usage gauge
fixzit_memory_usage ${summary.system.avgMemoryUsage}

# HELP fixzit_cache_hit_rate Cache hit rate percentage
# TYPE fixzit_cache_hit_rate gauge
fixzit_cache_hit_rate ${summary.cache.hitRate}
    `.trim();
  }

  // Health Check
  getHealthStatus() {
    const summary = this.getMetricsSummary(300000); // Last 5 minutes
    
    return {
      status: this.determineHealthStatus(summary),
      summary,
      alerts: this.getActiveAlerts(),
      uptime: process.uptime(),
      timestamp: new Date()
    };
  }

  determineHealthStatus(summary) {
    if (summary.requests.errorRate > 10) return 'unhealthy';
    if (summary.system.avgCpuUsage > 90) return 'unhealthy';
    if (summary.system.avgMemoryUsage > 90) return 'unhealthy';
    if (summary.requests.avgResponseTime > 5000) return 'degraded';
    if (summary.system.avgCpuUsage > 70) return 'degraded';
    if (summary.system.avgMemoryUsage > 70) return 'degraded';
    
    return 'healthy';
  }

  getActiveAlerts() {
    // In a real implementation, you'd maintain an active alerts list
    return [];
  }

  // Middleware for Express
  createMiddleware() {
    return (req, res, next) => {
      const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const metadata = {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      };

      this.startRequestTimer(requestId, metadata);

      const originalSend = res.send;
      res.send = function(body) {
        const monitor = req.performanceMonitor || this;
        monitor.endRequestTimer(requestId, res.statusCode);
        return originalSend.call(this, body);
      }.bind(this);

      req.performanceMonitor = this;
      next();
    };
  }

  // Set alert callback
  onAlert(callback) {
    this.alertCallback = callback;
  }
}

module.exports = PerformanceMonitor;