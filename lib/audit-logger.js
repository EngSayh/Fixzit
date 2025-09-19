const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class AuditLogger {
  constructor(options = {}) {
    this.config = {
      storage: options.storage || 'database', // 'database', 'file', 'both'
      filePath: options.filePath || './logs/audit',
      encryptLogs: options.encryptLogs || false,
      encryptionKey: options.encryptionKey || process.env.AUDIT_ENCRYPTION_KEY,
      retention: {
        days: options.retentionDays || 2555, // 7 years default for compliance
        maxSize: options.maxLogSize || 100 * 1024 * 1024, // 100MB per file
      },
      compliance: {
        standard: options.complianceStandard || 'ISO27001', // ISO27001, SOX, GDPR, etc.
        requireDigitalSignature: options.requireDigitalSignature || false,
        tamperDetection: options.tamperDetection || true,
      },
      ...options
    };

    this.buffer = [];
    this.bufferSize = 100; // Batch writes for performance
    this.isWriting = false;
    this.sequenceNumber = 0;
    this.sessionId = this.generateSessionId();

    this.initialize();
  }

  async initialize() {
    // Ensure log directory exists
    if (this.config.storage === 'file' || this.config.storage === 'both') {
      await fs.mkdir(this.config.filePath, { recursive: true });
    }

    // Start periodic flush
    setInterval(() => {
      this.flush();
    }, 5000); // Flush every 5 seconds

    console.log('✅ Audit Logger initialized');
  }

  // Main logging method
  async log(event) {
    const auditEntry = this.createAuditEntry(event);
    
    // Add to buffer
    this.buffer.push(auditEntry);
    
    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }

    return auditEntry.id;
  }

  createAuditEntry(event) {
    const timestamp = new Date();
    const entry = {
      id: this.generateEntryId(),
      sessionId: this.sessionId,
      sequenceNumber: ++this.sequenceNumber,
      timestamp: timestamp.toISOString(),
      
      // Event details
      eventType: event.eventType,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId,
      
      // Actor information
      userId: event.userId,
      userName: event.userName,
      userRole: event.userRole,
      organizationId: event.organizationId,
      
      // Context
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      sessionToken: event.sessionToken ? this.hashSensitiveData(event.sessionToken) : null,
      
      // Change details
      oldValues: event.oldValues ? this.sanitizeValues(event.oldValues) : null,
      newValues: event.newValues ? this.sanitizeValues(event.newValues) : null,
      changedFields: event.changedFields || null,
      
      // Metadata
      metadata: event.metadata || {},
      tags: event.tags || [],
      severity: event.severity || 'info', // 'low', 'medium', 'high', 'critical'
      
      // Compliance
      complianceStandard: this.config.compliance.standard,
      retentionRequired: event.retentionRequired !== false,
      
      // Integrity
      checksum: null, // Will be calculated after serialization
      signature: null, // Will be added if digital signatures are enabled
    };

    // Calculate checksum for tamper detection
    if (this.config.compliance.tamperDetection) {
      entry.checksum = this.calculateChecksum(entry);
    }

    // Add digital signature if required
    if (this.config.compliance.requireDigitalSignature) {
      entry.signature = this.signEntry(entry);
    }

    return entry;
  }

  // Specialized logging methods
  async logUserAction(userId, action, details = {}) {
    return await this.log({
      eventType: 'user_action',
      action,
      userId,
      userName: details.userName,
      userRole: details.userRole,
      organizationId: details.organizationId,
      resource: details.resource,
      resourceId: details.resourceId,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      metadata: details.metadata,
      severity: details.severity || 'info'
    });
  }

  async logDataChange(userId, resource, resourceId, oldValues, newValues, details = {}) {
    const changedFields = this.getChangedFields(oldValues, newValues);
    
    return await this.log({
      eventType: 'data_change',
      action: 'update',
      userId,
      userName: details.userName,
      userRole: details.userRole,
      organizationId: details.organizationId,
      resource,
      resourceId,
      oldValues,
      newValues,
      changedFields,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      metadata: details.metadata,
      severity: 'medium'
    });
  }

  async logSecurityEvent(eventType, details = {}) {
    return await this.log({
      eventType: 'security_event',
      action: eventType,
      userId: details.userId,
      userName: details.userName,
      resource: details.resource,
      resourceId: details.resourceId,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      metadata: details.metadata,
      severity: details.severity || 'high',
      tags: ['security', ...(details.tags || [])]
    });
  }

  async logSystemEvent(eventType, details = {}) {
    return await this.log({
      eventType: 'system_event',
      action: eventType,
      resource: 'system',
      metadata: details.metadata,
      severity: details.severity || 'info',
      tags: ['system', ...(details.tags || [])]
    });
  }

  async logComplianceEvent(complianceType, details = {}) {
    return await this.log({
      eventType: 'compliance_event',
      action: complianceType,
      userId: details.userId,
      resource: details.resource,
      resourceId: details.resourceId,
      metadata: details.metadata,
      severity: 'high',
      tags: ['compliance', complianceType, ...(details.tags || [])],
      retentionRequired: true
    });
  }

  // Persistence
  async flush() {
    if (this.buffer.length === 0 || this.isWriting) {
      return;
    }

    this.isWriting = true;
    const entries = [...this.buffer];
    this.buffer = [];

    try {
      if (this.config.storage === 'database' || this.config.storage === 'both') {
        await this.writeToDatabase(entries);
      }

      if (this.config.storage === 'file' || this.config.storage === 'both') {
        await this.writeToFile(entries);
      }

      console.log(`📝 Flushed ${entries.length} audit entries`);
    } catch (error) {
      console.error('Failed to flush audit entries:', error);
      // Re-add entries to buffer for retry
      this.buffer.unshift(...entries);
    } finally {
      this.isWriting = false;
    }
  }

  async writeToDatabase(entries) {
    // Implement database writing based on your database system
    // This is a placeholder - implement according to your DB schema
    for (const entry of entries) {
      await this.db.auditLogs.create(entry);
    }
  }

  async writeToFile(entries) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `audit_${date}.jsonl`;
    const filepath = path.join(this.config.filePath, filename);

    const lines = entries.map(entry => {
      let line = JSON.stringify(entry);
      
      if (this.config.encryptLogs) {
        line = this.encryptLine(line);
      }
      
      return line;
    });

    await fs.appendFile(filepath, lines.join('\n') + '\n');
  }

  // Audit Trail Queries
  async getAuditTrail(filters = {}) {
    const {
      userId,
      resource,
      resourceId,
      eventType,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = filters;

    // Build query based on storage type
    if (this.config.storage === 'database' || this.config.storage === 'both') {
      return await this.queryDatabase(filters);
    } else {
      return await this.queryFiles(filters);
    }
  }

  async queryDatabase(filters) {
    // Implement database querying based on your database system
    const query = {};
    
    if (filters.userId) query.userId = filters.userId;
    if (filters.resource) query.resource = filters.resource;
    if (filters.resourceId) query.resourceId = filters.resourceId;
    if (filters.eventType) query.eventType = filters.eventType;
    
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }

    return await this.db.auditLogs.find(query)
      .sort({ timestamp: -1 })
      .limit(filters.limit)
      .skip(filters.offset);
  }

  async queryFiles(filters) {
    // Implement file-based querying
    const results = [];
    const files = await fs.readdir(this.config.filePath);
    
    for (const file of files.filter(f => f.startsWith('audit_'))) {
      const filepath = path.join(this.config.filePath, file);
      const content = await fs.readFile(filepath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          let entry;
          if (this.config.encryptLogs) {
            entry = JSON.parse(this.decryptLine(line));
          } else {
            entry = JSON.parse(line);
          }
          
          if (this.matchesFilters(entry, filters)) {
            results.push(entry);
          }
        } catch (error) {
          console.error('Error parsing audit entry:', error);
        }
      }
    }

    return results
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(filters.offset, filters.offset + filters.limit);
  }

  // Integrity and Security
  calculateChecksum(entry) {
    const data = { ...entry };
    delete data.checksum;
    delete data.signature;
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  signEntry(entry) {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key required for digital signatures');
    }

    const data = { ...entry };
    delete data.signature;
    
    const hmac = crypto.createHmac('sha256', this.config.encryptionKey);
    hmac.update(JSON.stringify(data));
    return hmac.digest('hex');
  }

  verifyEntry(entry) {
    // Verify checksum
    if (entry.checksum) {
      const calculatedChecksum = this.calculateChecksum(entry);
      if (calculatedChecksum !== entry.checksum) {
        return { valid: false, reason: 'Checksum mismatch - possible tampering' };
      }
    }

    // Verify signature
    if (entry.signature) {
      const calculatedSignature = this.signEntry(entry);
      if (calculatedSignature !== entry.signature) {
        return { valid: false, reason: 'Signature mismatch - possible tampering' };
      }
    }

    return { valid: true };
  }

  // Data sanitization
  sanitizeValues(values) {
    const sanitized = { ...values };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Hash sensitive data that might be needed for correlation
    const hashFields = ['email', 'phone'];
    for (const field of hashFields) {
      if (sanitized[field]) {
        sanitized[`${field}Hash`] = this.hashSensitiveData(sanitized[field]);
        delete sanitized[field];
      }
    }

    return sanitized;
  }

  hashSensitiveData(data) {
    return crypto
      .createHash('sha256')
      .update(data + (this.config.encryptionKey || 'default-salt'))
      .digest('hex')
      .substring(0, 16);
  }

  // Encryption
  encryptLine(line) {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key required for log encryption');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.config.encryptionKey);
    
    let encrypted = cipher.update(line, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  decryptLine(encryptedLine) {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key required for log decryption');
    }

    const [ivHex, encrypted] = encryptedLine.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher('aes-256-cbc', this.config.encryptionKey);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Compliance Reports
  async generateComplianceReport(options = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      eventTypes = [],
      format = 'json'
    } = options;

    const auditTrail = await this.getAuditTrail({
      startDate,
      endDate,
      eventType: eventTypes.length > 0 ? { $in: eventTypes } : undefined,
      limit: 10000
    });

    const report = {
      metadata: {
        generatedAt: new Date(),
        period: { startDate, endDate },
        totalEntries: auditTrail.length,
        complianceStandard: this.config.compliance.standard,
        reportId: this.generateReportId()
      },
      summary: {
        eventTypes: this.groupBy(auditTrail, 'eventType'),
        users: this.getUniqueValues(auditTrail, 'userId').length,
        resources: this.getUniqueValues(auditTrail, 'resource').length,
        securityEvents: auditTrail.filter(e => e.tags && e.tags.includes('security')).length,
        dataChanges: auditTrail.filter(e => e.eventType === 'data_change').length
      },
      entries: auditTrail,
      integrity: {
        verified: true,
        tamperDetected: false,
        verificationDetails: await this.verifyTrailIntegrity(auditTrail)
      }
    };

    // Format output
    switch (format) {
      case 'pdf':
        return await this.generatePDFReport(report);
      case 'excel':
        return await this.generateExcelReport(report);
      case 'csv':
        return await this.generateCSVReport(report);
      case 'json':
      default:
        return report;
    }
  }

  async verifyTrailIntegrity(entries) {
    const verificationResults = {
      totalEntries: entries.length,
      validEntries: 0,
      invalidEntries: 0,
      errors: []
    };

    for (const entry of entries) {
      const verification = this.verifyEntry(entry);
      if (verification.valid) {
        verificationResults.validEntries++;
      } else {
        verificationResults.invalidEntries++;
        verificationResults.errors.push({
          entryId: entry.id,
          reason: verification.reason,
          timestamp: entry.timestamp
        });
      }
    }

    return verificationResults;
  }

  // Data Retention and Cleanup
  async cleanupOldLogs() {
    const cutoffDate = new Date(Date.now() - this.config.retention.days * 24 * 60 * 60 * 1000);
    
    if (this.config.storage === 'database' || this.config.storage === 'both') {
      await this.cleanupDatabaseLogs(cutoffDate);
    }

    if (this.config.storage === 'file' || this.config.storage === 'both') {
      await this.cleanupLogFiles(cutoffDate);
    }
  }

  async cleanupDatabaseLogs(cutoffDate) {
    // Archive old logs before deletion for compliance
    const oldLogs = await this.db.auditLogs.find({
      timestamp: { $lt: cutoffDate.toISOString() }
    });

    if (oldLogs.length > 0) {
      // Archive to long-term storage
      await this.archiveLogs(oldLogs);
      
      // Delete from active database
      await this.db.auditLogs.deleteMany({
        timestamp: { $lt: cutoffDate.toISOString() }
      });
      
      console.log(`🗄️ Archived and cleaned up ${oldLogs.length} old audit entries`);
    }
  }

  async cleanupLogFiles(cutoffDate) {
    const files = await fs.readdir(this.config.filePath);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    
    for (const file of files) {
      if (file.startsWith('audit_') && file < `audit_${cutoffDateStr}.jsonl`) {
        const filepath = path.join(this.config.filePath, file);
        
        // Archive before deletion
        await this.archiveLogFile(filepath);
        
        // Delete old file
        await fs.unlink(filepath);
        console.log(`🗄️ Archived and deleted old log file: ${file}`);
      }
    }
  }

  async archiveLogs(logs) {
    // Implement long-term archival (S3 Glacier, tape backup, etc.)
    const archiveData = {
      archivedAt: new Date(),
      entryCount: logs.length,
      entries: logs
    };

    const archiveFile = `archive_${Date.now()}.json`;
    const archivePath = path.join(this.config.filePath, 'archive', archiveFile);
    
    await fs.mkdir(path.dirname(archivePath), { recursive: true });
    await fs.writeFile(archivePath, JSON.stringify(archiveData, null, 2));
  }

  async archiveLogFile(filepath) {
    const archiveDir = path.join(this.config.filePath, 'archive');
    await fs.mkdir(archiveDir, { recursive: true });
    
    const filename = path.basename(filepath);
    const archivePath = path.join(archiveDir, filename);
    
    await fs.copyFile(filepath, archivePath);
  }

  // Audit Trail Analysis
  async analyzeUserActivity(userId, timeRange = {}) {
    const filters = {
      userId,
      startDate: timeRange.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: timeRange.endDate || new Date(),
      limit: 1000
    };

    const activities = await this.getAuditTrail(filters);
    
    return {
      userId,
      totalActivities: activities.length,
      loginSessions: activities.filter(a => a.action === 'login').length,
      dataChanges: activities.filter(a => a.eventType === 'data_change').length,
      securityEvents: activities.filter(a => a.tags && a.tags.includes('security')).length,
      resourcesAccessed: this.getUniqueValues(activities, 'resource'),
      timeRange: filters,
      riskScore: this.calculateUserRiskScore(activities),
      patterns: this.analyzeActivityPatterns(activities)
    };
  }

  calculateUserRiskScore(activities) {
    let score = 0;
    
    // High frequency of actions
    if (activities.length > 100) score += 10;
    
    // Security events
    const securityEvents = activities.filter(a => a.tags && a.tags.includes('security'));
    score += securityEvents.length * 5;
    
    // Failed login attempts
    const failedLogins = activities.filter(a => a.action === 'login_failed');
    score += failedLogins.length * 3;
    
    // Access to sensitive resources
    const sensitiveAccess = activities.filter(a => 
      ['user_management', 'financial_data', 'system_settings'].includes(a.resource)
    );
    score += sensitiveAccess.length * 2;
    
    // Unusual time patterns
    const unusualTimes = activities.filter(a => {
      const hour = new Date(a.timestamp).getHours();
      return hour < 6 || hour > 22; // Outside normal business hours
    });
    score += unusualTimes.length;

    return Math.min(100, score); // Cap at 100
  }

  analyzeActivityPatterns(activities) {
    const patterns = {
      peakHours: this.findPeakActivityHours(activities),
      commonActions: this.getMostCommonActions(activities),
      resourceUsage: this.getResourceUsagePattern(activities),
      sessionPatterns: this.analyzeSessionPatterns(activities)
    };

    return patterns;
  }

  // Utility methods
  generateEntryId() {
    return `audit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  generateSessionId() {
    return `session_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  }

  generateReportId() {
    return `report_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  getChangedFields(oldValues, newValues) {
    if (!oldValues || !newValues) return [];
    
    const changed = [];
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
    
    for (const key of allKeys) {
      if (oldValues[key] !== newValues[key]) {
        changed.push(key);
      }
    }
    
    return changed;
  }

  matchesFilters(entry, filters) {
    if (filters.userId && entry.userId !== filters.userId) return false;
    if (filters.resource && entry.resource !== filters.resource) return false;
    if (filters.resourceId && entry.resourceId !== filters.resourceId) return false;
    if (filters.eventType && entry.eventType !== filters.eventType) return false;
    
    const entryDate = new Date(entry.timestamp);
    if (filters.startDate && entryDate < filters.startDate) return false;
    if (filters.endDate && entryDate > filters.endDate) return false;
    
    return true;
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = item[key];
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  getUniqueValues(array, key) {
    return [...new Set(array.map(item => item[key]).filter(Boolean))];
  }

  findPeakActivityHours(activities) {
    const hourCounts = {};
    activities.forEach(activity => {
      const hour = new Date(activity.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }));
  }

  getMostCommonActions(activities) {
    const actionCounts = this.groupBy(activities, 'action');
    return Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));
  }

  getResourceUsagePattern(activities) {
    return this.groupBy(activities, 'resource');
  }

  analyzeSessionPatterns(activities) {
    const sessions = this.groupBy(activities, 'sessionId');
    const sessionLengths = Object.keys(sessions).map(sessionId => {
      const sessionActivities = activities.filter(a => a.sessionId === sessionId);
      const start = new Date(Math.min(...sessionActivities.map(a => new Date(a.timestamp).getTime())));
      const end = new Date(Math.max(...sessionActivities.map(a => new Date(a.timestamp).getTime())));
      return (end.getTime() - start.getTime()) / (1000 * 60); // Minutes
    });

    return {
      totalSessions: Object.keys(sessions).length,
      avgSessionLength: sessionLengths.reduce((sum, len) => sum + len, 0) / sessionLengths.length,
      maxSessionLength: Math.max(...sessionLengths),
      minSessionLength: Math.min(...sessionLengths)
    };
  }

  // Express middleware
  createMiddleware() {
    return (req, res, next) => {
      req.auditLogger = this;
      
      // Log request start
      this.logUserAction(req.user?.id, 'api_request', {
        userName: req.user?.name,
        userRole: req.user?.role,
        organizationId: req.user?.organizationId,
        resource: req.path,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: {
          method: req.method,
          url: req.originalUrl,
          query: req.query,
          body: this.sanitizeRequestBody(req.body)
        }
      });

      next();
    };
  }

  sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'ssn'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

module.exports = AuditLogger;