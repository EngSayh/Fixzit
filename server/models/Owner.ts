import { Schema, model, models, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const OwnerType = ["INDIVIDUAL", "COMPANY", "TRUST", "GOVERNMENT"] as const;
const OwnerStatus = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

const OwnerSchema = new Schema({
  // Multi-tenancy - will be added by plugin
  // orgId: { type: String, required: true, index: true },

  // Basic Information
  code: { type: String, required: true, unique: true },
  userId: { type: String, ref: "User", required: true }, // Link to auth user
  type: { type: String, enum: OwnerType, required: true },
  
  // Personal/Company Information
  name: {
    first: String,
    middle: String,
    last: String,
    full: { type: String, required: true }
  },
  companyName: String, // If type is COMPANY
  nationalId: { type: String, unique: true, sparse: true }, // Iqama/ID number
  commercialRegistration: String, // For companies
  taxNumber: String,

  // Contact Information
  contact: {
    email: { type: String, required: true },
    phone: { type: String, required: true },
    mobile: String,
    whatsapp: String,
    preferredMethod: { type: String, enum: ["EMAIL", "PHONE", "WHATSAPP"], default: "EMAIL" }
  },

  // Address
  address: {
    street: String,
    city: String,
    region: String,
    postalCode: String,
    country: { type: String, default: "SA" },
    nationalAddress: String // SPL National Address
  },

  // Financial Information
  financial: {
    bankAccounts: [{
      bankName: String,
      accountNumber: String,
      iban: String,
      swiftCode: String,
      isPrimary: Boolean
    }],
    paymentTerms: { type: String, default: "NET_30" }, // NET_15, NET_30, NET_60
    creditLimit: Number,
    currency: { type: String, default: "SAR" }
  },

  // Properties Owned
  properties: [{
    propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
    ownershipType: { type: String, enum: ["FULL", "PARTIAL", "MANAGEMENT"] },
    ownershipPercentage: { type: Number, min: 0, max: 100 },
    startDate: Date,
    endDate: Date, // Null if current owner
    documents: [{
      type: String, // DEED, TITLE, POA, etc.
      url: String,
      uploadedAt: Date
    }]
  }],

  // Portfolio Summary
  portfolio: {
    totalProperties: { type: Number, default: 0 },
    totalUnits: { type: Number, default: 0 },
    totalArea: { type: Number, default: 0 }, // sqm
    occupancyRate: { type: Number, default: 0 }, // percentage
    totalRevenue: { type: Number, default: 0 }, // monthly
    totalExpenses: { type: Number, default: 0 } // monthly
  },

  // Preferences
  preferences: {
    language: { type: String, enum: ["en", "ar"], default: "ar" },
    autoApproveMaintenanceUnder: Number, // Auto-approve maintenance under this amount
    receiveReports: { type: Boolean, default: true },
    reportFrequency: { type: String, enum: ["DAILY", "WEEKLY", "MONTHLY"], default: "MONTHLY" },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false }
    }
  },

  // Documents
  documents: [{
    type: String, // ID_COPY, CR_COPY, VAT_CERTIFICATE, etc.
    name: String,
    url: String,
    uploadedAt: Date,
    expiresAt: Date,
    status: { type: String, enum: ["PENDING", "VERIFIED", "EXPIRED", "REJECTED"] }
  }],

  // Status
  status: { type: String, enum: OwnerStatus, default: "ACTIVE" },
  statusReason: String,
  
  // Metadata
  notes: String,
  tags: [String],
  rating: { type: Number, min: 0, max: 5 }, // Internal rating
  lastContactDate: Date,
  
  // Timestamps managed by plugin
}, {
  timestamps: true
});

// Indexes
OwnerSchema.index({ code: 1 });
OwnerSchema.index({ userId: 1 });
OwnerSchema.index({ "contact.email": 1 });
OwnerSchema.index({ nationalId: 1 });
OwnerSchema.index({ status: 1 });
OwnerSchema.index({ "properties.propertyId": 1 });

// Plugins
OwnerSchema.plugin(tenantIsolationPlugin);
OwnerSchema.plugin(auditPlugin);

// Pre-save hook to update portfolio summary
OwnerSchema.pre('save', async function(next) {
  if (this.isModified('properties')) {
    // Calculate portfolio summary
    this.portfolio.totalProperties = this.properties.filter(p => !p.endDate).length;
  }
  next();
});

// Virtual for full name
OwnerSchema.virtual('displayName').get(function() {
  return this.companyName || this.name.full;
});

// Export type and model
export type Owner = InferSchemaType<typeof OwnerSchema>;
export const OwnerModel = models.Owner || model("Owner", OwnerSchema);
