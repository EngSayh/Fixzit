import { Schema, Document } from "mongoose";
import { getModel } from "@/src/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const PolicyStatuses = ["DRAFT", "UNDER_REVIEW", "ACTIVE", "RETIRED"] as const;
const PolicyCategories = [
  "OPERATIONS",
  "FINANCE",
  "HR",
  "SAFETY",
  "COMPLIANCE",
  "VENDOR",
] as const;

export type CompliancePolicyStatus = (typeof PolicyStatuses)[number];
export type CompliancePolicyCategory = (typeof PolicyCategories)[number];

export interface CompliancePolicyDocument extends Document {
  title: string;
  owner: string;
  summary?: string;
  body?: string;
  category: CompliancePolicyCategory;
  status: CompliancePolicyStatus;
  version: string;
  reviewFrequencyDays: number;
  effectiveFrom?: Date;
  reviewDate?: Date;
  tags: string[];
  acknowledgements: number;
  relatedDocuments: Array<{ name: string; url: string; type?: string }>;
  orgId: Schema.Types.ObjectId;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CompliancePolicySchema = new Schema<CompliancePolicyDocument>(
  {
    title: { type: String, required: true, trim: true },
    owner: { type: String, required: true, trim: true },
    summary: { type: String, trim: true },
    body: { type: String },
    category: { type: String, enum: PolicyCategories, default: "COMPLIANCE" },
    status: { type: String, enum: PolicyStatuses, default: "DRAFT" },
    version: { type: String, default: "1.0" },
    reviewFrequencyDays: { type: Number, default: 365 },
    effectiveFrom: { type: Date },
    reviewDate: { type: Date },
    tags: { type: [String], default: [] },
    acknowledgements: { type: Number, default: 0 },
    relatedDocuments: {
      type: [
        {
          name: { type: String, required: true },
          url: { type: String, required: true },
          type: { type: String },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

CompliancePolicySchema.plugin(tenantIsolationPlugin, {
  uniqueTenantFields: ["title"],
});
CompliancePolicySchema.plugin(auditPlugin);

CompliancePolicySchema.index({ orgId: 1, status: 1 });
CompliancePolicySchema.index({ orgId: 1, category: 1 });
CompliancePolicySchema.index({ orgId: 1, reviewDate: 1 });

const CompliancePolicy = getModel<CompliancePolicyDocument>(
  "CompliancePolicy",
  CompliancePolicySchema,
);
export default CompliancePolicy;
