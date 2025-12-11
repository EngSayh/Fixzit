import mongoose, { Schema, Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";

export type PersonalizationEventType =
  | "view"
  | "recommendation_request"
  | "search"
  | "favorite_signal";

export interface IPersonalizationEvent extends Document {
  userId: mongoose.Types.ObjectId;
  orgId?: mongoose.Types.ObjectId;
  listingId?: mongoose.Types.ObjectId;
  type: PersonalizationEventType;
  source?: string;
  path?: string;
  intent?: string;
  propertyType?: string;
  city?: string;
  createdAt: Date;
}

const PersonalizationEventSchema = new Schema<IPersonalizationEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    listingId: { type: Schema.Types.ObjectId, ref: "AqarListing" },
    type: {
      type: String,
      enum: ["view", "recommendation_request", "search", "favorite_signal"],
      required: true,
      index: true,
    },
    source: { type: String, maxlength: 120 },
    path: { type: String, maxlength: 200 },
    intent: { type: String, maxlength: 20 },
    propertyType: { type: String, maxlength: 40 },
    city: { type: String, maxlength: 80 },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "aqar_personalization_events",
  },
);

PersonalizationEventSchema.plugin(tenantIsolationPlugin);

PersonalizationEventSchema.index({ orgId: 1, userId: 1, createdAt: -1 });
PersonalizationEventSchema.index({ userId: 1, type: 1, createdAt: -1 });

const PersonalizationEvent = getModel<IPersonalizationEvent>(
  "AqarPersonalizationEvent",
  PersonalizationEventSchema,
);

export default PersonalizationEvent;
