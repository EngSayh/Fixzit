import { Schema, Document } from "mongoose";
import { getModel } from "@/src/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const AuditStatuses = [
  "PLANNED",
  "IN_PROGRESS",
  "FOLLOW_UP",
  "COMPLETED",
] as const;
const RiskLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export type AuditStatus = (typeof AuditStatuses)[number];
export type AuditRiskLevel = (typeof RiskLevels)[number];

export interface ComplianceAuditDocument extends Document {
  name: string;
  owner: string;
  scope: string;
  status: AuditStatus;
  riskLevel: AuditRiskLevel;
  startDate: Date;
  endDate: Date;
  findings: number;
  openIssues: number;
  checklist: string[];
  tags: string[];
  leadAuditor?: string;
  supportingTeams: string[];
  lastStatusAt: Date;
  attachments: Array<{ name: string; url: string }>;
  orgId: Schema.Types.ObjectId;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceAuditSchema = new Schema<ComplianceAuditDocument>(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: String, required: true, trim: true },
    scope: { type: String, required: true, trim: true },
    status: { type: String, enum: AuditStatuses, default: "PLANNED" },
    riskLevel: { type: String, enum: RiskLevels, default: "MEDIUM" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    findings: { type: Number, default: 0 },
    openIssues: { type: Number, default: 0 },
    checklist: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    leadAuditor: { type: String, trim: true },
    supportingTeams: { type: [String], default: [] },
    lastStatusAt: { type: Date, default: Date.now },
    attachments: {
      type: [
        {
          name: { type: String, required: true },
          url: { type: String, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

ComplianceAuditSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.lastStatusAt = new Date();
  }
  next();
});

ComplianceAuditSchema.plugin(tenantIsolationPlugin);
ComplianceAuditSchema.plugin(auditPlugin);

ComplianceAuditSchema.index({ orgId: 1, status: 1 });
ComplianceAuditSchema.index({ orgId: 1, riskLevel: 1 });
ComplianceAuditSchema.index({ orgId: 1, startDate: -1 });

const ComplianceAudit = getModel<ComplianceAuditDocument>(
  "ComplianceAudit",
  ComplianceAuditSchema,
);
export default ComplianceAudit;
