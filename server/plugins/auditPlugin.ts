import { Schema} from 'mongoose';

// Interface for audit information
export interface AuditInfo {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
  changeReason?: string;
}

// Global context for audit information
let currentAuditContext: AuditInfo = {};

// Function to set audit context
export function setAuditContext(context: AuditInfo) {
  currentAuditContext = { ...(context as any) };
}

// Function to get current audit context
export function getAuditContext(): AuditInfo {
  return currentAuditContext;
}

// Function to clear audit context
export function clearAuditContext() {
  currentAuditContext = {};
}

// Plugin options interface
export interface AuditPluginOptions {
  excludeFields?: string[];
  enableChangeHistory?: boolean;
  maxHistoryVersions?: number;
}

// Plugin function
export function auditPlugin(schema: Schema, options: AuditPluginOptions = {}) {
  const {
    excludeFields = ['__v', 'updatedAt', 'createdAt'],
    enableChangeHistory = true,
    maxHistoryVersions = 50
  } = options;

  // Add audit fields to schema
  schema.add({
    createdBy: { 
      type: String, 
      required: true 
    },
    updatedBy: { 
      type: String 
    },
    version: { 
      type: Number, 
      default: 1 
    }
  });

  // Add change history if enabled
  if (enableChangeHistory) {
    schema.add({
      changeHistory: [{
        version: Number,
        changedBy: String,
        changedAt: { type: Date, default: Date.now },
        changes: [{
          field: String,
          oldValue: Schema.Types.Mixed,
          newValue: Schema.Types.Mixed
        }],
        changeReason: String,
        ipAddress: String,
        userAgent: String
      }]
    });

    // Index for change history queries
    schema.index({ 'changeHistory.changedAt': -1 });
    schema.index({ 'changeHistory.changedBy': 1 });
  }

  // Pre-save middleware for audit fields and change tracking
  schema.pre('save', function(next) {
    const context = getAuditContext();
    const now = new Date();

    // Set createdBy for new documents
    if (this.isNew) {
      if (context.userId) {
        this.createdBy = context.userId;
      } else if (!this.createdBy) {
        // If no context and no createdBy set, use system
        this.createdBy = 'SYSTEM';
      }
      this.version = 1;
    } else {
      // Set updatedBy for existing documents
      if (context.userId) {
        this.updatedBy = context.userId;
      }
      
      // Increment version
      this.version = ((this.version as number) || 0) + 1;

      // Track changes if enabled
      if (enableChangeHistory && this.isModified()) {
        this.changeHistory = this.changeHistory || [];
        
        const changes: Array<{field: string, oldValue: any, newValue: any}> = [];
        
        // Get modified paths
        const modifiedPaths = this.modifiedPaths();
        
        for (const path of modifiedPaths) {
          // Skip excluded fields and audit fields
          if (excludeFields.includes(path) || 
              ['createdBy', 'updatedBy', 'version', 'changeHistory'].includes(path)) {
            continue;
          }

          const oldValue = this.isNew ? undefined : (this.$__ as any)?.originalDoc?.[path];
          const newValue = this.get(path);
          
          // Only track if value actually changed
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes.push({
              field: path,
              oldValue,
              newValue
            });
          }
        }

        // Add change record if there are actual changes
        if (changes.length > 0) {
          const changeRecord = {
            version: this.version,
            changedBy: context.userId || this.updatedBy || 'SYSTEM',
            changedAt: now,
            changes,
            changeReason: context.changeReason || undefined,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          };

          if (!this.changeHistory) {
            this.changeHistory = [];
          }
          (this.changeHistory as any[]).push(changeRecord);

          // Limit history size
          if ((this.changeHistory as any[]).length > maxHistoryVersions) {
            this.changeHistory = (this.changeHistory as any[]).slice(-maxHistoryVersions);
          }
        }
      }
    }

    next();
  });

  // Pre-update middleware for audit fields
  schema.pre(/^update/, function() {
    const context = getAuditContext();
    
    if (context.userId) {
      this.set({ updatedBy: context.userId });
    }
    
    // Increment version
    this.set({ $inc: { version: 1 } });
  });

  // Pre-findOneAndUpdate middleware
  schema.pre('findOneAndUpdate', function() {
    const context = getAuditContext();
    
    if (context.userId) {
      this.set({ updatedBy: context.userId });
    }
    
    // Increment version
    this.set({ $inc: { version: 1 } });
  });

  // Instance method to get change history for a specific field
  schema.methods.getFieldHistory = function(fieldName: string) {
    if (!this.changeHistory) return [];
    
    return this.changeHistory
      .filter((change: any) => 
        change.changes.some((c: any) => c.field === fieldName)
      )
      .map((change: any) => ({
        version: change.version,
        changedBy: change.changedBy,
        changedAt: change.changedAt,
        change: change.changes.find((c: any) => c.field === fieldName),
        changeReason: change.changeReason
      }))
      .sort((a: any, b: any) => b.version - a.version);
  };

  // Instance method to get changes made by a specific user
  schema.methods.getChangesByUser = function(userId: string) {
    if (!this.changeHistory) return [];
    
    return this.changeHistory
      .filter((change: any) => change.changedBy === userId)
      .sort((a: any, b: any) => b.version - a.version);
  };

  // Instance method to get version at specific point in time
  schema.methods.getVersionAtDate = function(date: Date) {
    if (!this.changeHistory) return null;
    
    const changes = this.changeHistory
      .filter((change: any) => new Date(change.changedAt) <= date)
      .sort((a: any, b: any) => b.version - a.version);
    
    return changes.length > 0 ? changes[0] : null;
  };

  // Static method to find documents modified by user
  schema.statics.findByModifier = function(userId: string) {
    return this.find({
      $or: [
        { createdBy: userId },
        { updatedBy: userId },
        { 'changeHistory.changedBy': userId }
      ]
    });
  };

  // Static method to find documents modified in date range
  schema.statics.findByDateRange = function(startDate: Date, endDate: Date) {
    return this.find({
      $or: [
        { createdAt: { $gte: startDate, $lte: endDate } },
        { updatedAt: { $gte: startDate, $lte: endDate } },
        { 'changeHistory.changedAt': { $gte: startDate, $lte: endDate } }
      ]
    });
  };

  // Add indexes for audit queries
  schema.index({ createdBy: 1 });
  schema.index({ updatedBy: 1 });
  schema.index({ version: 1 });
  schema.index({ createdAt: -1 });
  schema.index({ updatedAt: -1 });
}

// Utility function to execute operations with audit context
export async function withAuditContext<T>(
  auditInfo: AuditInfo,
  operation: () => Promise<T>
): Promise<T> {
  const originalContext = getAuditContext();
  
  try {
    setAuditContext({ ...originalContext, ...auditInfo });
    return await operation();
  } finally {
    setAuditContext(originalContext);
  }
}

// Utility function to create audit context from request
export function createAuditContextFromRequest(req: any, userId?: string): AuditInfo {
  return {
    userId: userId || req.user?.id || req.user?._id?.toString(),
    userEmail: req.user?.email,
    ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0],
    userAgent: req.headers['user-agent'],
    timestamp: new Date()
  };
}