/**
 * Building 3D Types
 * 
 * @module lib/building3d/types
 * @description Zod schemas and TypeScript types for 3D building models.
 * Defines the data contracts for building generation.
 */
import { z } from "zod";

// ============================================================================
// ROOM TYPES
// ============================================================================

export const RoomKindSchema = z.enum([
  "living",
  "bedroom",
  "bathroom",
  "kitchen",
  "hall",
]);
export type RoomKind = z.infer<typeof RoomKindSchema>;

export const RoomModelSchema = z.object({
  id: z.string().min(1),
  kind: RoomKindSchema,
  label: z.string().min(1),
  rect: z.object({
    x: z.number(),
    z: z.number(),
    width: z.number().positive(),
    depth: z.number().positive(),
  }),
});

export type RoomModel = z.infer<typeof RoomModelSchema>;

// ============================================================================
// UNIT TYPES
// ============================================================================

export const UnitModelSchema = z.object({
  key: z.string().min(1), // Stable link to DB (designKey)
  label: z.string().min(1),
  position: z.object({ x: z.number(), z: z.number() }),
  size: z.object({
    width: z.number().positive(),
    depth: z.number().positive(),
    height: z.number().positive(),
  }),
  rooms: z.array(RoomModelSchema),
  metadata: z.object({
    unitNumber: z.string().min(1),
    bedrooms: z.number().int().min(0),
    bathrooms: z.number().int().min(0),
    halls: z.number().int().min(0),
    areaSqm: z.number().nonnegative(),
  }),
});

export type UnitModel = z.infer<typeof UnitModelSchema>;

// ============================================================================
// FLOOR TYPES
// ============================================================================

export const FloorThemeSchema = z.object({
  baseColor: z.string().min(1), // CSS color (e.g., hsl(...), #hex)
  accentColor: z.string().min(1), // CSS color
  roomColors: z.record(RoomKindSchema, z.string().min(1)),
});

export type FloorTheme = z.infer<typeof FloorThemeSchema>;

export const FloorModelSchema = z.object({
  index: z.number().int().min(0),
  label: z.string().min(1),
  elevationM: z.number().min(0),
  units: z.array(UnitModelSchema),
  slab: z.object({
    width: z.number().positive(),
    depth: z.number().positive(),
    thickness: z.number().positive(),
  }),
  theme: FloorThemeSchema,
});

export type FloorModel = z.infer<typeof FloorModelSchema>;

// ============================================================================
// GENERATION SPEC
// ============================================================================

export const BuildingGenSpecSchema = z.object({
  floors: z.number().int().min(1).max(120),
  apartmentsPerFloor: z.number().int().min(1).max(60),
  layout: z.enum(["corridor", "grid"]).default("corridor"),
  template: z.enum(["studio", "1br", "2br", "3br", "mixed"]).default("2br"),
  floorHeightM: z.number().min(2.4).max(6).default(3.2),
  unitWidthM: z.number().min(4).max(50).default(10),
  unitDepthM: z.number().min(4).max(50).default(12),
  gapM: z.number().min(0).max(5).default(1),
  seed: z.string().optional(),
  // Paid feature path:
  generationMode: z.enum(["procedural", "ai"]).default("procedural"),
  prompt: z.string().max(2000).optional(),
});

export type BuildingGenSpec = z.infer<typeof BuildingGenSpecSchema>;

// ============================================================================
// BUILDING MODEL
// ============================================================================

export const BuildingModelSchema = z.object({
  schemaVersion: z.number().int().min(1),
  generatedAt: z.string().min(1),
  generator: z.string().min(1), // 'procedural-v1' | 'ai-v1' | ...
  spec: BuildingGenSpecSchema,
  floors: z.array(FloorModelSchema),
  bounds: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    depth: z.number().positive(),
  }),
});

export type BuildingModel = z.infer<typeof BuildingModelSchema>;

// ============================================================================
// DATABASE RECORD TYPES
// ============================================================================

export type BuildingModelStatus = "Draft" | "Published" | "Archived";

export type BuildingModelRecord = {
  _id: string;
  orgId: string;
  propertyId: string;
  version: number;
  status: BuildingModelStatus;
  generator: string;
  input: BuildingGenSpec;
  modelInline: boolean;
  modelBytes?: number;
  modelS3?: { bucket: string; key: string; bytes: number };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};
