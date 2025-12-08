/**
 * SMS Settings Model
 *
 * Stores SMS SLA configuration and provider settings per organization.
 * Superadmin can configure global defaults, orgs can override.
 *
 * @module server/models/SMSSettings
 */

import { Schema, model, models, HydratedDocument, Types } from "mongoose";
import { MModel } from "@/types/mongoose-compat";
import { auditPlugin } from "../plugins/auditPlugin";
import { TSMSProvider, SMSProvider, TSMSType, SMSType, TSMSPriority, SMSPriority } from "./SMSMessage";

// ---------- Interfaces ----------
export interface ISLAConfig {
  type: TSMSType;
  priority: TSMSPriority;
  targetDeliveryMs: number; // Target delivery time in milliseconds
  maxRetries: number;
  expiresAfterMs: number; // Message expires after this time
}

export interface IProviderConfig {
  provider: TSMSProvider;
  enabled: boolean;
  priority: number; // Lower is higher priority (1 = primary)
  accountId?: string;
  encryptedApiKey?: string; // Stored encrypted
  fromNumber?: string;
  region?: string;
  rateLimit?: number; // Messages per minute
  costPerMessage?: number; // For cost tracking
  supportedTypes?: TSMSType[];
}

export interface ISMSSettings {
  _id: Types.ObjectId;

  // Scope - null orgId means global settings
  orgId?: string;
  isGlobal: boolean;

  // SLA configurations by type and priority
  slaConfigs: ISLAConfig[];

  // Provider configurations
  providers: IProviderConfig[];

  // Default settings
  defaultProvider: TSMSProvider;
  defaultMaxRetries: number;
  defaultExpiresAfterMs: number;

  // Rate limiting
  globalRateLimitPerMinute: number;
  globalRateLimitPerHour: number;

  // Notifications
  slaBreachNotifyEmails: string[];
  slaBreachNotifyWebhook?: string;
  dailyReportEnabled: boolean;
  dailyReportEmails: string[];

  // Feature flags
  queueEnabled: boolean;
  retryEnabled: boolean;
  deliveryWebhookEnabled: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}

// ---------- Schema ----------
const SLAConfigSchema = new Schema<ISLAConfig>(
  {
    type: { type: String, enum: SMSType, required: true },
    priority: { type: String, enum: SMSPriority, required: true },
    targetDeliveryMs: { type: Number, required: true },
    maxRetries: { type: Number, required: true, default: 3 },
    expiresAfterMs: { type: Number, required: true },
  },
  { _id: false }
);

const ProviderConfigSchema = new Schema<IProviderConfig>(
  {
    provider: { type: String, enum: SMSProvider, required: true },
    enabled: { type: Boolean, default: true },
    priority: { type: Number, default: 1 },
    accountId: { type: String },
    encryptedApiKey: { type: String },
    fromNumber: { type: String },
    region: { type: String },
    rateLimit: { type: Number },
    costPerMessage: { type: Number },
    supportedTypes: { type: [String], enum: SMSType },
  },
  { _id: false }
);

const SMSSettingsSchema = new Schema<ISMSSettings>(
  {
    orgId: { type: String, index: true, sparse: true },
    isGlobal: { type: Boolean, default: false, index: true },

    slaConfigs: { type: [SLAConfigSchema], default: [] },
    providers: { type: [ProviderConfigSchema], default: [] },

    defaultProvider: {
      type: String,
      enum: SMSProvider,
      default: "TWILIO",
    },
    defaultMaxRetries: { type: Number, default: 3 },
    defaultExpiresAfterMs: {
      type: Number,
      default: 24 * 60 * 60 * 1000, // 24 hours
    },

    globalRateLimitPerMinute: { type: Number, default: 60 },
    globalRateLimitPerHour: { type: Number, default: 1000 },

    slaBreachNotifyEmails: { type: [String], default: [] },
    slaBreachNotifyWebhook: { type: String },
    dailyReportEnabled: { type: Boolean, default: false },
    dailyReportEmails: { type: [String], default: [] },

    queueEnabled: { type: Boolean, default: true },
    retryEnabled: { type: Boolean, default: true },
    deliveryWebhookEnabled: { type: Boolean, default: true },

    updatedBy: { type: String },
  },
  {
    timestamps: true,
    collection: "sms_settings",
  }
);

// ---------- Validation ----------
SMSSettingsSchema.pre("validate", function (next) {
  const doc = this as ISMSSettings;

  for (const provider of doc.providers || []) {
    if (!provider.enabled) continue;

    if (!provider.fromNumber) {
      return next(new Error(`SMS provider ${provider.provider} missing fromNumber`));
    }
    if (!provider.accountId) {
      return next(new Error(`SMS provider ${provider.provider} missing accountId`));
    }
    if (!provider.encryptedApiKey) {
      return next(new Error(`SMS provider ${provider.provider} missing encryptedApiKey`));
    }
  }

  // defaultProvider must exist in providers when org-specific settings are defined
  if (!doc.isGlobal && doc.providers?.length) {
    const hasDefault = doc.providers.some((p) => p.provider === doc.defaultProvider);
    if (!hasDefault) {
      return next(new Error(`defaultProvider ${doc.defaultProvider} is not defined in providers array`));
    }
  }

  next();
});

// ---------- Indexes ----------
SMSSettingsSchema.index({ isGlobal: 1 }, { unique: true, partialFilterExpression: { isGlobal: true } });
SMSSettingsSchema.index({ orgId: 1 }, { unique: true, sparse: true });

// ---------- Statics ----------
SMSSettingsSchema.statics.getGlobalSettings = async function (): Promise<ISMSSettings | null> {
  return this.findOne({ isGlobal: true }).lean();
};

SMSSettingsSchema.statics.getOrgSettings = async function (orgId: string): Promise<ISMSSettings | null> {
  return this.findOne({ orgId }).lean();
};

SMSSettingsSchema.statics.getEffectiveSettings = async function (orgId?: string): Promise<ISMSSettings> {
  // Get org-specific settings first, fall back to global
  const orgSettings = orgId ? await this.findOne({ orgId }).lean() : null;
  const globalSettings = await this.findOne({ isGlobal: true }).lean();

  if (!globalSettings && !orgSettings) {
    // Return default settings if none exist
    return {
      isGlobal: true,
      slaConfigs: getDefaultSLAConfigs(),
      providers: [],
      defaultProvider: "TWILIO" as TSMSProvider,
      defaultMaxRetries: 3,
      defaultExpiresAfterMs: 24 * 60 * 60 * 1000,
      globalRateLimitPerMinute: 60,
      globalRateLimitPerHour: 1000,
      slaBreachNotifyEmails: [],
      dailyReportEnabled: false,
      dailyReportEmails: [],
      queueEnabled: true,
      retryEnabled: true,
      deliveryWebhookEnabled: true,
    } as unknown as ISMSSettings;
  }

  if (!orgSettings) return globalSettings!;
  if (!globalSettings) return orgSettings!;

  // Merge org settings with global defaults
  return {
    ...globalSettings,
    ...orgSettings,
    // Merge arrays - org settings take precedence
    slaConfigs: orgSettings.slaConfigs?.length ? orgSettings.slaConfigs : globalSettings.slaConfigs,
    providers: orgSettings.providers?.length ? orgSettings.providers : globalSettings.providers,
  };
};

SMSSettingsSchema.statics.getSLATarget = async function (
  type: TSMSType,
  priority: TSMSPriority,
  orgId?: string
): Promise<number | null> {
  // Use findOne directly to avoid circular reference issues
  const orgSettings = orgId ? await this.findOne({ orgId }).lean() : null;
  const globalSettings = await this.findOne({ isGlobal: true }).lean();
  const settings = orgSettings || globalSettings;
  if (!settings) return null;
  const slaConfig = settings.slaConfigs?.find(
    (c: ISLAConfig) => c.type === type && c.priority === priority
  );
  return slaConfig?.targetDeliveryMs ?? null;
};

SMSSettingsSchema.statics.ensureGlobalSettings = async function (): Promise<ISMSSettings> {
  let global = await this.findOne({ isGlobal: true });
  if (!global) {
    global = await this.create({
      isGlobal: true,
      slaConfigs: getDefaultSLAConfigs(),
      providers: [],
      defaultProvider: "TWILIO",
      defaultMaxRetries: 3,
      defaultExpiresAfterMs: 24 * 60 * 60 * 1000,
      globalRateLimitPerMinute: 60,
      globalRateLimitPerHour: 1000,
    });
  }
  return global;
};

// ---------- Default SLA Configs ----------
function getDefaultSLAConfigs(): ISLAConfig[] {
  return [
    // OTP messages - highest priority
    { type: "OTP", priority: "CRITICAL", targetDeliveryMs: 10000, maxRetries: 5, expiresAfterMs: 300000 }, // 10s, 5min expiry
    { type: "OTP", priority: "HIGH", targetDeliveryMs: 15000, maxRetries: 4, expiresAfterMs: 300000 },
    { type: "OTP", priority: "NORMAL", targetDeliveryMs: 30000, maxRetries: 3, expiresAfterMs: 300000 },
    { type: "OTP", priority: "LOW", targetDeliveryMs: 60000, maxRetries: 2, expiresAfterMs: 300000 },

    // Alerts - high priority
    { type: "ALERT", priority: "CRITICAL", targetDeliveryMs: 30000, maxRetries: 5, expiresAfterMs: 3600000 }, // 30s, 1hr expiry
    { type: "ALERT", priority: "HIGH", targetDeliveryMs: 60000, maxRetries: 4, expiresAfterMs: 3600000 },
    { type: "ALERT", priority: "NORMAL", targetDeliveryMs: 120000, maxRetries: 3, expiresAfterMs: 3600000 },
    { type: "ALERT", priority: "LOW", targetDeliveryMs: 300000, maxRetries: 2, expiresAfterMs: 3600000 },

    // Notifications - standard
    { type: "NOTIFICATION", priority: "CRITICAL", targetDeliveryMs: 60000, maxRetries: 3, expiresAfterMs: 86400000 }, // 1min, 24hr expiry
    { type: "NOTIFICATION", priority: "HIGH", targetDeliveryMs: 120000, maxRetries: 3, expiresAfterMs: 86400000 },
    { type: "NOTIFICATION", priority: "NORMAL", targetDeliveryMs: 300000, maxRetries: 3, expiresAfterMs: 86400000 },
    { type: "NOTIFICATION", priority: "LOW", targetDeliveryMs: 600000, maxRetries: 2, expiresAfterMs: 86400000 },

    // Transactional - business priority
    { type: "TRANSACTIONAL", priority: "CRITICAL", targetDeliveryMs: 60000, maxRetries: 5, expiresAfterMs: 86400000 },
    { type: "TRANSACTIONAL", priority: "HIGH", targetDeliveryMs: 120000, maxRetries: 4, expiresAfterMs: 86400000 },
    { type: "TRANSACTIONAL", priority: "NORMAL", targetDeliveryMs: 300000, maxRetries: 3, expiresAfterMs: 86400000 },
    { type: "TRANSACTIONAL", priority: "LOW", targetDeliveryMs: 600000, maxRetries: 2, expiresAfterMs: 86400000 },

    // Marketing - lowest priority
    { type: "MARKETING", priority: "CRITICAL", targetDeliveryMs: 300000, maxRetries: 3, expiresAfterMs: 86400000 },
    { type: "MARKETING", priority: "HIGH", targetDeliveryMs: 600000, maxRetries: 2, expiresAfterMs: 86400000 },
    { type: "MARKETING", priority: "NORMAL", targetDeliveryMs: 1800000, maxRetries: 2, expiresAfterMs: 86400000 },
    { type: "MARKETING", priority: "LOW", targetDeliveryMs: 3600000, maxRetries: 1, expiresAfterMs: 86400000 },
  ];
}

// ---------- Plugins ----------
SMSSettingsSchema.plugin(auditPlugin);

// ---------- Type Extensions ----------
interface SMSSettingsStatics {
  getGlobalSettings(): Promise<ISMSSettings | null>;
  getOrgSettings(orgId: string): Promise<ISMSSettings | null>;
  getEffectiveSettings(orgId?: string): Promise<ISMSSettings>;
  getSLATarget(type: TSMSType, priority: TSMSPriority, orgId?: string): Promise<number | null>;
  ensureGlobalSettings(): Promise<ISMSSettings>;
}

type SMSSettingsModel = MModel<ISMSSettings> & SMSSettingsStatics;
export type SMSSettingsDocument = HydratedDocument<ISMSSettings>;

// ---------- Export ----------
export const SMSSettings = (models.SMSSettings ||
  model<ISMSSettings>("SMSSettings", SMSSettingsSchema)) as unknown as SMSSettingsModel;
