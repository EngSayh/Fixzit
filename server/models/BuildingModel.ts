/**
 * BuildingModel - 3D Building Model for Properties
 * 
 * @module server/models/BuildingModel
 * @description Stores generated 3D building models for properties.
 * Enables visualization of floor plans, apartments, and rooms.
 * 
 * @features
 * - Multi-tenant isolation (orgId per model)
 * - Property association (propertyId)
 * - Versioning support (v1, v2...)
 * - Status workflow (Draft → Published → Archived)
 * - Generator tracking (procedural vs AI)
 * - Input specification storage
 * - 3D model data (floors, units, rooms)
 * 
 * @statuses
 * - DRAFT: Initial generated state, not visible to tenants
 * - PUBLISHED: Visible in tenant 3D tour
 * - ARCHIVED: Superseded by newer version
 * 
 * @indexes
 * - Compound: { orgId, propertyId, version } unique
 * - Index: { propertyId, status } for fetching published models
 */

import { Schema, Model, InferSchemaType, Types } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

/** Building model status workflow */
const BuildingModelStatus = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

/** Generator type */
const GeneratorType = ["procedural", "ai"] as const;

/**
 * BuildingModel schema definition
 * 
 * @property {ObjectId} propertyId - Reference to Property
 * @property {number} version - Model version number
 * @property {BuildingModelStatus} status - Current workflow status
 * @property {string} generator - Generator type used
 * @property {object} input - Generation specification (floors, apartments, etc.)
 * @property {object} model - Full 3D model data (floors, units, rooms, bounds)
 */
const BuildingModelSchema = new Schema(
  {
    // Multi-tenancy - will be added by plugin
    // orgId: { type: String, required: true, index: true },

    // Property reference
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },

    // Versioning
    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    // Status
    status: {
      type: String,
      enum: BuildingModelStatus,
      required: true,
      default: "DRAFT",
    },

    // Generator metadata
    generator: {
      type: String,
      enum: GeneratorType,
      default: "procedural",
    },

    // Input specification (stored for regeneration/editing)
    input: {
      floors: { type: Number, required: true, min: 1, max: 120 },
      apartmentsPerFloor: { type: Number, required: true, min: 1, max: 200 },
      layout: { type: String, enum: ["grid", "corridor"], default: "grid" },
      floorHeightM: { type: Number, default: 3, min: 2.2, max: 6 },
      unitWidthM: { type: Number, default: 10, min: 4, max: 30 },
      unitDepthM: { type: Number, default: 8, min: 4, max: 30 },
      gapM: { type: Number, default: 1.2, min: 0.1, max: 10 },
      slabThicknessM: { type: Number, default: 0.15, min: 0.05, max: 0.6 },
      template: {
        type: String,
        enum: ["studio", "1br", "2br", "3br", "mixed"],
        default: "2br",
      },
      prompt: { type: String, maxlength: 2000 },
      seed: { type: String, maxlength: 128 },
    },

    // Full 3D model data (JSON blob)
    // Structure: { schemaVersion, generatedAt, spec, bounds, floors[] }
    model: {
      type: Schema.Types.Mixed,
      required: true,
    },

    // Optional metadata
    metadata: {
      totalUnits: Number,
      totalArea: Number,
      publishedAt: Date,
      publishedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
  },
  {
    timestamps: true,
    autoIndex: false,
  },
);

// Apply plugins for tenant isolation and audit tracking
BuildingModelSchema.plugin(tenantIsolationPlugin);
BuildingModelSchema.plugin(auditPlugin);

// Indexes
// Note: Primary indexes should be managed in lib/db/collections.ts
// These are application-level indexes for query optimization
BuildingModelSchema.index({ propertyId: 1, status: 1 });
BuildingModelSchema.index({ propertyId: 1, version: -1 });

export type BuildingModelDoc = InferSchemaType<typeof BuildingModelSchema> & {
  _id: Types.ObjectId;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
};

export const BuildingModel: Model<BuildingModelDoc> = getModel<BuildingModelDoc>(
  "BuildingModel",
  BuildingModelSchema,
);
