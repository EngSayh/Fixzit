import { Schema, model, models, Document, Model } from 'mongoose';

export interface IAtsSettings extends Document {
  orgId: string;
  
  // Pipeline Configuration
  pipelineStages: string[];
  customStages?: Array<{
    name: string;
    order: number;
    color: string;
    autoActions?: string[];
  }>;
  
  // Screening Rules
  knockoutRules: {
    mustHaveSkills?: string[];
    minExperience?: number;
    maxExperience?: number;
    requiredCertifications?: string[];
    locationRestrictions?: string[];
    visaRequirements?: string[];
  };
  
  // Scoring Configuration
  scoringWeights: {
    skills: number;
    experience: number;
    education: number;
    certifications: number;
    answers: number;
  };
  
  // Email Templates
  emailTemplates: {
    applicationReceived?: string;
    applicationRejected?: string;
    interviewInvitation?: string;
    interviewReminder?: string;
    offerLetter?: string;
    welcomeEmail?: string;
  };
  
  // Interview Settings
  interviewSettings: {
    defaultDuration: number;
    bufferTime: number;
    availableSlots: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }>;
    reminderSchedule: number[]; // hours before interview
  };
  
  // Offer Settings
  offerSettings: {
    defaultExpiryDays: number;
    requireApprovals: boolean;
    approvalRoles: string[];
    standardBenefits: string[];
    probationPeriod: {
      duration: number;
      unit: 'days' | 'months';
    };
  };
  
  // GDPR/Compliance
  compliance: {
    dataRetentionDays: number;
    requireConsent: boolean;
    consentText?: string;
    anonymizeAfterDays?: number;
  };
  
  // Integration Settings
  integrations: {
    linkedinEnabled?: boolean;
    indeedEnabled?: boolean;
    emailProvider?: 'smtp' | 'sendgrid' | 'ses';
    calendarProvider?: 'google' | 'outlook' | 'caldav';
    storageProvider?: 's3' | 'gcs' | 'azure' | 'local';
  };
  
  // Notifications
  notifications: {
    channels: ('email' | 'sms' | 'whatsapp' | 'in-app')[];
    newApplicationAlert: boolean;
    stageChangeAlert: boolean;
    interviewFeedbackAlert: boolean;
    offerStatusAlert: boolean;
  };
  
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  getEmailTemplate(templateName: string, variables?: Record<string, any>): string;
  shouldAutoReject(candidate: any): { reject: boolean; reason?: string };
}

const AtsSettingsSchema = new Schema<IAtsSettings>({
  orgId: { 
    type: String, 
    unique: true, 
    index: true,
    required: true
  },
  
  pipelineStages: {
    type: [String],
    default: ['applied', 'screened', 'interview', 'offer', 'hired', 'rejected']
  },
  customStages: [{
    name: String,
    order: Number,
    color: String,
    autoActions: [String]
  }],
  
  knockoutRules: {
    mustHaveSkills: [String],
    minExperience: Number,
    maxExperience: Number,
    requiredCertifications: [String],
    locationRestrictions: [String],
    visaRequirements: [String]
  },
  
  scoringWeights: {
    skills: { type: Number, default: 0.4 },
    experience: { type: Number, default: 0.2 },
    education: { type: Number, default: 0.15 },
    certifications: { type: Number, default: 0.15 },
    answers: { type: Number, default: 0.1 }
  },
  
  emailTemplates: {
    applicationReceived: String,
    applicationRejected: String,
    interviewInvitation: String,
    interviewReminder: String,
    offerLetter: String,
    welcomeEmail: String
  },
  
  interviewSettings: {
    defaultDuration: { type: Number, default: 60 },
    bufferTime: { type: Number, default: 15 },
    availableSlots: [{
      dayOfWeek: Number,
      startTime: String,
      endTime: String
    }],
    reminderSchedule: {
      type: [Number],
      default: [24, 2] // 24 hours and 2 hours before
    }
  },
  
  offerSettings: {
    defaultExpiryDays: { type: Number, default: 7 },
    requireApprovals: { type: Boolean, default: true },
    approvalRoles: {
      type: [String],
      default: ['HR_MANAGER', 'DEPARTMENT_HEAD', 'CFO']
    },
    standardBenefits: {
      type: [String],
      default: [
        'Health Insurance',
        'Annual Leave (25 days)',
        'Professional Development',
        'Performance Bonus'
      ]
    },
    probationPeriod: {
      duration: { type: Number, default: 3 },
      unit: { type: String, enum: ['days', 'months'], default: 'months' }
    }
  },
  
  compliance: {
    dataRetentionDays: { type: Number, default: 365 },
    requireConsent: { type: Boolean, default: true },
    consentText: String,
    anonymizeAfterDays: { type: Number, default: 730 } // 2 years
  },
  
  integrations: {
    linkedinEnabled: { type: Boolean, default: false },
    indeedEnabled: { type: Boolean, default: false },
    emailProvider: { 
      type: String, 
      enum: ['smtp', 'sendgrid', 'ses'], 
      default: 'smtp' 
    },
    calendarProvider: { 
      type: String, 
      enum: ['google', 'outlook', 'caldav'] 
    },
    storageProvider: { 
      type: String, 
      enum: ['s3', 'gcs', 'azure', 'local'], 
      default: 'local' 
    }
  },
  
  notifications: {
    channels: {
      type: [String],
      enum: ['email', 'sms', 'whatsapp', 'in-app'],
      default: ['email', 'in-app']
    },
    newApplicationAlert: { type: Boolean, default: true },
    stageChangeAlert: { type: Boolean, default: true },
    interviewFeedbackAlert: { type: Boolean, default: true },
    offerStatusAlert: { type: Boolean, default: true }
  },
  
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  }
}, { 
  timestamps: true,
  collection: 'ats_settings'
});

// Methods
AtsSettingsSchema.methods.getEmailTemplate = function(templateName: string, variables: Record<string, any> = {}) {
  let template = this.emailTemplates[templateName] || '';
  
  // Replace variables in template
  Object.entries(variables).forEach(([key, value]) => {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  
  return template;
};

AtsSettingsSchema.methods.shouldAutoReject = function(candidate: any) {
  const rules = this.knockoutRules;
  
  // Check minimum experience
  if (rules.minExperience && candidate.experience < rules.minExperience) {
    return { reject: true, reason: 'Below minimum experience requirement' };
  }
  
  // Check maximum experience
  if (rules.maxExperience && candidate.experience > rules.maxExperience) {
    return { reject: true, reason: 'Exceeds maximum experience limit' };
  }
  
  // Check required skills
  if (rules.mustHaveSkills?.length) {
    const candidateSkills = candidate.skills.map((s: string) => s.toLowerCase());
    const missingSkills = rules.mustHaveSkills.filter(
      (skill: string) => !candidateSkills.includes(skill.toLowerCase())
    );
    
    if (missingSkills.length > 0) {
      return { 
        reject: true, 
        reason: `Missing required skills: ${missingSkills.join(', ')}` 
      };
    }
  }
  
  return { reject: false };
};

// Static methods
interface AtsSettingsModel extends Model<IAtsSettings> {
  findOrCreateForOrg(orgId: string): Promise<IAtsSettings>;
}

AtsSettingsSchema.statics.findOrCreateForOrg = async function(this: any, orgId: string) {
  let settings = await this.findOne({ orgId });
  if (!settings) {
    settings = await this.create({ orgId });
  }
  return settings;
};

export const AtsSettings = (models.ATS_Settings as unknown as AtsSettingsModel) || model<IAtsSettings, AtsSettingsModel>('ATS_Settings', AtsSettingsSchema);
