const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import', 'approve', 'reject', 'assign', 'complete', 'cancel'],
    required: true
  },
  category: {
    type: String,
    enum: ['auth', 'user', 'property', 'workorder', 'finance', 'compliance', 'system', 'data', 'configuration'],
    required: true
  },
  entityType: { type: String, required: true }, // Model name
  entityId: { type: mongoose.Schema.Types.ObjectId },
  entityName: String, // Human-readable identifier
  user: {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    email: String,
    role: String,
    ipAddress: String,
    userAgent: String
  },
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  metadata: {
    requestId: String,
    sessionId: String,
    apiEndpoint: String,
    httpMethod: String,
    responseStatus: Number,
    duration: Number, // in milliseconds
    errorMessage: String,
    stackTrace: String
  },
  result: {
    type: String,
    enum: ['success', 'failure', 'partial'],
    default: 'success'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  tags: [String],
  timestamp: { type: Date, default: Date.now },
  expiresAt: Date // For automatic cleanup of old logs
});

// Indexes for efficient querying
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ 'user.userId': 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static methods for common audit operations
auditLogSchema.statics.logAction = async function(data) {
  const log = new this(data);
  
  // Set severity based on action and result
  if (!data.severity) {
    if (data.result === 'failure') {
      log.severity = data.action === 'login' ? 'high' : 'medium';
    } else if (['delete', 'export', 'configuration'].includes(data.category)) {
      log.severity = 'high';
    } else if (['create', 'update', 'approve', 'reject'].includes(data.action)) {
      log.severity = 'medium';
    }
  }
  
  // Set expiration for non-critical logs (keep for 1 year)
  if (log.severity !== 'critical' && log.severity !== 'high') {
    log.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  }
  
  return log.save();
};

// Get audit trail for an entity
auditLogSchema.statics.getEntityHistory = function(entityType, entityId, options = {}) {
  const query = this.find({ entityType, entityId });
  
  if (options.actions) {
    query.where('action').in(options.actions);
  }
  
  if (options.startDate) {
    query.where('timestamp').gte(options.startDate);
  }
  
  if (options.endDate) {
    query.where('timestamp').lte(options.endDate);
  }
  
  return query
    .sort({ timestamp: -1 })
    .limit(options.limit || 100)
    .select('-metadata.stackTrace'); // Don't expose stack traces
};

// Get user activity
auditLogSchema.statics.getUserActivity = function(userId, options = {}) {
  const query = this.find({ 'user.userId': userId });
  
  if (options.categories) {
    query.where('category').in(options.categories);
  }
  
  if (options.startDate) {
    query.where('timestamp').gte(options.startDate);
  }
  
  return query
    .sort({ timestamp: -1 })
    .limit(options.limit || 100)
    .select('-metadata.stackTrace');
};

// Compliance report
auditLogSchema.statics.generateComplianceReport = async function(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        category: { $in: ['auth', 'finance', 'compliance', 'data'] }
      }
    },
    {
      $group: {
        _id: {
          category: '$category',
          action: '$action',
          result: '$result'
        },
        count: { $sum: 1 },
        users: { $addToSet: '$user.userId' }
      }
    },
    {
      $group: {
        _id: '$_id.category',
        actions: {
          $push: {
            action: '$_id.action',
            result: '$_id.result',
            count: '$count',
            uniqueUsers: { $size: '$users' }
          }
        },
        totalActions: { $sum: '$count' }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);