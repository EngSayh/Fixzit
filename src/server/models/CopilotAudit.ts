import { Schema, model, models, InferSchemaType } from "mongoose";
import { isMockDB } from "@/src/lib/mongo";

const AuditSchema = new Schema({
  tenantId: { type: String, index: true },
  userId: { type: String, index: true },
  role: { type: String, index: true },
  locale: { type: String, default: "en" },
  intent: { type: String },
  tool: { type: String },
  status: { type: String, enum: ["SUCCESS","DENIED","ERROR"], default: "SUCCESS" },
  message: { type: String },
  prompt: { type: String },
  response: { type: String },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: true, updatedAt: false } });

export type CopilotAuditDoc = InferSchemaType<typeof AuditSchema>;

class MockAuditStore {
  private events: CopilotAuditDoc[] = [];

  async create(doc: CopilotAuditDoc) {
    const entry = { ...doc, createdAt: new Date() };
    this.events.push(entry);
    return entry;
  }
}

export const CopilotAudit = isMockDB
  ? new MockAuditStore()
  : (models.CopilotAudit || model("CopilotAudit", AuditSchema));
