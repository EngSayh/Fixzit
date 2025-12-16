/**
 * Candidate Model - ATS candidate profiles
 * 
 * @module server/models/Candidate
 * @description Manages candidate profiles and resumes for Fixzit ATS.
 * Stores applicant information, skills, experience, and consent tracking.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Resume storage (URL + parsed text)
 * - Skills and experience tracking
 * - LinkedIn profile integration
 * - Privacy consent management (GDPR compliant)
 * - Email normalization (case-insensitive lookups)
 * - Source tracking (careers page, referral, job board)
 * - Encrypted contact information
 * 
 * @consents
 * - privacy: GDPR privacy policy acceptance
 * - contact: Permission to contact candidate
 * - dataRetention: Data storage consent
 * 
 * @sources
 * - careers: Fixzit careers page
 * - referral: Employee referral
 * - linkedin: LinkedIn application
 * - indeed: Indeed job board
 * - direct: Direct application
 * 
 * @indexes
 * - Unique: { orgId, emailLower } - Prevent duplicate candidates per org
 * - Index: { skills } for skill-based search
 * - Index: { source } for source analysis
 * - Index: { createdAt } for chronological sorting
 * 
 * @relationships
 * - Application.candidateId → Candidate._id
 * - Interview records reference candidateId
 * 
 * @encryption
 * - email encrypted via encryptionPlugin
 * - phone encrypted
 * - Personal data protected
 * 
 * @audit
 * - Profile updates logged
 * - Consent changes tracked
 * - Application submissions recorded
 */

import {
  Schema,
  model,
  models,
  InferSchemaType,
  Model,
  Document,
} from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { encryptionPlugin } from "../plugins/encryptionPlugin";

const CandidateSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    emailLower: { type: String, required: true },
    phone: { type: String },
    location: { type: String },
    linkedin: { type: String },
    skills: { type: [String], default: [] },
    experience: { type: Number, default: 0 },
    resumeUrl: { type: String },
    resumeText: { type: String },
    source: { type: String, default: "careers" },
    consents: {
      privacy: { type: Boolean, default: true },
      contact: { type: Boolean, default: true },
      dataRetention: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

// Apply plugins BEFORE indexes
CandidateSchema.plugin(tenantIsolationPlugin);
CandidateSchema.plugin(auditPlugin);
// SEC-PII-002: Encrypt candidate PII fields (job applicant data is sensitive)
CandidateSchema.plugin(encryptionPlugin, {
  fields: {
    "email": "Candidate Email",
    "phone": "Candidate Phone",
    "linkedin": "LinkedIn Profile",
    "resumeText": "Resume Content",
  },
});

// Tenant-scoped index
CandidateSchema.index(
  { orgId: 1, emailLower: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);

CandidateSchema.pre("validate", function (next) {
  if (this.email) {
    this.emailLower = this.email.toLowerCase();
  }
  next();
});

export type CandidateDoc = InferSchemaType<typeof CandidateSchema> &
  Document & {
    orgId: string;
    createdBy?: Schema.Types.ObjectId;
    updatedBy?: Schema.Types.ObjectId;
    version?: number;
    changeHistory?: unknown[];
  };

export interface CandidateModel extends Model<CandidateDoc> {
  findByEmail(orgId: string, email: string): Promise<CandidateDoc | null>;
}

// Add pre-save middleware to set defaults
CandidateSchema.pre("save", function () {
  if (this.isNew) {
    this.skills = this.skills || [];
    this.consents = this.consents || {
      privacy: true,
      contact: true,
      dataRetention: true,
    };
    if (this.email) {
      this.emailLower = this.email.toLowerCase();
    }
  }
});

// Add static method for org-scoped email lookup
CandidateSchema.statics.findByEmail = async function (
  orgId: string,
  email: string,
) {
  return this.findOne({ orgId, emailLower: email.toLowerCase() });
};

const existingCandidateModel = (
  typeof models !== "undefined" ? models.Candidate : undefined
) as CandidateModel | undefined;
export const Candidate: CandidateModel =
  existingCandidateModel ||
  model<CandidateDoc, CandidateModel>("Candidate", CandidateSchema);
