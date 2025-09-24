import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface IKbChangeEvent {
  orgId: string;
  collection: string;
  documentId: string;
  operation: 'insert' | 'update' | 'delete';
  changes: any;
  articlesSuggested?: string[];
  processedAt?: string;
  metadata?: Record<string, any>;
}

export type KbChangeEventDoc = Document;

const kbChangeEventSchema = new Schema<any>({
  orgId: {
    type: String,
    required: true,
    index: true
  },
  collection: {
    type: String,
    required: true,
    index: true
  },
  documentId: {
    type: String,
    required: true
  },
  operation: {
    type: String,
    enum: ['insert', 'update', 'delete'],
    required: true
  },
  changes: {
    type: Schema.Types.Mixed,
    required: true
  },
  articlesSuggested: [{
    type: String
  }],
  processedAt: String,
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true,
  collection: 'kb_change_events'
});

// Indexes for efficient querying
kbChangeEventSchema.index({ orgId: 1, collection: 1, createdAt: -1 });
kbChangeEventSchema.index({ processedAt: 1 });

export const KbChangeEvent = models.KbChangeEvent || 
  model<KbChangeEventDoc>('KbChangeEvent', kbChangeEventSchema);
