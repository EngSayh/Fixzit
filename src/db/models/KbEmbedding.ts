import mongoose, { Schema, Document } from 'mongoose';
import { KbEmbedding as IKbEmbedding } from '@/src/types/kb';

export interface KbEmbeddingDoc extends Omit<IKbEmbedding, '_id'>, Document {}

const kbEmbeddingSchema = new Schema<KbEmbeddingDoc>({
  articleId: {
    type: String,
    required: true,
    index: true
  },
  chunkId: {
    type: String,
    required: true
  },
  lang: {
    type: String,
    enum: ['ar', 'en'],
    required: true,
    index: true
  },
  orgId: {
    type: String,
    required: true,
    index: true
  },
  roleScopes: [{
    type: String,
    enum: ['ADMIN', 'TENANT_ADMIN', 'EMPLOYEE', 'TECHNICIAN', 'PROPERTY_MANAGER', 'TENANT', 'VENDOR', 'GUEST'],
    required: true
  }],
  route: {
    type: String,
    index: true
  },
  text: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number],
    required: true
  },
  dims: {
    type: Number,
    required: true,
    enum: [1536, 3072] // OpenAI embedding dimensions
  },
  provider: {
    type: String,
    enum: ['openai'],
    default: 'openai'
  },
  updatedAt: {
    type: String,
    default: () => new Date().toISOString()
  }
}, {
  timestamps: true,
  collection: 'kb_embeddings'
});

// Compound indexes for vector search filtering
kbEmbeddingSchema.index({ orgId: 1, lang: 1, roleScopes: 1 });
kbEmbeddingSchema.index({ articleId: 1, chunkId: 1 }, { unique: true });
kbEmbeddingSchema.index({ route: 1 });

export const KbEmbedding = mongoose.models.KbEmbedding || 
  mongoose.model<KbEmbeddingDoc>('KbEmbedding', kbEmbeddingSchema);
