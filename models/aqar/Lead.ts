/**
 * Aqar Souq - Lead Model
 * 
 * Property inquiry leads for CRM integration
 * Links to Fixzit CRM module
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export enum LeadStatus {
  NEW = 'NEW',                   // Fresh inquiry
  CONTACTED = 'CONTACTED',       // Agent reached out
  QUALIFIED = 'QUALIFIED',       // Genuine interest
  VIEWING = 'VIEWING',           // Scheduled property viewing
  NEGOTIATING = 'NEGOTIATING',   // In negotiation
  WON = 'WON',                   // Deal closed
  LOST = 'LOST',                 // Deal lost
  SPAM = 'SPAM',                 // Marked as spam
}

export enum LeadIntent {
  BUY = 'BUY',
  RENT = 'RENT',
  DAILY = 'DAILY',
}

export enum LeadSource {
  LISTING_INQUIRY = 'LISTING_INQUIRY',       // From listing detail page
  PROJECT_INQUIRY = 'PROJECT_INQUIRY',       // From project page
  PHONE_CALL = 'PHONE_CALL',                 // Phone inquiry
  WHATSAPP = 'WHATSAPP',                     // WhatsApp inquiry
  EMAIL = 'EMAIL',                           // Email inquiry
  WALK_IN = 'WALK_IN',                       // Walk-in to office
}

export interface ILead extends Document {
  // Organization
  orgId: mongoose.Types.ObjectId;
  
  // Source
  listingId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  source: LeadSource;
  
  // Inquirer (potential client)
  inquirerId?: mongoose.Types.ObjectId;    // User ID if logged in
  inquirerName: string;
  inquirerPhone: string;
  inquirerEmail?: string;
  inquirerNationalId?: string;             // If Nafath verified
  
  // Owner/Agent (recipient)
  recipientId: mongoose.Types.ObjectId;
  
  // Intent
  intent: LeadIntent;
  message?: string;
  
  // Status & assignment
  status: LeadStatus;
  assignedTo?: mongoose.Types.ObjectId;    // Agent/salesperson
  assignedAt?: Date;
  
  // Follow-up
  notes: Array<{
    authorId: mongoose.Types.ObjectId;
    content: string;
    createdAt: Date;
  }>;
  
  // Viewing
  viewingScheduledAt?: Date;
  viewingCompletedAt?: Date;
  
  // Outcome
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId;
  lostReason?: string;
  
  // Integration
  crmContactId?: mongoose.Types.ObjectId;   // Link to CRM Contact
  crmDealId?: mongoose.Types.ObjectId;      // Link to CRM Deal
  
  // Instance methods
  addNote(authorId: mongoose.Types.ObjectId, content: string): Promise<void>;
  assign(agentId: mongoose.Types.ObjectId): Promise<void>;
  scheduleViewing(dateTime: Date): Promise<void>;
  completeViewing(): Promise<void>;
  markAsWon(userId: mongoose.Types.ObjectId): Promise<void>;
  markAsLost(userId: mongoose.Types.ObjectId, reason?: string): Promise<void>;
  markAsSpam(): Promise<void>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    
    listingId: { type: Schema.Types.ObjectId, ref: 'AqarListing', index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'AqarProject', index: true },
    source: {
      type: String,
      enum: Object.values(LeadSource),
      required: true,
      index: true,
    },
    
    inquirerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    inquirerName: { type: String, required: true, maxlength: 200 },
    inquirerPhone: { type: String, required: true },
    inquirerEmail: { type: String, maxlength: 200 },
    inquirerNationalId: { type: String },
    
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    
    intent: {
      type: String,
      enum: Object.values(LeadIntent),
      required: true,
      index: true,
    },
    message: { type: String, maxlength: 2000 },
    
    status: {
      type: String,
      enum: Object.values(LeadStatus),
      default: LeadStatus.NEW,
      required: true,
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedAt: { type: Date },
    
    notes: [
      {
        authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true, maxlength: 2000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    
    viewingScheduledAt: { type: Date },
    viewingCompletedAt: { type: Date },
    
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lostReason: { type: String, maxlength: 500 },
    
    crmContactId: { type: Schema.Types.ObjectId, ref: 'Contact' },
    crmDealId: { type: Schema.Types.ObjectId, ref: 'Deal' },
  },
  {
    timestamps: true,
    collection: 'aqar_leads',
  }
);

// Indexes
LeadSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
LeadSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
LeadSchema.index({ inquirerPhone: 1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ orgId: 1, status: 1, createdAt: -1 });

// Methods
LeadSchema.methods.addNote = async function (
  this: ILead,
  authorId: mongoose.Types.ObjectId,
  content: string
) {
  // Use atomic $push to prevent race conditions when multiple agents add notes simultaneously
  await mongoose.model('AqarLead').findByIdAndUpdate(
    this._id,
    {
      $push: {
        notes: {
          authorId,
          content,
          createdAt: new Date(),
        },
      },
    }
  );
  // Reload the document from DB with populated notes to get fresh data
  // (this.populate() won't show the new note because this instance is stale)
  const updated = await mongoose.model('AqarLead').findById(this._id).populate('notes.authorId');
  if (updated) {
    this.notes = (updated as ILead).notes;
  }
};

LeadSchema.methods.assign = async function (
  this: ILead,
  agentId: mongoose.Types.ObjectId
) {
  // Atomic update with terminal state filter to prevent race conditions
  const result = await mongoose.model('AqarLead').findOneAndUpdate(
    {
      _id: this._id,
      status: { $nin: [LeadStatus.WON, LeadStatus.LOST, LeadStatus.SPAM] }
    },
    [
      {
        $set: {
          assignedTo: agentId,
          assignedAt: new Date(),
          status: {
            $cond: [
              { $eq: ['$status', LeadStatus.NEW] },
              LeadStatus.CONTACTED,
              '$status'
            ]
          }
        }
      }
    ],
    { new: true }
  );
  
  if (!result) {
    throw new Error(`Cannot reassign lead in terminal state`);
  }
  
  // Update in-memory instance
  this.assignedTo = (result as ILead).assignedTo;
  this.assignedAt = (result as ILead).assignedAt;
  this.status = (result as ILead).status;
};

LeadSchema.methods.scheduleViewing = async function (this: ILead, dateTime: Date) {
  // Terminal states (WON, LOST, SPAM) are immutable
  const terminalStates = [LeadStatus.WON, LeadStatus.LOST, LeadStatus.SPAM];
  if (terminalStates.includes(this.status)) {
    throw new Error(`Cannot schedule viewing for lead in terminal state: ${this.status}`);
  }
  // Don't regress from NEGOTIATING
  if (this.status === LeadStatus.NEGOTIATING) {
    throw new Error(`Cannot schedule viewing for lead already in NEGOTIATING status`);
  }
  
  // Use atomic update to prevent race conditions
  await mongoose.model('AqarLead').findByIdAndUpdate(
    this._id,
    {
      $set: {
        viewingScheduledAt: dateTime,
        status: LeadStatus.VIEWING,
      },
    }
  );
};

LeadSchema.methods.completeViewing = async function (this: ILead) {
  if (!this.viewingScheduledAt) {
    throw new Error('No viewing scheduled');
  }
  // Terminal states (WON, LOST, SPAM) are immutable
  const terminalStates = [LeadStatus.WON, LeadStatus.LOST, LeadStatus.SPAM];
  if (terminalStates.includes(this.status)) {
    throw new Error(`Cannot complete viewing for lead in terminal state: ${this.status}`);
  }
  
  // Use atomic update to prevent race conditions
  await mongoose.model('AqarLead').findByIdAndUpdate(
    this._id,
    {
      $set: {
        viewingCompletedAt: new Date(),
        status: LeadStatus.NEGOTIATING,
      },
    }
  );
};

LeadSchema.methods.markAsWon = async function (
  this: ILead,
  userId: mongoose.Types.ObjectId
) {
  // Terminal state guard: WON is immutable once set
  if (this.status === LeadStatus.WON) {
    throw new Error('Lead already marked as WON');
  }
  // Prevent transitions from other terminal states
  if (this.status === LeadStatus.LOST || this.status === LeadStatus.SPAM) {
    throw new Error(`Cannot mark lead as WON from terminal state: ${this.status}`);
  }
  
  // Use atomic update to prevent race conditions (avoids lost updates from concurrent markAsWon calls)
  const result = await mongoose.model('AqarLead').findOneAndUpdate(
    {
      _id: this._id,
      status: { $nin: [LeadStatus.WON, LeadStatus.LOST, LeadStatus.SPAM] }
    },
    {
      $set: {
        status: LeadStatus.WON,
        closedAt: new Date(),
        closedBy: userId,
      }
    },
    { new: true }
  );
  
  if (!result) {
    throw new Error('Cannot mark lead as WON - invalid state or concurrent modification');
  }
  
  // Update in-memory instance
  this.status = (result as ILead).status;
  this.closedAt = (result as ILead).closedAt;
  this.closedBy = (result as ILead).closedBy;
};

LeadSchema.methods.markAsLost = async function (
  this: ILead,
  userId: mongoose.Types.ObjectId,
  reason?: string
) {
  // Terminal state guard: LOST is immutable once set
  if (this.status === LeadStatus.LOST) {
    throw new Error('Lead already marked as LOST');
  }
  // Prevent transitions from other terminal states
  if (this.status === LeadStatus.WON || this.status === LeadStatus.SPAM) {
    throw new Error(`Cannot mark lead as LOST from terminal state: ${this.status}`);
  }
  
  // Use atomic update to prevent race conditions
  const result = await mongoose.model('AqarLead').findOneAndUpdate(
    {
      _id: this._id,
      status: { $nin: [LeadStatus.WON, LeadStatus.LOST, LeadStatus.SPAM] }
    },
    {
      $set: {
        status: LeadStatus.LOST,
        closedAt: new Date(),
        closedBy: userId,
        lostReason: reason,
      }
    },
    { new: true }
  );
  
  if (!result) {
    throw new Error('Cannot mark lead as LOST - invalid state or concurrent modification');
  }
  
  // Update in-memory instance
  this.status = (result as ILead).status;
  this.closedAt = (result as ILead).closedAt;
  this.closedBy = (result as ILead).closedBy;
  this.lostReason = (result as ILead).lostReason;
};

LeadSchema.methods.markAsSpam = async function (this: ILead) {
  // Terminal state guard: SPAM is immutable once set
  if (this.status === LeadStatus.SPAM) {
    throw new Error('Lead already marked as SPAM');
  }
  // Prevent transitions from WON/LOST (once a lead is WON or LOST, it cannot be marked as spam)
  if (this.status === LeadStatus.WON || this.status === LeadStatus.LOST) {
    throw new Error(`Cannot mark lead as SPAM from terminal state: ${this.status}`);
  }
  
  // Use atomic update to prevent race conditions
  const result = await mongoose.model('AqarLead').findOneAndUpdate(
    {
      _id: this._id,
      status: { $nin: [LeadStatus.WON, LeadStatus.LOST, LeadStatus.SPAM] }
    },
    {
      $set: {
        status: LeadStatus.SPAM,
      }
    },
    { new: true }
  );
  
  if (!result) {
    throw new Error('Cannot mark lead as SPAM - invalid state or concurrent modification');
  }
  
  // Update in-memory instance
  this.status = (result as ILead).status;
};

const Lead: Model<ILead> =
  mongoose.models.AqarLead || mongoose.model<ILead>('AqarLead', LeadSchema);

export default Lead;
