import { Schema, model, models, Document, Types, Model } from 'mongoose';

export interface IApplication extends Document {
  orgId: string;
  jobId: Types.ObjectId;
  candidateId: Types.ObjectId;
  stage: 'applied' | 'screened' | 'interview' | 'offer' | 'hired' | 'rejected';
  score: number;
  source: string;
  flags: string[];
  candidateSnapshot: {
    fullName: string;
    email: string;
    phone: string;
    location?: string;
    skills: string[];
    experience: number;
    resumeUrl?: string;
  };
  answers: Array<{
    question: string;
    answer: string;
  }>;
  coverLetter?: string;
  attachments: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  interviews: Array<{
    scheduledAt: Date;
    duration: number;
    mode: 'onsite' | 'video' | 'phone';
    location?: string;
    interviewers: string[];
    status: 'scheduled' | 'completed' | 'no-show' | 'cancelled';
    feedback?: string;
    rating?: number;
  }>;
  notes: Array<{
    author: string;
    text: string;
    createdAt: Date;
    isPrivate: boolean;
  }>;
  history: Array<{
    action: string;
    by: string;
    at: Date;
    details?: string;
  }>;
  reviewers: string[];
  duplicateOf?: Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema({
  scheduledAt: { type: Date, required: true },
  duration: { type: Number, default: 60 }, // minutes
  mode: { 
    type: String, 
    enum: ['onsite', 'video', 'phone'], 
    default: 'video' 
  },
  location: String,
  interviewers: [String],
  status: { 
    type: String, 
    enum: ['scheduled', 'completed', 'no-show', 'cancelled'], 
    default: 'scheduled' 
  },
  feedback: String,
  rating: { 
    type: Number, 
    min: 1, 
    max: 5 
  }
}, { _id: true, timestamps: true });

const NoteSchema = new Schema({
  author: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isPrivate: { type: Boolean, default: false }
}, { _id: true });

const ApplicationSchema = new Schema<IApplication>({
  orgId: { 
    type: String, 
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
  stage: { 
    type: String, 
    enum: ['applied', 'screened', 'interview', 'offer', 'hired', 'rejected'], 
    default: 'applied', 
    index: true 
  },
  score: { 
    type: Number, 
    default: 0, 
    index: true 
  },
  source: { 
    type: String, 
    default: 'careers' 
  },
  flags: [String],
  candidateSnapshot: {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    location: String,
    skills: [String],
    experience: { type: Number, default: 0 },
    resumeUrl: String
  },
  answers: [{
    question: String,
    answer: String
  }],
  coverLetter: String,
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  interviews: [InterviewSchema],
  notes: [NoteSchema],
  history: [{
    action: String,
    by: String,
    at: { type: Date, default: Date.now },
    details: String
  }],
  reviewers: [String],
  duplicateOf: { 
    type: Schema.Types.ObjectId, 
    ref: 'ATS_Application' 
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  }
}, { 
  timestamps: true,
  collection: 'ats_applications'
});

// Indexes
ApplicationSchema.index({ orgId: 1, stage: 1, score: -1 });
ApplicationSchema.index({ orgId: 1, jobId: 1, candidateId: 1 }, { unique: true });
ApplicationSchema.index({ createdAt: -1 });

// Methods
ApplicationSchema.methods.addNote = async function(author: string, text: string, isPrivate = false) {
  this.notes.push({ author, text, createdAt: new Date(), isPrivate });
  return this.save();
};

ApplicationSchema.methods.changeStage = async function(newStage: string, changedBy: string, reason?: string) {
  const oldStage = this.stage;
  this.stage = newStage as any;
  
  this.history.push({
    action: `stage_change:${oldStage}->${newStage}`,
    by: changedBy,
    at: new Date(),
    details: reason
  });
  
  return this.save();
};

ApplicationSchema.methods.scheduleInterview = async function(interviewData: any) {
  this.interviews.push(interviewData);
  
  this.history.push({
    action: 'interview_scheduled',
    by: interviewData.scheduledBy || 'system',
    at: new Date(),
    details: `${interviewData.mode} interview on ${interviewData.scheduledAt}`
  });
  
  return this.save();
};

ApplicationSchema.methods.updateScore = async function(newScore: number, updatedBy: string) {
  const oldScore = this.score;
  this.score = newScore;
  
  this.history.push({
    action: 'score_updated',
    by: updatedBy,
    at: new Date(),
    details: `Score changed from ${oldScore} to ${newScore}`
  });
  
  return this.save();
};

// Static methods
ApplicationSchema.statics.findByJob = function(orgId: string, jobId: string) {
  return this.find({ orgId, jobId })
    .populate('candidateId')
    .sort({ score: -1, createdAt: -1 });
};

ApplicationSchema.statics.findByCandidate = function(orgId: string, candidateId: string) {
  return this.find({ orgId, candidateId })
    .populate('jobId')
    .sort({ createdAt: -1 });
};

ApplicationSchema.statics.findDuplicates = async function(orgId: string, jobId: string, candidateEmail: string) {
  return this.find({ 
    orgId, 
    jobId,
    'candidateSnapshot.email': candidateEmail 
  });
};

ApplicationSchema.statics.getStageStats = async function(orgId: string, jobId?: string) {
  const match: any = { orgId };
  if (jobId) match.jobId = jobId;
  
  return this.aggregate([
    { $match: match },
    { 
      $group: {
        _id: '$stage',
        count: { $sum: 1 },
        avgScore: { $avg: '$score' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Extend Model type with our statics for TypeScript
interface ApplicationModel extends Model<IApplication> {
  findByJob(orgId: string, jobId: string): Promise<any>;
  findByCandidate(orgId: string, candidateId: string): Promise<any>;
  findDuplicates(orgId: string, jobId: string, candidateEmail: string): Promise<any>;
  getStageStats(orgId: string, jobId?: string): Promise<Array<{ _id: string; count: number; avgScore: number }>>;
}

export const Application: ApplicationModel = (models.ATS_Application as unknown as ApplicationModel) || model<IApplication, ApplicationModel>('ATS_Application', ApplicationSchema);
