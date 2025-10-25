import { Schema, model, models, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const ProviderStatus = ["PENDING", "APPROVED", "ACTIVE", "SUSPENDED", "REJECTED", "BLACKLISTED"] as const;
const ProviderType = ["INDIVIDUAL", "COMPANY"] as const;
const ServiceCategory = [
  "PLUMBING", "ELECTRICAL", "HVAC", "CARPENTRY", "PAINTING",
  "CLEANING", "PEST_CONTROL", "LANDSCAPING", "SECURITY",
  "APPLIANCE_REPAIR", "GENERAL_MAINTENANCE", "OTHER"
] as const;

const ServiceProviderSchema = new Schema({
  // Multi-tenancy - will be added by plugin
  // orgId: { type: String, required: true, index: true },

  // Basic Information
  code: { type: String, required: true, unique: true },
  userId: { type: String, ref: "User" }, // Link to auth user
  type: { type: String, enum: ProviderType, required: true },
  
  // Business Information
  businessName: { type: String, required: true },
  tradeName: String,
  commercialRegistration: String,
  taxNumber: String,
  licenseNumber: String,
  establishedYear: Number,
  
  // Owner/Manager Information
  owner: {
    name: String,
    nationalId: String,
    phone: String,
    email: String
  },
  
  // Contact Information
  contact: {
    phone: { type: String, required: true },
    mobile: String,
    email: { type: String, required: true },
    whatsapp: String,
    website: String,
    preferredMethod: { type: String, enum: ["EMAIL", "PHONE", "WHATSAPP"], default: "PHONE" }
  },

  // Address
  address: {
    street: String,
    city: String,
    region: String,
    postalCode: String,
    country: { type: String, default: "SA" },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // Service Areas
  serviceAreas: [{
    city: String,
    region: String,
    radius: Number, // km from base location
  }],

  // Services Offered
  services: [{
    category: { type: String, enum: ServiceCategory, required: true },
    name: String,
    description: String,
    baseRate: Number,
    rateType: { type: String, enum: ["HOURLY", "FIXED", "QUOTE"] },
    estimatedDuration: Number, // minutes
    availability: { type: String, enum: ["24/7", "BUSINESS_HOURS", "BY_APPOINTMENT"] }
  }],

  // Verification
  verification: {
    identityVerified: { type: Boolean, default: false },
    businessVerified: { type: Boolean, default: false },
    backgroundCheck: {
      status: { type: String, enum: ["PENDING", "PASSED", "FAILED", "NOT_REQUIRED"] },
      date: Date,
      expiresAt: Date,
      documentUrl: String
    },
    insuranceVerified: { type: Boolean, default: false },
    insurance: {
      provider: String,
      policyNumber: String,
      coverage: Number,
      expiresAt: Date,
      documentUrl: String
    }
  },

  // Certifications
  certifications: [{
    name: String,
    issuer: String,
    number: String,
    issuedAt: Date,
    expiresAt: Date,
    documentUrl: String,
    isVerified: Boolean
  }],

  // Team
  team: [{
    name: String,
    role: String,
    phone: String,
    specialization: [String],
    certifications: [String]
  }],

  // Availability Schedule
  availability: {
    schedule: [{
      day: { type: String, enum: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] },
      isAvailable: Boolean,
      startTime: String, // HH:mm
      endTime: String // HH:mm
    }],
    holidays: [Date],
    emergencyAvailable: Boolean,
    advanceBookingRequired: { type: Number, default: 24 }, // hours
  },

  // Pricing
  pricing: {
    hourlyRate: Number,
    emergencyRate: Number,
    minimumCharge: Number,
    travelFee: Number,
    currency: { type: String, default: "SAR" },
    paymentTerms: String, // NET_0, NET_7, NET_30
    acceptedMethods: [{ type: String, enum: ["CASH", "CARD", "BANK_TRANSFER", "CHECK"] }]
  },

  // Performance Metrics
  performance: {
    totalJobs: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    cancelledJobs: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    responseTime: { type: Number, default: 0 }, // average minutes to respond
    completionRate: { type: Number, default: 0 }, // percentage
    onTimeRate: { type: Number, default: 0 }, // percentage
    customerSatisfaction: { type: Number, default: 0 }, // percentage
  },

  // Reviews & Ratings
  reviews: [{
    jobId: { type: Schema.Types.ObjectId, ref: "WorkOrder" },
    customerId: { type: String, ref: "User" },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    photos: [String],
    response: String, // Provider's response
    createdAt: Date
  }],

  // Financial
  financial: {
    bankAccounts: [{
      bankName: String,
      accountNumber: String,
      iban: String,
      isPrimary: Boolean
    }],
    totalEarnings: { type: Number, default: 0 },
    pendingPayments: { type: Number, default: 0 },
    lastPaymentDate: Date,
    commission: { type: Number, default: 5 }, // Platform commission percentage
  },

  // Documents
  documents: [{
    type: String, // CR, LICENSE, INSURANCE, ID, etc.
    name: String,
    url: String,
    uploadedAt: Date,
    expiresAt: Date,
    status: { type: String, enum: ["PENDING", "VERIFIED", "EXPIRED", "REJECTED"] }
  }],

  // Status
  status: { type: String, enum: ProviderStatus, default: "PENDING" },
  statusReason: String,
  approvedAt: Date,
  approvedBy: String,
  rejectedAt: Date,
  rejectionReason: String,
  
  // Preferences
  preferences: {
    language: { type: String, enum: ["en", "ar"], default: "ar" },
    autoAcceptJobs: { type: Boolean, default: false },
    maxConcurrentJobs: { type: Number, default: 3 },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false }
    }
  },

  // Metadata
  notes: String,
  tags: [String],
  internalRating: { type: Number, min: 0, max: 5 }, // Admin rating
  
  // Timestamps managed by plugin
}, {
  timestamps: true
});

// Indexes
ServiceProviderSchema.index({ code: 1 });
ServiceProviderSchema.index({ userId: 1 });
ServiceProviderSchema.index({ status: 1 });
ServiceProviderSchema.index({ "contact.email": 1 });
ServiceProviderSchema.index({ "services.category": 1 });
ServiceProviderSchema.index({ "address.city": 1 });
ServiceProviderSchema.index({ "performance.averageRating": -1 });

// Plugins
ServiceProviderSchema.plugin(tenantIsolationPlugin);
ServiceProviderSchema.plugin(auditPlugin);

// Virtual for completion rate
ServiceProviderSchema.virtual('completionRatePercent').get(function() {
  if (!this.performance?.totalJobs || this.performance.totalJobs === 0) return 0;
  return (this.performance.completedJobs / this.performance.totalJobs) * 100;
});

// Method to check availability
ServiceProviderSchema.methods.isAvailableAt = function(date: Date) {
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const day = dayNames[date.getDay()];
  
  const schedule = this.availability.schedule.find((s: { day: string; isAvailable: boolean }) => s.day === day);
  if (!schedule || !schedule.isAvailable) return false;
  
  // Check if it's a holiday
  const isHoliday = this.availability.holidays.some((h: Date) => 
    h.toDateString() === date.toDateString()
  );
  
  return !isHoliday;
};

// Export type and model
export type ServiceProvider = InferSchemaType<typeof ServiceProviderSchema>;
export const ServiceProviderModel = models.ServiceProvider || model("ServiceProvider", ServiceProviderSchema);
