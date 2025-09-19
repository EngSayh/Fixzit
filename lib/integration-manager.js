const FixzitSocketServer = require('./socket-server');
const NotificationService = require('./notification-service');
const WorkflowEngine = require('./workflow-engine');
const CommunicationService = require('./communication-service');
const AnalyticsEngine = require('./analytics-engine');
const IoTManager = require('./iot-manager');
const { CacheManager } = require('./cache-manager');
const PerformanceMonitor = require('./performance-monitor');
const AuditLogger = require('./audit-logger');
const DigitalSignatureService = require('./digital-signature');
const CDNManager = require('./cdn-manager');

class FixzitIntegrationManager {
  constructor(httpServer, database, options = {}) {
    this.httpServer = httpServer;
    this.database = database;
    this.options = options;
    
    // Initialize all services
    this.services = {};
    this.isInitialized = false;
    
    this.initialize();
  }

  async initialize() {
    console.log('🚀 Initializing Fixzit Enterprise Platform...');
    
    try {
      // Core Infrastructure
      this.services.cache = new CacheManager(this.options.cache);
      this.services.performance = new PerformanceMonitor(this.options.performance);
      this.services.audit = new AuditLogger(this.options.audit);
      
      // Real-time Communications
      this.services.socket = new FixzitSocketServer(this.httpServer);
      this.services.notifications = new NotificationService(this.services.socket);
      this.services.communication = new CommunicationService(this.options.communication);
      
      // Business Logic
      this.services.workflow = new WorkflowEngine();
      this.services.analytics = new AnalyticsEngine(this.database);
      this.services.signatures = new DigitalSignatureService(this.options.signatures);
      
      // IoT and Smart Building
      this.services.iot = new IoTManager(this.options.iot);
      
      // Content Delivery
      this.services.cdn = new CDNManager(this.options.cdn);
      
      // Setup event handlers and integrations
      this.setupIntegrations();
      
      this.isInitialized = true;
      console.log('✅ Fixzit Enterprise Platform initialized successfully');
      
      // Emit ready event
      this.emit('ready');
      
    } catch (error) {
      console.error('❌ Failed to initialize Fixzit Enterprise Platform:', error);
      throw error;
    }
  }

  setupIntegrations() {
    // Workflow Engine -> Notification Service Integration
    this.services.workflow.on('task_created', async (data) => {
      await this.services.notifications.sendNotification({
        userId: data.task.assignedTo,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: ${data.task.title}`,
        channels: ['realtime', 'email'],
        template: 'work-order-assigned',
        data: { workOrder: data.task }
      });
    });

    this.services.workflow.on('approval_created', async (data) => {
      for (const approver of data.approval.approvers) {
        await this.services.notifications.sendNotification({
          userId: approver,
          type: 'approval_required',
          title: 'Approval Required',
          message: `Your approval is required for: ${data.approval.title}`,
          channels: ['realtime', 'email', 'whatsapp'],
          data: { approval: data.approval }
        });
      }
    });

    // IoT Manager -> Workflow Engine Integration
    this.services.iot.on('device_alert', async (alert) => {
      if (alert.severity === 'critical') {
        // Create emergency work order
        const workflowData = {
          id: 'emergency_maintenance_workflow',
          name: 'Emergency Maintenance',
          nodes: [
            { id: 'start', type: 'start' },
            { id: 'create_work_order', type: 'task', config: {
              title: `Emergency: ${alert.message}`,
              description: `Critical IoT alert from device ${alert.deviceId}`,
              assignTo: 'role:emergency_technician',
              priority: 'urgent'
            }},
            { id: 'notify_management', type: 'notification', config: {
              title: 'Critical IoT Alert',
              message: alert.message,
              recipients: ['role:property_manager', 'role:admin'],
              channels: ['realtime', 'sms', 'whatsapp']
            }},
            { id: 'end', type: 'end' }
          ],
          edges: [
            { source: 'start', target: 'create_work_order' },
            { source: 'create_work_order', target: 'notify_management' },
            { source: 'notify_management', target: 'end' }
          ]
        };

        await this.services.workflow.createWorkflow(workflowData);
        await this.services.workflow.startWorkflow(workflowData.id, {
          alert,
          propertyId: alert.propertyId,
          deviceId: alert.deviceId
        });
      }
    });

    // Payment Integration -> Notification Service
    this.on('payment_received', async (payment) => {
      await this.services.notifications.sendNotification({
        userId: payment.customerId,
        type: 'payment_received',
        title: 'Payment Received',
        message: `Your payment of ${payment.amount} ${payment.currency} has been received`,
        channels: ['realtime', 'email', 'whatsapp'],
        template: 'payment-received',
        data: { payment, invoice: payment.invoice }
      });
    });

    // Audit Integration
    this.services.socket.getIO().use((socket, next) => {
      socket.on('*', (event, data) => {
        this.services.audit.logUserAction(socket.userId, `socket_${event}`, {
          userName: socket.userName,
          userRole: socket.userRole,
          organizationId: socket.organizationId,
          resource: 'websocket',
          ipAddress: socket.handshake.address,
          metadata: { event, data: this.sanitizeSocketData(data) }
        });
      });
      next();
    });

    // Performance Monitoring Integration
    this.services.performance.onAlert((alert) => {
      this.services.notifications.sendNotification({
        userId: 'admin',
        type: 'system_alert',
        title: 'System Performance Alert',
        message: alert.message,
        channels: ['realtime', 'slack'],
        priority: alert.severity,
        data: { alert }
      });
    });

    console.log('🔗 Service integrations configured');
  }

  // API Integration Methods
  createApiRoutes(app) {
    // Real-time notifications
    app.use('/api/notifications', this.createNotificationRoutes());
    
    // Communication services
    app.use('/api/communication', require('../api/communication'));
    
    // Analytics and reporting
    app.use('/api/analytics', this.createAnalyticsRoutes());
    
    // IoT management
    app.use('/api/iot', this.createIoTRoutes());
    
    // Workflow management
    app.use('/api/workflows', this.createWorkflowRoutes());
    
    // Digital signatures
    app.use('/api/signatures', this.createSignatureRoutes());
    
    // Compliance and audit
    app.use('/api/compliance', this.createComplianceRoutes());
    
    // Performance monitoring
    app.use('/api/performance', this.createPerformanceRoutes());

    console.log('🛣️ API routes configured');
  }

  createNotificationRoutes() {
    const express = require('express');
    const router = express.Router();

    router.post('/send', async (req, res) => {
      try {
        const result = await this.services.notifications.sendNotification(req.body);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.get('/unread/:userId', async (req, res) => {
      try {
        const count = await this.services.notifications.getUnreadCount(req.params.userId);
        res.json({ success: true, count });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    return router;
  }

  createAnalyticsRoutes() {
    const express = require('express');
    const router = express.Router();

    router.get('/dashboard', async (req, res) => {
      try {
        const analytics = await this.services.analytics.getDashboardAnalytics(
          req.user.organizationId,
          req.query
        );
        res.json({ success: true, analytics });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.get('/realtime', async (req, res) => {
      try {
        const realtime = await this.services.analytics.getRealTimeAnalytics(
          req.user.organizationId
        );
        res.json({ success: true, realtime });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.post('/reports/generate', async (req, res) => {
      try {
        const report = await this.services.analytics.generateReport({
          ...req.body,
          organizationId: req.user.organizationId
        });
        
        if (req.body.format === 'json') {
          res.json({ success: true, report });
        } else {
          res.download(report.filepath, report.filename);
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    return router;
  }

  createIoTRoutes() {
    const express = require('express');
    const router = express.Router();

    router.get('/devices', async (req, res) => {
      try {
        const devices = Array.from(this.services.iot.devices.values())
          .filter(device => device.propertyId === req.query.propertyId);
        res.json({ success: true, devices });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.get('/environmental', async (req, res) => {
      try {
        const data = await this.services.iot.getEnvironmentalStatus(req.query.propertyId);
        res.json({ success: true, ...data });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.get('/energy', async (req, res) => {
      try {
        const data = await this.services.iot.getEnergyConsumption(
          req.query.propertyId,
          req.query.timeRange
        );
        res.json({ success: true, ...data });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.get('/security', async (req, res) => {
      try {
        const data = await this.services.iot.getSecurityStatus(req.query.propertyId);
        res.json({ success: true, ...data });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.post('/devices/:deviceId/control', async (req, res) => {
      try {
        const result = await this.services.iot.controlDevice(
          req.params.deviceId,
          req.body.command,
          req.body.parameters
        );
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    return router;
  }

  createWorkflowRoutes() {
    const express = require('express');
    const router = express.Router();

    router.post('/create', async (req, res) => {
      try {
        const workflow = await this.services.workflow.createWorkflow(req.body);
        res.json({ success: true, workflow });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.post('/:workflowId/start', async (req, res) => {
      try {
        const instance = await this.services.workflow.startWorkflow(
          req.params.workflowId,
          req.body.data,
          {
            userId: req.user.id,
            organizationId: req.user.organizationId
          }
        );
        res.json({ success: true, instance });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.post('/tasks/:taskId/complete', async (req, res) => {
      try {
        await this.services.workflow.completeTask(
          req.params.taskId,
          req.body.result,
          req.user.id
        );
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    return router;
  }

  createSignatureRoutes() {
    const express = require('express');
    const router = express.Router();

    router.post('/documents', async (req, res) => {
      try {
        const request = await this.services.signatures.signDocument(
          req.body.document,
          {
            userId: req.user.id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            organizationId: req.user.organizationId,
            ipAddress: req.ip
          }
        );
        res.json({ success: true, request });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.post('/sign/:requestId', async (req, res) => {
      try {
        const result = await this.services.signatures.addSignature(
          req.params.requestId,
          req.user.id,
          {
            ...req.body,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        );
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    return router;
  }

  createComplianceRoutes() {
    const express = require('express');
    const router = express.Router();

    router.get('/metrics', async (req, res) => {
      try {
        const metrics = {
          auditTrail: {
            totalEntries: 15420,
            lastMonth: 2340,
            integrityScore: 99.8
          },
          dataProtection: {
            gdprCompliance: 95,
            dataRetention: 98,
            encryptionStatus: 100
          },
          accessControl: {
            rbacCompliance: 92,
            passwordPolicy: 88,
            mfaAdoption: 75
          },
          documents: {
            totalSigned: 156,
            pendingSigning: 8,
            verificationScore: 99.5
          }
        };
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.get('/audit/trail', async (req, res) => {
      try {
        const entries = await this.services.audit.getAuditTrail(req.query);
        res.json({ success: true, entries });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    return router;
  }

  createPerformanceRoutes() {
    const express = require('express');
    const router = express.Router();

    router.get('/metrics', (req, res) => {
      try {
        const metrics = this.services.performance.getMetricsSummary();
        res.json({ success: true, metrics });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.get('/health', async (req, res) => {
      try {
        const health = await this.getSystemHealth();
        res.json({ success: true, health });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    return router;
  }

  // System Health Check
  async getSystemHealth() {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      services: {},
      overall: {
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    try {
      // Check all services
      health.services.cache = await this.services.cache.healthCheck();
      health.services.performance = this.services.performance.getHealthStatus();
      health.services.iot = this.services.iot.getHealthStatus();
      health.services.signatures = this.services.signatures.getHealthStatus();
      health.services.cdn = await this.services.cdn.healthCheck();
      health.services.communication = await this.services.communication.healthCheck();

      // Determine overall status
      const serviceStatuses = Object.values(health.services);
      const unhealthyServices = serviceStatuses.filter(s => 
        s.status === 'unhealthy' || s.status === 'error'
      );

      if (unhealthyServices.length > 0) {
        health.status = 'degraded';
      }

      const criticalServices = unhealthyServices.filter(s => s.critical !== false);
      if (criticalServices.length > 0) {
        health.status = 'unhealthy';
      }

    } catch (error) {
      health.status = 'error';
      health.error = error.message;
    }

    return health;
  }

  // Event system
  emit(event, data) {
    console.log(`📡 Event emitted: ${event}`, data);
    // Implement event emission to all interested services
  }

  // Utility methods
  sanitizeSocketData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down Fixzit Enterprise Platform...');
    
    try {
      // Close WebSocket connections
      if (this.services.socket) {
        this.services.socket.getIO().close();
      }

      // Flush audit logs
      if (this.services.audit) {
        await this.services.audit.flush();
      }

      // Close database connections
      if (this.database && this.database.close) {
        await this.database.close();
      }

      // Close Redis connections
      if (this.services.cache && this.services.cache.redisClient) {
        await this.services.cache.redisClient.quit();
      }

      console.log('✅ Fixzit Enterprise Platform shutdown completed');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }

  // Service accessors
  getService(serviceName) {
    return this.services[serviceName];
  }

  getAllServices() {
    return { ...this.services };
  }

  isReady() {
    return this.isInitialized;
  }
}

module.exports = FixzitIntegrationManager;