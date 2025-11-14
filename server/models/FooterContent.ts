import { Schema, model, models, InferSchemaType } from 'mongoose';
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';

/**
 * FooterContent Model
 * Manages bilingual footer content for About Us, Privacy Policy, Terms of Service pages
 * Super Admin only access for editing
 */
const FooterContentSchema = new Schema({
  // tenantId will be added by tenantIsolationPlugin
  page: {
    type: String,
    required: true,
    enum: ['about', 'privacy', 'terms'],
    comment: 'Page identifier: about, privacy, or terms'
  },
  contentEn: {
    type: String,
    required: true,
    comment: 'English content (left textbox in admin UI)'
  },
  contentAr: {
    type: String,
    required: true,
    comment: 'Arabic content (right textbox in admin UI)'
  }
  // updatedBy, updatedAt, createdBy, createdAt will be added by auditPlugin
}, {
  timestamps: true,
  comment: 'Footer content management with bilingual support'
});

// Apply plugins BEFORE indexes
FooterContentSchema.plugin(tenantIsolationPlugin);
FooterContentSchema.plugin(auditPlugin);

// Ensure one record per page per tenant (upsert pattern)
FooterContentSchema.index({ orgId: 1, page: 1 }, { unique: true });

// Add helpful method to get content by locale
FooterContentSchema.methods.getContent = function(_locale: 'en' | 'ar'): string {
  return _locale === 'ar' ? this.contentAr : this.contentEn;
};

export type FooterContentDoc = InferSchemaType<typeof FooterContentSchema> & {
  getContent(_locale: string): string;
};

export const FooterContent = (typeof models !== 'undefined' && models.FooterContent) || model("FooterContent", FooterContentSchema);
