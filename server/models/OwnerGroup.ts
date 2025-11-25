import { Schema, Types, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { getModel } from "@/src/types/mongoose-compat";

const OwnerGroupSchema = new Schema(
  {
    name: { type: String, required: true },
    primary_contact_user_id: { type: Schema.Types.ObjectId, ref: "User" },
    member_user_ids: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    fm_provider_org_id: { type: Schema.Types.ObjectId, ref: "Organization" },
    agent_org_id: { type: Schema.Types.ObjectId, ref: "Organization" },
    property_ids: [
      {
        type: Schema.Types.ObjectId,
        ref: "Property",
      },
    ],
    // orgId is automatically added by tenantIsolationPlugin
  },
  { timestamps: true },
);

// ⚡ CRITICAL FIX: Apply tenant isolation and audit plugins
OwnerGroupSchema.plugin(tenantIsolationPlugin);
OwnerGroupSchema.plugin(auditPlugin);

// ⚡ FIX: Tenant-scoped indexes (orgId added by plugin)
OwnerGroupSchema.index({ orgId: 1, name: 1 }, { unique: true });
OwnerGroupSchema.index({ orgId: 1, primary_contact_user_id: 1 });

export type OwnerGroup = InferSchemaType<typeof OwnerGroupSchema>;

export const OwnerGroupModel = getModel<OwnerGroup>(
  "OwnerGroup",
  OwnerGroupSchema,
);
