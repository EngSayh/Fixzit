import { Schema, model, models, Document } from 'mongoose';

export interface IAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  at: Date;
}

export interface IAIConversation extends Document {
  orgId: string;
  userId?: string;
  sessionId?: string;
  topic?: string;
  messages: IAIMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IAIMessage>({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  at: { type: Date, default: Date.now }
}, { _id: false });

const AIConversationSchema = new Schema<IAIConversation>({
  orgId: { type: String, required: true, index: true },
  userId: { type: String, index: true },
  sessionId: { type: String, index: true },
  topic: { type: String },
  messages: { type: [MessageSchema], default: [] }
}, { timestamps: true, collection: 'ai_conversations' });

AIConversationSchema.index({ orgId: 1, userId: 1, createdAt: -1 });

export const AIConversation = models.AIConversation || model<IAIConversation>('AIConversation', AIConversationSchema);


