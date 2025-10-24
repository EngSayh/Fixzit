import { Schema, model, models, Types } from 'mongoose';

export type ViewingStatus = 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type ViewingType = 'IN_PERSON' | 'VIRTUAL' | 'VIDEO_CALL';

export interface ViewingParticipant {
  userId?: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  relationship?: 'SELF' | 'SPOUSE' | 'FAMILY' | 'AGENT' | 'INVESTOR';
}

export interface ViewingFeedback {
  rating?: number; // 1-5
  comments?: string;
  interested: boolean;
  followUpRequested: boolean;
  submittedAt?: Date;
}

export interface ViewingRequest {
  _id: Types.ObjectId;
  propertyId: Types.ObjectId;
  agentId: Types.ObjectId;
  requesterId: Types.ObjectId; // User who requested
  
  // Scheduling
  preferredDate: Date;
  preferredTime: string; // "10:00", "14:30"
  alternativeDates?: Array<{
    date: Date;
    time: string;
  }>;
  confirmedDate?: Date;
  confirmedTime?: string;
  duration: number; // minutes
  
  // Type
  viewingType: ViewingType;
  virtualMeetingLink?: string;
  
  // Participants
  participants: ViewingParticipant[];
  
  // Status
  status: ViewingStatus;
  statusHistory: Array<{
    status: ViewingStatus;
    timestamp: Date;
    changedBy: Types.ObjectId;
    reason?: string;
  }>;
  
  // Communication
  specialRequests?: string;
  agentNotes?: string;
  internalNotes?: string;
  
  // Feedback
  feedback?: ViewingFeedback;
  
  // Notifications
  reminderSent: boolean;
  confirmationSent: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const ViewingRequestSchema = new Schema<ViewingRequest>(
  {
    propertyId: { type: Schema.Types.ObjectId, required: true, ref: 'PropertyListing', index: true },
    agentId: { type: Schema.Types.ObjectId, required: true, ref: 'RealEstateAgent', index: true },
    requesterId: { type: Schema.Types.ObjectId, required: true, index: true },
    
    preferredDate: { type: Date, required: true, index: true },
    preferredTime: { type: String, required: true },
    alternativeDates: [{
      date: Date,
      time: String
    }],
    confirmedDate: Date,
    confirmedTime: String,
    duration: { type: Number, default: 30 }, // 30 minutes default
    
    viewingType: {
      type: String,
      enum: ['IN_PERSON', 'VIRTUAL', 'VIDEO_CALL'],
      default: 'IN_PERSON'
    },
    virtualMeetingLink: String,
    
    participants: [{
      userId: Schema.Types.ObjectId,
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      relationship: {
        type: String,
        enum: ['SELF', 'SPOUSE', 'FAMILY', 'AGENT', 'INVESTOR']
      }
    }],
    
    status: {
      type: String,
      enum: ['REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
      default: 'REQUESTED',
      index: true
    },
    statusHistory: [{
      status: {
        type: String,
        enum: ['REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']
      },
      timestamp: { type: Date, default: Date.now },
      changedBy: Schema.Types.ObjectId,
      reason: String
    }],
    
    specialRequests: String,
    agentNotes: String,
    internalNotes: String,
    
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comments: String,
      interested: { type: Boolean, default: false },
      followUpRequested: { type: Boolean, default: false },
      submittedAt: Date
    },
    
    reminderSent: { type: Boolean, default: false },
    confirmationSent: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    collection: 'aqar_viewing_requests'
  }
);

// Indexes
ViewingRequestSchema.index({ propertyId: 1, status: 1 });
ViewingRequestSchema.index({ agentId: 1, status: 1, preferredDate: 1 });
ViewingRequestSchema.index({ requesterId: 1, createdAt: -1 });
ViewingRequestSchema.index({ confirmedDate: 1, status: 1 });

const ViewingRequest = models.ViewingRequest || model<ViewingRequest>('ViewingRequest', ViewingRequestSchema);

export default ViewingRequest;
