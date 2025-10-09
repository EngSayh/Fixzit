import { Schema, model, models, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";

// User roles enum - comprehensive RBAC matrix
export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  CORPORATE_ADMIN: "CORPORATE_ADMIN", 
  ADMIN: "ADMIN",
  FM_MANAGER: "FM_MANAGER",
  PROPERTY_MANAGER: "PROPERTY_MANAGER",
  FINANCE: "FINANCE",
  HR: "HR",
  PROCUREMENT: "PROCUREMENT",
  TECHNICIAN: "TECHNICIAN",
  EMPLOYEE: "EMPLOYEE",
  OWNER: "OWNER",
  TENANT: "TENANT",
  VENDOR: "VENDOR",
  CUSTOMER: "CUSTOMER",
  AUDITOR: "AUDITOR",
  VIEWER: "VIEWER"
} as const;
const UserStatus = ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"] as const;

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
    permissions: [String], // Specific permissions
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
    theme: { type: String, enum: ["LIGHT", "DARK", "AUTO"] }
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
  status: { type: String, enum: UserStatus, default: "ACTIVE", index: true },
  workflow: {
    createdBy: String,
    approvedBy: String,
    approvedAt: Date,
    onboardedBy: String,
    onboardedAt: Date
  },

  // Metadata
  tags: [String],
  customFields: Schema.Types.Mixed,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Apply plugins
UserSchema.plugin(tenantIsolationPlugin);
UserSchema.plugin(auditPlugin);

// Indexes for performance (orgId is already indexed by tenantIsolationPlugin)
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ code: 1 }, { unique: true });
UserSchema.index({ 'professional.role': 1 });
UserSchema.index({ 'professional.skills.category': 1 });
UserSchema.index({ 'workload.available': 1 });
UserSchema.index({ 'performance.rating': -1 });

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const User = models.User || model("User", UserSchema);

