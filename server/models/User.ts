import { Schema, Model, models, InferSchemaType } from "mongoose";
import { getModel } from '@/src/types/mongoose-compat';
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { UserRole, UserStatus } from "@/types/user";

// Re-export for backward compatibility
export { UserRole };

const UserSchema = new Schema({
  // Multi-tenancy key - will be added by tenantIsolationPlugin
  // orgId: { type: String, required: true, index: true },

  // Basic Information
  code: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true }, // Hashed password
  phone: String,
  mobile: String,
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
      country: { type: String, default: "SA" }
    }
  },

  // Professional Information
  professional: {
    role: { type: String, enum: UserRole, required: true },
    title: String,
    department: String,
    manager: String, // user ID of manager
    reportsTo: String, // user ID of supervisor
    skills: [{
      category: String, // ELECTRICAL, PLUMBING, HVAC, etc.
      skill: String, // Wiring, Installation, Repair, etc.
      level: { type: String, enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] },
      certified: Boolean,
      certification: String,
      expiry: Date,
      experience: Number // years
    }],
    certifications: [{
      name: String,
      issuer: String,
      issued: Date,
      expires: Date,
      status: String // VALID, EXPIRED, PENDING
    }],
    licenses: [{
      type: String, // Driver's License, Trade License, etc.
      number: String,
      issued: Date,
      expires: Date,
      status: String
    }]
  },

  // Workload & Capacity
  workload: {
    maxAssignments: Number,
    currentAssignments: Number,
    available: Boolean,
    location: {
      city: String,
      region: String,
      radius: Number // km service area
    },
    workingHours: {
      start: String, // HH:MM
      end: String, // HH:MM
      days: [String], // ["monday", "tuesday", etc.]
      timezone: { type: String, default: "Asia/Riyadh" }
    },
    availability: [{
      date: Date,
      start: String,
      end: String,
      status: String // AVAILABLE, BUSY, OFF
    }]
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
    reviews: [{
      workOrderId: String,
      rating: Number,
      comment: String,
      date: Date,
      reviewer: String
    }]
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
      secret: String
    }
  },

  // RBAC - Role-Based Access Control
  roles: [{ type: Schema.Types.ObjectId, ref: 'Role', index: true }],
  isSuperAdmin: { type: Boolean, default: false, index: true }, // Fast check for super admin access

  // Preferences
  preferences: {
    notifications: {
      email: Boolean,
      sms: Boolean,
      app: Boolean,
      workOrders: Boolean,
      maintenance: Boolean,
      reports: Boolean
    },
    language: { type: String, default: "ar" },
    timezone: { type: String, default: "Asia/Riyadh" },
    theme: { type: String, enum: ["LIGHT", "DARK", "AUTO", "SYSTEM"], default: "SYSTEM" }
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
      phone: String
    }
  },

  // Compliance
  compliance: {
    backgroundCheck: Boolean,
    drugTest: Boolean,
    training: [{
      course: String,
      completed: Date,
      expires: Date,
      status: String // VALID, EXPIRED, PENDING
    }],
    safetyRecord: {
      incidents: Number,
      violations: Number,
      lastIncident: Date
    }
  },

  // Status & Workflow
  status: { type: String, enum: UserStatus, default: "ACTIVE" },
  // workflow fields removed - auditPlugin provides createdBy/updatedBy

  // Metadata
  tags: [String],
  customFields: Schema.Types.Mixed

  // createdAt/updatedAt handled by timestamps:true
}, {
  timestamps: true
});

// Apply plugins
UserSchema.plugin(tenantIsolationPlugin);
UserSchema.plugin(auditPlugin);

// Indexes for performance (orgId is already indexed by tenantIsolationPlugin)
// CRITICAL FIX: Tenant-scoped unique indexes
UserSchema.index({ orgId: 1, email: 1 }, { unique: true });
UserSchema.index({ orgId: 1, username: 1 }, { unique: true });
UserSchema.index({ orgId: 1, code: 1 }, { unique: true });

// FIXED: Tenant-scoped query indexes
UserSchema.index({ orgId: 1, 'professional.role': 1 });
UserSchema.index({ orgId: 1, 'professional.skills.category': 1 });
UserSchema.index({ orgId: 1, 'workload.available': 1 });
UserSchema.index({ orgId: 1, 'performance.rating': -1 });
UserSchema.index({ orgId: 1, isSuperAdmin: 1 }); // RBAC index

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const User: Model<UserDoc> = getModel<UserDoc>('User', UserSchema);
