import { Schema, model, models, Document, Types } from 'mongoose';

export interface IInterview extends Document {
  orgId: string;
  applicationId: Types.ObjectId;
  jobId: Types.ObjectId;
  candidateId: Types.ObjectId;
  type: 'phone' | 'video' | 'onsite' | 'technical' | 'behavioral' | 'panel';
  scheduledAt: Date;
  duration: number; // minutes
  location?: string;
  meetingLink?: string;
  panel: Array<{
    userId: string;
    name: string;
    role: string;
    isRequired: boolean;
  }>;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  outcome?: 'advance' | 'hold' | 'reject' | 'offer';
  feedback: Array<{
    userId: string;
    rating: number;
    strengths: string[];
    improvements: string[];
    notes: string;
    recommendation: 'strong-yes' | 'yes' | 'neutral' | 'no' | 'strong-no';
    submittedAt: Date;
  }>;
  reminders: Array<{
    type: 'email' | 'sms' | 'calendar';
    sentAt: Date;
    sentTo: string[];
  }>;
  attachments: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PanelMemberSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  isRequired: { type: Boolean, default: true }
}, { _id: false });

const FeedbackSchema = new Schema({
  userId: { type: String, required: true },
  rating: { 
    type: Number, 
    min: 1, 
    max: 5, 
    required: true 
  },
  strengths: [String],
  improvements: [String],
  notes: { type: String, required: true },
  recommendation: { 
    type: String, 
    enum: ['strong-yes', 'yes', 'neutral', 'no', 'strong-no'],
    required: true
  },
  submittedAt: { type: Date, default: Date.now }
}, { _id: true });

const InterviewSchema = new Schema<IInterview>({
  orgId: { 
    type: String, 
    required: true, 
    index: true 
  },
  applicationId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ATS_Application', 
    required: true, 
    index: true 
  },
  jobId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ATS_Job', 
    required: true, 
    index: true 
  },
  candidateId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ATS_Candidate', 
    required: true, 
    index: true 
  },
  type: { 
    type: String, 
    enum: ['phone', 'video', 'onsite', 'technical', 'behavioral', 'panel'], 
    default: 'phone' 
  },
  scheduledAt: { 
    type: Date, 
    required: true,
    index: true
  },
  duration: { 
    type: Number, 
    default: 60 
  },
  location: String,
  meetingLink: String,
  panel: [PanelMemberSchema],
  status: { 
    type: String, 
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'], 
    default: 'scheduled',
    index: true
  },
  outcome: { 
    type: String, 
    enum: ['advance', 'hold', 'reject', 'offer'] 
  },
  feedback: [FeedbackSchema],
  reminders: [{
    type: { 
      type: String, 
      enum: ['email', 'sms', 'calendar'] 
    },
    sentAt: Date,
    sentTo: [String]
  }],
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  }
}, { 
  timestamps: true,
  collection: 'ats_interviews'
});

// Indexes
InterviewSchema.index({ scheduledAt: 1, status: 1 });
InterviewSchema.index({ 'panel.userId': 1, scheduledAt: 1 });

// Methods
InterviewSchema.methods.confirm = async function() {
  this.status = 'confirmed';
  return this.save();
};

InterviewSchema.methods.cancel = async function(reason?: string) {
  this.status = 'cancelled';
  if (reason && this.metadata) {
    this.metadata.set('cancellationReason', reason);
  }
  return this.save();
};

InterviewSchema.methods.complete = async function(outcome?: string) {
  this.status = 'completed';
  if (outcome) {
    this.outcome = outcome as any;
  }
  return this.save();
};

InterviewSchema.methods.addFeedback = async function(feedbackData: any) {
  // Check if user already submitted feedback
  const existingIndex = this.feedback.findIndex((f: any) => f.userId === feedbackData.userId);
  
  if (existingIndex >= 0) {
    this.feedback[existingIndex] = { ...feedbackData, submittedAt: new Date() };
  } else {
    this.feedback.push({ ...feedbackData, submittedAt: new Date() });
  }
  
  return this.save();
};

InterviewSchema.methods.getAverageRating = function() {
  if (this.feedback.length === 0) return 0;
  
  const sum = this.feedback.reduce((acc: number, f: any) => acc + f.rating, 0);
  return sum / this.feedback.length;
};

InterviewSchema.methods.getRecommendationSummary = function() {
  const summary: Record<'strong-yes'|'yes'|'neutral'|'no'|'strong-no', number> = {
    'strong-yes': 0,
    'yes': 0,
    'neutral': 0,
    'no': 0,
    'strong-no': 0
  };
  
  this.feedback.forEach((f: any) => {
    const key = (f.recommendation as 'strong-yes'|'yes'|'neutral'|'no'|'strong-no');
    summary[key] = (summary[key] ?? 0) + 1;
  });
  
  return summary;
};

// Static methods
InterviewSchema.statics.findUpcoming = function(orgId: string, userId?: string) {
  const query: any = {
    orgId,
    scheduledAt: { $gte: new Date() },
    status: { $in: ['scheduled', 'confirmed'] }
  };
  
  if (userId) {
    query['panel.userId'] = userId;
  }
  
  return this.find(query)
    .populate('applicationId')
    .populate('candidateId')
    .populate('jobId')
    .sort({ scheduledAt: 1 });
};

InterviewSchema.statics.findByDateRange = function(orgId: string, startDate: Date, endDate: Date) {
  return this.find({
    orgId,
    scheduledAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ scheduledAt: 1 });
};

export const Interview = models.ATS_Interview || model<IInterview>('ATS_Interview', InterviewSchema);
