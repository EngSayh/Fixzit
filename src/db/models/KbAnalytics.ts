import mongoose, { Schema, Document } from 'mongoose';

export interface IKbAnalytics {
  orgId: string;
  articleId?: string;
  searchQuery?: string;
  action: 'view' | 'search' | 'helpful' | 'not_helpful' | 'copy' | 'share';
  userId?: string;
  userRole?: string;
  metadata?: {
    searchResults?: number;
    timeOnPage?: number;
    scrollDepth?: number;
    device?: string;
    locale?: string;
  };
  timestamp: Date;
}

export interface KbAnalyticsDoc extends IKbAnalytics, Document {}

const kbAnalyticsSchema = new Schema<KbAnalyticsDoc>({
  orgId: {
    type: String,
    required: true,
    index: true
  },
  articleId: {
    type: String,
    index: true
  },
  searchQuery: {
    type: String,
    index: true
  },
  action: {
    type: String,
    enum: ['view', 'search', 'helpful', 'not_helpful', 'copy', 'share'],
    required: true,
    index: true
  },
  userId: String,
  userRole: String,
  metadata: {
    searchResults: Number,
    timeOnPage: Number,
    scrollDepth: Number,
    device: String,
    locale: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false,
  collection: 'kb_analytics'
});

// Indexes for analytics queries
kbAnalyticsSchema.index({ orgId: 1, timestamp: -1 });
kbAnalyticsSchema.index({ orgId: 1, action: 1, timestamp: -1 });
kbAnalyticsSchema.index({ articleId: 1, action: 1 });
kbAnalyticsSchema.index({ searchQuery: 'text' });

// TTL index to auto-delete old analytics after 90 days
kbAnalyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const KbAnalytics = mongoose.models.KbAnalytics || 
  mongoose.model<KbAnalyticsDoc>('KbAnalytics', kbAnalyticsSchema);
