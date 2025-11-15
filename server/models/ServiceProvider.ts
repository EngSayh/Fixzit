import { Schema, Types, Model, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { getModel } from '@/src/types/mongoose-compat';

// ----- Enums -----
const ProviderStatus = ["PENDING", "APPROVED", "ACTIVE", "SUSPENDED", "REJECTED", "BLACKLISTED"] as const;
const ProviderType = ["INDIVIDUAL", "COMPANY"] as const;
const ServiceCategory = [
  "PLUMBING", "ELECTRICAL", "HVAC", "CARPENTRY", "PAINTING",
  "CLEANING", "PEST_CONTROL", "LANDSCAPING", "SECURITY",
  "APPLIANCE_REPAIR", "GENERAL_MAINTENANCE", "OTHER"
] as const;
const RateType = ["HOURLY", "FIXED", "QUOTE"] as const;
const AvailabilityType = ["24/7", "BUSINESS_HOURS", "BY_APPOINTMENT"] as const;
const PreferredContact = ["EMAIL", "PHONE", "WHATSAPP"] as const;
const DocStatus = ["PENDING", "VERIFIED", "EXPIRED", "REJECTED"] as const;
const BgStatus = ["PENDING", "PASSED", "FAILED", "NOT_REQUIRED"] as const;
const AcceptedPayment = ["CASH", "CARD", "BANK_TRANSFER", "CHECK"] as const;

// ----- Types -----
type TProviderStatus = typeof ProviderStatus[number];

interface IAvailabilitySlot {
  day: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  isAvailable: boolean;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
}

const ServiceProviderSchema = new Schema({
  // Multi-tenancy - enforced by plugin, but declared for indexes/types
  /** Organization that owns this service provider */
  // Note: index: true removed from orgId to avoid duplicate index warning
  // orgId is indexed via composite indexes below (orgId+code, orgId+status, etc.)
  orgId: { type: Schema.Types.ObjectId, required: true, ref: "Organization" },

  // Basic Information
  code: { type: String, required: true, trim: true }, // unique within org (see compound index below)
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  type: { type: String, enum: ProviderType, required: true },
  
  // Business Information
  businessName: { type: String, required: true, trim: true },
  tradeName: { type: String, trim: true },
  commercialRegistration: {
    type: String,
    trim: true,
    validate: {
      validator: (v: string) => !v || /^\d{10}$/.test(v), // KSA CR
      message: "commercialRegistration must be 10 digits"
    }
  },
  taxNumber: {
    type: String,
    trim: true,
    validate: {
      validator: (v: string) => !v || /^\d{15}$/.test(v), // KSA VAT
      message: "taxNumber (VAT) must be 15 digits"
    }
  },
  licenseNumber: { type: String, trim: true },
  establishedYear: { 
    type: Number, 
    min: 1900,
    validate: {
      validator: function(v: number) {
        const currentYear = new Date().getFullYear();
        return v >= 1900 && v <= currentYear;
      },
      message: (props: { value: number }) => `establishedYear must be between 1900 and ${new Date().getFullYear()}, got ${props.value}`
    }
  },
  
  // Owner/Manager Information
  owner: {
    name: { type: String, trim: true },
    nationalId: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string) => !v || /^\d{10}$/.test(v),
        message: "owner.nationalId must be 10 digits"
      }
    },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true }
  },
  
  // Contact Information
  contact: {
    phone: { 
      type: String, 
      required: true,
      trim: true,
      validate: {
        validator: (v: string) => /^\+?[1-9]\d{6,14}$/.test(v), // E.164
        message: "contact.phone must be E.164 (+9665XXXXXXXX)"
      }
    },
    mobile: { type: String, trim: true },
    email: { 
      type: String, 
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "contact.email is invalid"]
    },
    whatsapp: { type: String, trim: true },
    website: { type: String, trim: true },
    preferredMethod: { type: String, enum: PreferredContact, default: "PHONE" }
  },

  // Address with GeoJSON for geospatial queries
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true, index: true },
    region: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, default: "SA", trim: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [lng, lat]
        validate: {
          validator: (arr: number[] | null | undefined) => {
            // Allow null/undefined (optional)
            if (arr == null) return true;
            // Reject empty arrays, require exactly 2 numeric elements
            return Array.isArray(arr) && arr.length === 2 && arr.every(n => typeof n === "number");
          },
          message: "address.location.coordinates must be undefined/null or an array of exactly 2 numbers [lng, lat]"
        },
        default: undefined
      }
    }
  },

  // Service Areas
  serviceAreas: [{
    city: { type: String, trim: true },
    region: { type: String, trim: true },
    radius: { type: Number, min: 0 }
  }],

  // Services Offered
  services: [{
    category: { type: String, enum: ServiceCategory, required: true },
    name: { type: String, trim: true },
    description: { type: String, trim: true },
    baseRate: { type: Number, min: 0 },
    rateType: { type: String, enum: RateType },
    estimatedDuration: { type: Number, min: 0 },
    availability: { type: String, enum: AvailabilityType }
  }],

  // Verification
  verification: {
    identityVerified: { type: Boolean, default: false },
    businessVerified: { type: Boolean, default: false },
    backgroundCheck: {
      status: { type: String, enum: BgStatus },
      date: Date,
      expiresAt: Date,
      documentUrl: String
    },
    insuranceVerified: { type: Boolean, default: false },
    insurance: {
      provider: String,
      policyNumber: String,
      coverage: { type: Number, min: 0 },
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
    userId: { type: Schema.Types.ObjectId, ref: "User" },
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
      isAvailable: { type: Boolean, default: false },
      startTime: String, // HH:mm
      endTime: String // HH:mm
    }],
    holidays: [Date],
    emergencyAvailable: { type: Boolean, default: false },
    advanceBookingRequired: { type: Number, default: 24, min: 0 }
  },

  // Pricing
  pricing: {
    hourlyRate: { type: Number, min: 0 },
    emergencyRate: { type: Number, min: 0 },
    minimumCharge: { type: Number, min: 0 },
    travelFee: { type: Number, min: 0 },
    currency: { type: String, default: "SAR" },
    paymentTerms: { type: String, trim: true },
    acceptedMethods: [{ type: String, enum: AcceptedPayment }]
  },

  // Performance Metrics
  performance: {
    totalJobs: { type: Number, default: 0, min: 0 },
    completedJobs: { type: Number, default: 0, min: 0 },
    cancelledJobs: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    responseTime: { type: Number, default: 0, min: 0 },
    onTimeRate: { type: Number, default: 0, min: 0, max: 100 },
    customerSatisfaction: { type: Number, default: 0, min: 0, max: 100 }
  },

  // Reviews & Ratings
  reviews: [{
    jobId: { type: Schema.Types.ObjectId, ref: "WorkOrder" },
    customerId: { type: Schema.Types.ObjectId, ref: "User" },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true },
    photos: [String],
    response: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now }
  }],

  // Financial
  financial: {
    bankAccounts: [{
      bankName: String,
      accountNumber: String,
      iban: {
        type: String,
        trim: true,
        validate: {
          validator: (v: string) => !v || /^SA\d{22}$/i.test(v),
          message: "IBAN must be a valid SA format"
        }
      },
      isPrimary: Boolean
    }],
    totalEarnings: { type: Number, default: 0, min: 0 },
    pendingPayments: { type: Number, default: 0, min: 0 },
    lastPaymentDate: Date,
    commission: { type: Number, default: 5, min: 0, max: 100 }
  },

  // Documents
  documents: [{
    type: String, // CR, LICENSE, INSURANCE, ID, etc.
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now },
    expiresAt: Date,
    status: { type: String, enum: DocStatus }
  }],

  // Status
  status: { type: String, enum: ProviderStatus, default: "PENDING", index: true },
  statusReason: String,
  approvedAt: Date,
  approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  rejectedAt: Date,
  rejectionReason: String,
  
  // Preferences
  preferences: {
    language: { type: String, enum: ["en", "ar"], default: "ar" },
    autoAcceptJobs: { type: Boolean, default: false },
    maxConcurrentJobs: { type: Number, default: 3, min: 1 },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false }
    }
  },

  // Metadata
  notes: String,
  tags: [String],
  internalRating: { type: Number, min: 0, max: 5 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ----- Indexes -----
ServiceProviderSchema.index({ orgId: 1, code: 1 }, { unique: true }); // tenant-scoped uniqueness
ServiceProviderSchema.index({ orgId: 1, status: 1 });
ServiceProviderSchema.index({ orgId: 1, "services.category": 1 });
ServiceProviderSchema.index(
  { orgId: 1, "contact.email": 1 },
  { partialFilterExpression: { "contact.email": { $type: "string" } } }
);
ServiceProviderSchema.index({ "address.location": "2dsphere" }); // geospatial queries
// ⚡ FIXED: Add orgId prefix for tenant-scoped text search
ServiceProviderSchema.index({ orgId: 1, businessName: "text", tradeName: "text", "owner.name": "text", tags: "text" });

// Plugins
ServiceProviderSchema.plugin(tenantIsolationPlugin);
ServiceProviderSchema.plugin(auditPlugin);

// Virtual for completion rate
ServiceProviderSchema.virtual("completionRatePercent").get(function() {
  const t = this.performance?.totalJobs ?? 0;
  const c = this.performance?.completedJobs ?? 0;
  return t > 0 ? (c / t) * 100 : 0;
});

// ----- Helper Functions -----
function hhmmToMinutes(hhmm?: string): number | undefined {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return undefined;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Method to check availability
ServiceProviderSchema.methods.isAvailableAt = function(date: Date): boolean {
  // Holiday check (exact date match)
  const holidays: Date[] = this.availability?.holidays ?? [];
  if (holidays.some(h => h.toDateString() === date.toDateString())) return false;

  const dayNames: IAvailabilitySlot["day"][] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const day = dayNames[date.getDay()];
  const slot = (this.availability?.schedule ?? []).find((s: IAvailabilitySlot) => s.day === day);

  if (!slot || !slot.isAvailable) return false;

  // Time window check (HH:mm local time)
  const nowMins = date.getHours() * 60 + date.getMinutes();
  const startMins = hhmmToMinutes(slot.startTime);
  const endMins = hhmmToMinutes(slot.endTime);
  if (startMins !== undefined && endMins !== undefined) {
    return nowMins >= startMins && nowMins <= endMins;
  }
  return true;
};

// Controlled status transitions
const ALLOWED: Record<TProviderStatus, TProviderStatus[]> = {
  PENDING: ["APPROVED", "REJECTED", "BLACKLISTED"],
  APPROVED: ["ACTIVE", "SUSPENDED", "BLACKLISTED"],
  ACTIVE: ["SUSPENDED", "BLACKLISTED"],
  SUSPENDED: ["ACTIVE", "BLACKLISTED"],
  REJECTED: ["PENDING", "BLACKLISTED"],
  BLACKLISTED: [] // terminal
};

ServiceProviderSchema.methods.transitionStatus = async function(
  next: TProviderStatus,
  actorId?: Types.ObjectId,
  reason?: string
) {
  const current: TProviderStatus = this.status;
  if (!ALLOWED[current].includes(next)) {
    throw new Error(`Illegal status transition ${current} → ${next}`);
  }
  
  // Perform atomic update to avoid inconsistent state on failure
  const updateFields: Record<string, Date | Types.ObjectId | string | TProviderStatus> = {
    status: next
  };
  
  if (next === "APPROVED") {
    updateFields.approvedAt = new Date();
    if (actorId) updateFields.approvedBy = actorId;
  }
  if (next === "REJECTED") {
    updateFields.rejectedAt = new Date();
    if (reason) updateFields.rejectionReason = reason;
  }
  if (reason) updateFields.statusReason = reason;
  
  try {
    // Use findByIdAndUpdate for atomic operation
    const ModelClass = (this.constructor as any) as typeof ServiceProviderModel;
    const updated = await ModelClass.findByIdAndUpdate(
      this._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    
    if (!updated) {
      throw new Error(`Failed to update ServiceProvider ${this._id}: document not found`);
    }
    
    // Update in-memory instance with persisted values
    Object.assign(this, updated.toObject());
  } catch (error) {
    // On error, the DB remains unchanged (atomic operation)
    // Re-throw with context
    throw new Error(`ServiceProvider.transitionStatus failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// ----- Static Methods -----
ServiceProviderSchema.statics.recomputeRatings = async function(providerId: Types.ObjectId) {
  const doc = await this.findById(providerId).lean();
  if (!doc) return;
  const reviews = doc.reviews ?? [];
  const totalReviews = reviews.length;
  const averageRating = totalReviews ? reviews.reduce((a: number, r: { rating?: number }) => a + (r.rating || 0), 0) / totalReviews : 0;

  await this.updateOne(
    { _id: providerId },
    {
      $set: {
        "performance.totalReviews": totalReviews,
        "performance.averageRating": Number(averageRating.toFixed(2))
      }
    }
  );
};

// ----- Pre-save Hook -----
ServiceProviderSchema.pre("save", function(next) {
  if (this.contact?.email) this.contact.email = String(this.contact.email).trim().toLowerCase();
  if (this.owner?.email) this.owner.email = String(this.owner.email).trim().toLowerCase();
  if (this.businessName) this.businessName = this.businessName.trim();
  if (this.tradeName) this.tradeName = this.tradeName.trim();
  next();
});

// Export type and model
export type ServiceProvider = InferSchemaType<typeof ServiceProviderSchema>;
export const ServiceProviderModel = getModel<ServiceProvider>('ServiceProvider', ServiceProviderSchema);
