import { Schema, Model, models, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { UserRole, UserStatus } from "@/types/user";
import { encryptField, decryptField, isEncrypted } from "@/lib/security/encryption";
import { logger } from "@/lib/logger";

// Re-export for backward compatibility
export { UserRole };

const UserSchema = new Schema(
  {
    // Multi-tenancy key - will be added by tenantIsolationPlugin
    // orgId: { type: String, required: true, index: true },

    // Basic Information
    code: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true }, // Hashed password
    phone: String,
    mobile: String,
    emailVerifiedAt: { type: Date },
    employeeId: String, // Top-level for unique compound index {orgId, employeeId}

    // Personal Information
    personal: {
      firstName: String,
      lastName: String,
      middleName: String,
      nationalId: String, // National ID number
      passport: String,
      dateOfBirth: Date,
      gender: String,
      nationality: String,
      maritalStatus: String,
      address: {
        street: String,
        city: String,
        region: String,
        postalCode: String,
        country: { type: String, default: "SA" },
      },
    },

    // Professional Information
    professional: {
      role: { type: String, enum: UserRole, required: true },
      subRole: { 
        type: String, 
        enum: ["FINANCE_OFFICER", "HR_OFFICER", "SUPPORT_AGENT", "OPERATIONS_MANAGER"],
        description: "STRICT v4.1 Team Member specialization (Finance/HR/Support/Operations)",
      },
      title: String,
      department: String,
      manager: String, // user ID of manager
      reportsTo: String, // user ID of supervisor
      skills: [
        {
          category: String, // ELECTRICAL, PLUMBING, HVAC, etc.
          skill: String, // Wiring, Installation, Repair, etc.
          level: {
            type: String,
            enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"],
          },
          certified: Boolean,
          certification: String,
          expiry: Date,
          experience: Number, // years
        },
      ],
      certifications: [
        {
          name: String,
          issuer: String,
          issued: Date,
          expires: Date,
          status: String, // VALID, EXPIRED, PENDING
        },
      ],
      licenses: [
        {
          type: String, // Driver's License, Trade License, etc.
          number: String,
          issued: Date,
          expires: Date,
          status: String,
        },
      ],
      // STRICT v4.1: Assigned properties for Property Managers (data scope)
      assignedProperties: [{ type: Schema.Types.ObjectId, ref: "Property" }],
    },

    // Workload & Capacity
    workload: {
      maxAssignments: Number,
      currentAssignments: Number,
      available: Boolean,
      location: {
        city: String,
        region: String,
        radius: Number, // km service area
      },
      workingHours: {
        start: String, // HH:MM
        end: String, // HH:MM
        days: [String], // ["monday", "tuesday", etc.]
        timezone: { type: String, default: "Asia/Riyadh" },
      },
      availability: [
        {
          date: Date,
          start: String,
          end: String,
          status: String, // AVAILABLE, BUSY, OFF
        },
      ],
    },

    // Performance Metrics
    performance: {
      rating: { type: Number, min: 0, max: 5 },
      completedJobs: Number,
      ongoingJobs: Number,
      successRate: Number, // percentage
      averageResponseTime: Number, // hours
      averageResolutionTime: Number, // hours
      customerSatisfaction: Number, // percentage
      reviews: [
        {
          workOrderId: String,
          rating: Number,
          comment: String,
          date: Date,
          reviewer: String,
        },
      ],
    },

    // Security & Access
    security: {
      accessLevel: { type: String, enum: ["READ", "WRITE", "ADMIN"] },
      permissions: [String], // Specific permissions (deprecated - use RBAC roles)
      lastLogin: Date,
      loginAttempts: Number,
      locked: Boolean,
      lockReason: String,
      passwordChanged: Date,
      mfa: {
        enabled: Boolean,
        type: String, // SMS, APP, EMAIL
        secret: String,
      },
    },

    // RBAC - Role-Based Access Control
    roles: [{ type: Schema.Types.ObjectId, ref: "Role", index: true }],
    isSuperAdmin: { type: Boolean, default: false, index: true }, // Fast check for super admin access

    // Preferences
    preferences: {
      notifications: {
        email: Boolean,
        sms: Boolean,
        app: Boolean,
        workOrders: Boolean,
        maintenance: Boolean,
        reports: Boolean,
      },
      language: { type: String, default: "ar" },
      timezone: { type: String, default: "Asia/Riyadh" },
      theme: {
        type: String,
        enum: ["LIGHT", "DARK", "AUTO", "SYSTEM"],
        default: "SYSTEM",
      },
    },

    // Employment
    employment: {
      employeeId: String,
      hireDate: Date,
      terminationDate: Date,
      salary: Number,
      benefits: [String],
      emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
      },
    },

    // Compliance
    compliance: {
      backgroundCheck: Boolean,
      drugTest: Boolean,
      training: [
        {
          course: String,
          completed: Date,
          expires: Date,
          status: String, // VALID, EXPIRED, PENDING
        },
      ],
      safetyRecord: {
        incidents: Number,
        violations: Number,
        lastIncident: Date,
      },
    },

    // Status & Workflow
    status: { type: String, enum: UserStatus, default: "ACTIVE" },
    // workflow fields removed - auditPlugin provides createdBy/updatedBy

    // Metadata
    tags: [String],
    customFields: Schema.Types.Mixed,

    // createdAt/updatedAt handled by timestamps:true
  },
  {
    timestamps: true,
  },
);

// Apply plugins
UserSchema.plugin(tenantIsolationPlugin, {
  // Enforce tenant-scoped uniqueness before indexes are ready
  uniqueTenantFields: ["email", "username", "code", "employeeId"],
});
UserSchema.plugin(auditPlugin);

// Indexes for performance (orgId is already indexed by tenantIsolationPlugin)
// CRITICAL FIX: Tenant-scoped unique indexes
UserSchema.index({ orgId: 1, email: 1 }, { unique: true });
UserSchema.index({ orgId: 1, username: 1 }, { unique: true });
UserSchema.index({ orgId: 1, code: 1 }, { unique: true });

// FIXED: Tenant-scoped query indexes
UserSchema.index({ orgId: 1, "professional.role": 1 });
UserSchema.index({ orgId: 1, "professional.subRole": 1 }); // STRICT v4.1: Sub-role index
UserSchema.index({ orgId: 1, "professional.skills.category": 1 });
UserSchema.index({ orgId: 1, "workload.available": 1 });
UserSchema.index({ orgId: 1, "performance.rating": -1 });
UserSchema.index({ orgId: 1, isSuperAdmin: 1 }); // RBAC index

// =============================================================================
// PII ENCRYPTION MIDDLEWARE (GDPR Article 32 - Security of Processing)
// =============================================================================

/**
 * Sensitive PII fields requiring encryption at rest
 * 
 * COMPLIANCE:
 * - GDPR Article 32: Security of processing (encryption)
 * - HIPAA: PHI encryption requirements
 * - ISO 27001: Cryptographic controls (A.10.1.1)
 */
const ENCRYPTED_FIELDS = {
  // Personal identification
  'personal.nationalId': 'National ID',
  'personal.passport': 'Passport Number',
  
  // Financial data
  'employment.salary': 'Salary',
  
  // Security credentials
  'security.mfa.secret': 'MFA Secret',
} as const;

/**
 * Pre-save hook: Encrypt sensitive PII fields before storing
 */
UserSchema.pre('save', async function(next) {
  // eslint-disable-next-line @typescript-eslint/no-this-alias -- Required for Mongoose hook traversal
  const doc = this;
  try {
    // Only encrypt if fields are modified and not already encrypted
    for (const [path, fieldName] of Object.entries(ENCRYPTED_FIELDS)) {
      const parts = path.split('.');
      let current: any = doc;
      
      // Navigate to parent object
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      const field = parts[parts.length - 1];
      const value = current[field];
      
      // Encrypt if value exists and is not already encrypted
      if (value && !isEncrypted(value)) {
        current[field] = encryptField(value, path);
        
        logger.info('user:pii_encrypted', {
          action: 'pre_save_encrypt',
          fieldPath: path,
          fieldName,
          userId: doc._id?.toString(),
          orgId: (doc as any).orgId,
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('user:encryption_failed', {
      action: 'pre_save_encrypt',
      error: error instanceof Error ? error.message : String(error),
      userId: doc._id?.toString(),
    });
    next(error as Error);
  }
});

/**
 * Post-find hooks: Decrypt sensitive PII fields after retrieval
 * Applied to: find, findOne, findById, findOneAndUpdate
 */
function decryptPIIFields(doc: any) {
  if (!doc) return;
  
  try {
    for (const [path, fieldName] of Object.entries(ENCRYPTED_FIELDS)) {
      const parts = path.split('.');
      let current: any = doc;
      
      // Navigate to parent object
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          break;
        }
        current = current[parts[i]];
      }
      
      const field = parts[parts.length - 1];
      const value = current?.[field];
      
      // Decrypt if value is encrypted
      if (value && isEncrypted(value)) {
        current[field] = decryptField(value, path);
      }
    }
  } catch (error) {
    logger.error('user:decryption_failed', {
      action: 'post_find_decrypt',
      error: error instanceof Error ? error.message : String(error),
      userId: doc._id?.toString(),
    });
    // Don't throw - return encrypted value rather than breaking app
  }
}

// Apply decryption to various find operations
UserSchema.post('find', function(docs: any[]) {
  if (Array.isArray(docs)) {
    docs.forEach(decryptPIIFields);
  }
});

UserSchema.post('findOne', function(doc: any) {
  decryptPIIFields(doc);
});

UserSchema.post('findOneAndUpdate', function(doc: any) {
  decryptPIIFields(doc);
});

// =============================================================================
// SEC-001 FIX: Pre-findOneAndUpdate hook to encrypt PII fields during updates
// CRITICAL: Without this, User.findOneAndUpdate() bypasses PII encryption
// =============================================================================
UserSchema.pre('findOneAndUpdate', function(next) {
  try {
    const update = this.getUpdate() as Record<string, any>;
    if (!update) return next();
    
    // Handle both $set operations and direct field updates
    const updateData = update.$set ?? update;
    
    for (const [path, fieldName] of Object.entries(ENCRYPTED_FIELDS)) {
      // Check if this field is being updated
      const value = updateData[path];
      
      if (value !== undefined && value !== null && !isEncrypted(String(value))) {
        // Encrypt the field
        if (update.$set) {
          update.$set[path] = encryptField(String(value), path);
        } else {
          update[path] = encryptField(String(value), path);
        }
        
        logger.info('user:pii_encrypted', {
          action: 'pre_findOneAndUpdate_encrypt',
          fieldPath: path,
          fieldName,
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('user:encryption_failed', {
      action: 'pre_findOneAndUpdate_encrypt',
      error: error instanceof Error ? error.message : String(error),
    });
    next(error as Error);
  }
});

/**
 * SEC-001 FIX: Pre-updateOne/updateMany hooks to encrypt PII fields
 * Handles bulk update operations that bypass pre-save hooks
 */
UserSchema.pre('updateOne', function(next) {
  try {
    const update = this.getUpdate() as Record<string, any>;
    if (!update) return next();
    
    const updateData = update.$set ?? update;
    
    for (const [path, fieldName] of Object.entries(ENCRYPTED_FIELDS)) {
      const value = updateData[path];
      
      if (value !== undefined && value !== null && !isEncrypted(String(value))) {
        if (update.$set) {
          update.$set[path] = encryptField(String(value), path);
        } else {
          update[path] = encryptField(String(value), path);
        }
        
        logger.info('user:pii_encrypted', {
          action: 'pre_updateOne_encrypt',
          fieldPath: path,
          fieldName,
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('user:encryption_failed', {
      action: 'pre_updateOne_encrypt',
      error: error instanceof Error ? error.message : String(error),
    });
    next(error as Error);
  }
});

UserSchema.pre('updateMany', function(next) {
  try {
    const update = this.getUpdate() as Record<string, any>;
    if (!update) return next();
    
    const updateData = update.$set ?? update;
    
    for (const [path, fieldName] of Object.entries(ENCRYPTED_FIELDS)) {
      const value = updateData[path];
      
      if (value !== undefined && value !== null && !isEncrypted(String(value))) {
        if (update.$set) {
          update.$set[path] = encryptField(String(value), path);
        } else {
          update[path] = encryptField(String(value), path);
        }
        
        logger.info('user:pii_encrypted', {
          action: 'pre_updateMany_encrypt',
          fieldPath: path,
          fieldName,
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('user:encryption_failed', {
      action: 'pre_updateMany_encrypt',
      error: error instanceof Error ? error.message : String(error),
    });
    next(error as Error);
  }
});

// Note: findById uses findOne internally, so it's covered by the findOne hook

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const User: Model<UserDoc> = getModel<UserDoc>("User", UserSchema);
