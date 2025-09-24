import mongoose, { Document, Schema } from 'mongoose';

export interface IAtsSettings extends Document {
  _id: string;
  organizationId: string;
  scoring: {
    skillMatchWeight: number;
    experienceWeight: number;
    educationWeight: number;
    keywordWeight: number;
    minPassingScore: number;
  };
  workflows: {
    autoScreening: boolean;
    requireManagerApproval: boolean;
    sendAutoRejection: boolean;
    interviewScheduling: boolean;
  };
  integrations: {
    linkedin: {
      enabled: boolean;
      apiKey?: string;
      autoPost: boolean;
    };
    indeed: {
      enabled: boolean;
      apiKey?: string;
      autoPost: boolean;
    };
    email: {
      provider: 'sendgrid' | 'ses' | 'smtp';
      configuration: Record<string, any>;
    };
  };
  notifications: {
    newApplication: {
      enabled: boolean;
      recipients: string[];
    };
    statusChange: {
      enabled: boolean;
      notifyCandidate: boolean;
    };
    deadlineReminders: {
      enabled: boolean;
      daysBefore: number;
    };
  };
  customFields: Array<{
    name: string;
    type: 'text' | 'number' | 'date' | 'select' | 'multiselect';
    required: boolean;
    options?: string[];
  }>;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const AtsSettingsSchema = new Schema<IAtsSettings>(
  {
    organizationId: { type: String, required: true, unique: true, trim: true },
    scoring: {
      skillMatchWeight: { type: Number, default: 30, min: 0, max: 100 },
      experienceWeight: { type: Number, default: 25, min: 0, max: 100 },
      educationWeight: { type: Number, default: 20, min: 0, max: 100 },
      keywordWeight: { type: Number, default: 25, min: 0, max: 100 },
      minPassingScore: { type: Number, default: 60, min: 0, max: 100 }
    },
    workflows: {
      autoScreening: { type: Boolean, default: true },
      requireManagerApproval: { type: Boolean, default: false },
      sendAutoRejection: { type: Boolean, default: false },
      interviewScheduling: { type: Boolean, default: false }
    },
    integrations: {
      linkedin: {
        enabled: { type: Boolean, default: false },
        apiKey: { type: String, trim: true },
        autoPost: { type: Boolean, default: false }
      },
      indeed: {
        enabled: { type: Boolean, default: false },
        apiKey: { type: String, trim: true },
        autoPost: { type: Boolean, default: false }
      },
      email: {
        provider: { 
          type: String, 
          enum: ['sendgrid', 'ses', 'smtp'],
          default: 'smtp'
        },
        configuration: { type: Schema.Types.Mixed, default: {} }
      }
    },
    notifications: {
      newApplication: {
        enabled: { type: Boolean, default: true },
        recipients: [{ type: String, trim: true }]
      },
      statusChange: {
        enabled: { type: Boolean, default: true },
        notifyCandidate: { type: Boolean, default: true }
      },
      deadlineReminders: {
        enabled: { type: Boolean, default: true },
        daysBefore: { type: Number, default: 7, min: 1 }
      }
    },
    customFields: [{
      name: { type: String, required: true, trim: true },
      type: { 
        type: String, 
        enum: ['text', 'number', 'date', 'select', 'multiselect'],
        required: true
      },
      required: { type: Boolean, default: false },
      options: [{ type: String, trim: true }]
    }],
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true, trim: true }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Validate scoring weights sum to 100
AtsSettingsSchema.pre('save', function(next) {
  const total = this.scoring.skillMatchWeight + 
                this.scoring.experienceWeight + 
                this.scoring.educationWeight + 
                this.scoring.keywordWeight;
  
  if (total !== 100) {
    next(new Error('Scoring weights must sum to 100'));
  }
  next();
});

// Add indexes for performance
AtsSettingsSchema.index({ organizationId: 1 });
AtsSettingsSchema.index({ isActive: 1 });

export const AtsSettings = mongoose.models.AtsSettings || mongoose.model<IAtsSettings>('AtsSettings', AtsSettingsSchema);