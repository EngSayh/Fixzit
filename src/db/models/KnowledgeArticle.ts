import mongoose, { Schema, Document } from 'mongoose';
import { KnowledgeArticle as IKnowledgeArticle } from '@/src/types/kb';

export interface KnowledgeArticleDoc extends Omit<IKnowledgeArticle, '_id'>, Document {}

const sourceSchema = new Schema({
  type: {
    type: String,
    enum: ['db', 'code', 'admin', 'verification'],
    required: true
  },
  ref: {
    type: String,
    required: true
  }
}, { _id: false });

const knowledgeArticleSchema = new Schema<KnowledgeArticleDoc>({
  orgId: {
    type: String,
    required: true,
    index: true
  },
  lang: {
    type: String,
    enum: ['ar', 'en'],
    required: true,
    index: true
  },
  roleScopes: [{
    type: String,
    enum: ['ADMIN', 'TENANT_ADMIN', 'EMPLOYEE', 'TECHNICIAN', 'PROPERTY_MANAGER', 'TENANT', 'VENDOR', 'GUEST'],
    required: true
  }],
  module: {
    type: String,
    required: true,
    index: true
  },
  route: {
    type: String,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    index: true
  },
  contentMDX: {
    type: String,
    required: true
  },
  tags: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['DRAFT', 'REVIEW', 'PUBLISHED'],
    default: 'DRAFT',
    index: true
  },
  version: {
    type: Number,
    default: 1
  },
  sources: [sourceSchema],
  createdBy: String,
  updatedBy: String,
  updatedAt: {
    type: String,
    default: () => new Date().toISOString()
  }
}, {
  timestamps: true,
  collection: 'knowledge_articles'
});

// Compound indexes for efficient queries
knowledgeArticleSchema.index({ orgId: 1, lang: 1, status: 1 });
knowledgeArticleSchema.index({ orgId: 1, slug: 1, lang: 1 }, { unique: true });
knowledgeArticleSchema.index({ module: 1, status: 1 });
knowledgeArticleSchema.index({ tags: 1 });

// Virtual for full-text search
knowledgeArticleSchema.index({ title: 'text', contentMDX: 'text', tags: 'text' });

export const KnowledgeArticle = mongoose.models.KnowledgeArticle || 
  mongoose.model<KnowledgeArticleDoc>('KnowledgeArticle', knowledgeArticleSchema);
