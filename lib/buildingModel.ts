/**
 * Building Model (3D) — data contracts & procedural generator.
 *
 * This module is intentionally provider-agnostic:
 * - Today: deterministic procedural generation (fast, offline, no external APIs)
 * - Tomorrow: swap generator implementation to an LLM-backed "AI" generator without changing UI contracts.
 * 
 * @module lib/buildingModel
 * @description Generates 3D building models from specifications.
 * Supports procedural (free) and AI-powered (premium) generation.
 * 
 * @features
 * - Deterministic procedural generation
 * - Floor-by-floor model creation
 * - Room partitioning per unit template
 * - Stable unit keys for DB synchronization
 * - Theme generation per floor
 */

import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

export const BuildingLayoutSchema = z.enum(["grid", "corridor"]);
export type BuildingLayout = z.infer<typeof BuildingLayoutSchema>;

export const RoomKindSchema = z.enum(["living", "bedroom", "bathroom", "kitchen", "hall"]);
export type RoomKind = z.infer<typeof RoomKindSchema>;

export const UnitTemplateSchema = z.enum(["studio", "1br", "2br", "3br", "mixed"]);
export type UnitTemplate = z.infer<typeof UnitTemplateSchema>;

export const BuildingGenSpecSchema = z
  .object({
    floors: z.number().int().min(1).max(120),
    apartmentsPerFloor: z.number().int().min(1).max(200),
    layout: BuildingLayoutSchema.default("grid"),

    /** Meter-based scale (in meters) */
    floorHeightM: z.number().min(2.2).max(6).default(3),
    unitWidthM: z.number().min(4).max(30).default(10),
    unitDepthM: z.number().min(4).max(30).default(8),
    gapM: z.number().min(0.1).max(10).default(1.2),
    slabThicknessM: z.number().min(0.05).max(0.6).default(0.15),

    /** Heuristic for internal room partitioning */
    template: UnitTemplateSchema.default("2br"),

    /** Optional designer prompt (stored & shown in UI; generator can ignore or use). */
    prompt: z.string().max(2000).optional(),

    /** Determinism seed. If omitted, a stable seed is derived from floors/apartments. */
    seed: z.string().max(128).optional(),
  })
  .strict();

export type BuildingGenSpec = z.infer<typeof BuildingGenSpecSchema>;

// ============================================================================
// MODEL TYPES
// ============================================================================

export type RoomRect = {
  x: number;
  z: number;
  width: number;
  depth: number;
};

export type RoomModel = {
  id: string;
  kind: RoomKind;
  label: string;
  rect: RoomRect;
};

export type UnitMetadata = {
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  halls: number;
  areaSqm: number;
  /** When synced to DB, this is the Unit._id */
  unitDbId?: string;
  electricityMeter?: string;
  waterMeter?: string;
};

export type UnitModel = {
  key: string;
  label: string;
  floorIndex: number;
  position: { x: number; y: number; z: number };
  size: { width: number; height: number; depth: number };
  metadata: UnitMetadata;
  rooms: RoomModel[];
};

export type FloorTheme = {
  baseColor: string;
  accentColor: string;
  roomColors: Record<RoomKind, string>;
};

export type FloorModel = {
  index: number;
  label: string;
  elevationM: number;
  theme: FloorTheme;
  slab: { width: number; depth: number; thickness: number };
  units: UnitModel[];
};

export type BuildingModel = {
  schemaVersion: 1;
  generatedAt: string;
  spec: BuildingGenSpec;
  bounds: { width: number; depth: number; height: number };
  floors: FloorModel[];
};

// ============================================================================
// HELPERS
// ============================================================================

function hashStringToUint32(input: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  // Deterministic PRNG. Returns [0,1).
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function hslToHex(h: number, s: number, l: number): string {
  // h: 0..360
  // s/l: 0..100
  const _h = ((h % 360) + 360) % 360;
  const _s = clamp(s, 0, 100) / 100;
  const _l = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * _l - 1)) * _s;
  const x = c * (1 - Math.abs(((_h / 60) % 2) - 1));
  const m = _l - c / 2;

  let r = 0,
    g = 0,
    b = 0;
  if (_h < 60) {
    r = c;
    g = x;
  } else if (_h < 120) {
    r = x;
    g = c;
  } else if (_h < 180) {
    g = c;
    b = x;
  } else if (_h < 240) {
    g = x;
    b = c;
  } else if (_h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (v: number) => {
    const hv = Math.round((v + m) * 255);
    return hv.toString(16).padStart(2, "0");
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate a floor theme using Fixzit brand colors as base
 * Primary: #0061A8, Secondary: #00A859, Accent: #FFB400
 */
function makeFloorTheme(floorIndex: number): FloorTheme {
  // Align with Fixzit core palette but keep distinct per floor.
  // Base hues roughly: Blue ~ 205, Green ~ 145, Yellow ~ 45
  const hue = 205 + floorIndex * 9;
  const baseColor = hslToHex(hue, 65, 45);
  const accentColor = hslToHex(hue + 25, 70, 50);

  const roomColors: Record<RoomKind, string> = {
    living: hslToHex(hue, 55, 65),
    bedroom: hslToHex(hue + 20, 45, 62),
    bathroom: hslToHex(hue + 40, 30, 70),
    kitchen: hslToHex(hue + 10, 35, 68),
    hall: hslToHex(hue - 15, 30, 72),
  };
  return { baseColor, accentColor, roomColors };
}

function buildUnitNumber(floorIndex: number, unitIndexOnFloor: number): string {
  const floorNo = floorIndex + 1;
  const unitNo = unitIndexOnFloor + 1;
  // 101, 102 ... 201, 202 ...
  const num = floorNo * 100 + unitNo;
  return String(num);
}

function computeTemplateCounts(
  template: UnitTemplate,
  rnd: () => number
): { bedrooms: number; bathrooms: number; halls: number } {
  if (template === "studio") return { bedrooms: 0, bathrooms: 1, halls: 1 };
  if (template === "1br") return { bedrooms: 1, bathrooms: 1, halls: 1 };
  if (template === "2br") return { bedrooms: 2, bathrooms: 2, halls: 1 };
  if (template === "3br") return { bedrooms: 3, bathrooms: 2, halls: 1 };
  // mixed
  const roll = rnd();
  if (roll < 0.2) return { bedrooms: 0, bathrooms: 1, halls: 1 };
  if (roll < 0.55) return { bedrooms: 1, bathrooms: 1, halls: 1 };
  if (roll < 0.85) return { bedrooms: 2, bathrooms: 2, halls: 1 };
  return { bedrooms: 3, bathrooms: 2, halls: 1 };
}

function generateRooms(
  width: number,
  depth: number,
  counts: { bedrooms: number; bathrooms: number; halls: number }
): RoomModel[] {
  // Very simple deterministic partitioning (rectangles on a 2D plane).
  // Coordinate system: local unit center at (0,0). Rooms define their bottom-left corner relative to unit center.
  const rooms: RoomModel[] = [];
  const id = (suffix: string) => suffix;

  const frontDepth = depth * 0.45;
  const backDepth = depth - frontDepth;
  const corridorWidth = Math.max(1.2, width * 0.18);

  // Living area (front)
  rooms.push({
    id: id("living"),
    kind: "living",
    label: "Living",
    rect: {
      x: -width / 2,
      z: -depth / 2,
      width,
      depth: frontDepth,
    },
  });

  // Hall / circulation strip (middle)
  rooms.push({
    id: id("hall"),
    kind: "hall",
    label: "Hall",
    rect: {
      x: -corridorWidth / 2,
      z: -depth / 2 + frontDepth,
      width: corridorWidth,
      depth: backDepth,
    },
  });

  // Kitchen (front side)
  rooms.push({
    id: id("kitchen"),
    kind: "kitchen",
    label: "Kitchen",
    rect: {
      x: -width / 2,
      z: -depth / 2 + frontDepth,
      width: (width - corridorWidth) / 2,
      depth: Math.max(2.2, backDepth * 0.45),
    },
  });

  // Bathrooms (back side, near hall)
  const baths = Math.max(1, counts.bathrooms);
  const bathDepth = backDepth / baths;
  const bathWidth = Math.max(1.8, (width - corridorWidth) / 2);
  for (let i = 0; i < baths; i += 1) {
    rooms.push({
      id: id(`bathroom_${i + 1}`),
      kind: "bathroom",
      label: `Bathroom ${i + 1}`,
      rect: {
        x: corridorWidth / 2,
        z: -depth / 2 + frontDepth + i * bathDepth,
        width: bathWidth,
        depth: bathDepth,
      },
    });
  }

  // Bedrooms (back corners)
  const beds = Math.max(0, counts.bedrooms);
  if (beds === 0) {
    // Studio: reuse bedroom area as "Sleeping" zone within living (visual only)
    rooms.push({
      id: id("sleeping"),
      kind: "bedroom",
      label: "Sleeping",
      rect: {
        x: -width / 2,
        z: -depth / 2 + frontDepth * 0.2,
        width: width * 0.45,
        depth: frontDepth * 0.55,
      },
    });
    return rooms;
  }

  const bedAreaWidth = (width - corridorWidth) / 2;
  const bedDepth = backDepth / Math.min(2, beds);
  let placed = 0;
  // Left column beds
  for (let r = 0; r < 2 && placed < beds; r += 1) {
    rooms.push({
      id: id(`bedroom_${placed + 1}`),
      kind: "bedroom",
      label: `Bedroom ${placed + 1}`,
      rect: {
        x: -width / 2,
        z: -depth / 2 + frontDepth + r * bedDepth,
        width: bedAreaWidth,
        depth: bedDepth,
      },
    });
    placed += 1;
  }
  // Right column beds (above bathrooms region)
  for (let r = 0; r < 2 && placed < beds; r += 1) {
    rooms.push({
      id: id(`bedroom_${placed + 1}`),
      kind: "bedroom",
      label: `Bedroom ${placed + 1}`,
      rect: {
        x: corridorWidth / 2,
        z: -depth / 2 + frontDepth + r * bedDepth,
        width: bedAreaWidth,
        depth: bedDepth,
      },
    });
    placed += 1;
  }

  return rooms;
}

// ============================================================================
// GENERATORS
// ============================================================================

/**
 * Procedural building model generator (deterministic, offline, free tier)
 * 
 * @param input - Building generation specification
 * @returns Complete 3D building model
 */
export function generateBuildingModel(input: BuildingGenSpec): BuildingModel {
  const parsed = BuildingGenSpecSchema.parse(input);
  const seedStr =
    parsed.seed ??
    `floors:${parsed.floors}|apts:${parsed.apartmentsPerFloor}|layout:${parsed.layout}|tpl:${parsed.template}`;
  const rnd = mulberry32(hashStringToUint32(seedStr));

  const unitW = parsed.unitWidthM;
  const unitD = parsed.unitDepthM;
  const gap = parsed.gapM;
  const slabT = parsed.slabThicknessM;
  const floorH = parsed.floorHeightM;

  const cols = Math.ceil(Math.sqrt(parsed.apartmentsPerFloor));
  const rows = Math.ceil(parsed.apartmentsPerFloor / cols);

  const footprintWidth = cols * unitW + (cols - 1) * gap;
  const footprintDepth = rows * unitD + (rows - 1) * gap;
  const totalHeight = parsed.floors * floorH;

  const floors: FloorModel[] = [];

  for (let f = 0; f < parsed.floors; f += 1) {
    const theme = makeFloorTheme(f);
    const elevationM = f * floorH;
    const units: UnitModel[] = [];

    for (let i = 0; i < parsed.apartmentsPerFloor; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (unitW + gap) - (footprintWidth - unitW) / 2;
      const z = row * (unitD + gap) - (footprintDepth - unitD) / 2;

      const counts = computeTemplateCounts(parsed.template, rnd);
      const roomsList = generateRooms(unitW, unitD, counts);
      const unitNumber = buildUnitNumber(f, i);
      const areaSqm = Math.round(unitW * unitD);

      const key = `F${f + 1}-A${i + 1}`;
      const label = `Apartment ${unitNumber}`;

      units.push({
        key,
        label,
        floorIndex: f,
        position: { x, y: elevationM + slabT, z },
        size: { width: unitW, height: floorH - slabT, depth: unitD },
        metadata: {
          unitNumber,
          bedrooms: counts.bedrooms,
          bathrooms: counts.bathrooms,
          halls: counts.halls,
          areaSqm,
        },
        rooms: roomsList,
      });
    }

    floors.push({
      index: f,
      label: `Floor ${f + 1}`,
      elevationM,
      theme,
      slab: { width: footprintWidth + gap, depth: footprintDepth + gap, thickness: slabT },
      units,
    });
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    spec: parsed,
    bounds: { width: footprintWidth, depth: footprintDepth, height: totalHeight },
    floors,
  };
}

/**
 * AI-powered building model generator (premium tier, uses LLM)
 * 
 * @param input - Building generation specification
 * @returns Complete 3D building model
 * 
 * @remarks
 * Premium feature planned for future release.
 * Currently falls back to procedural generation.
 * 
 * Premium features (planned):
 * - Natural language prompt interpretation
 * - Style-aware theme generation
 * - Intelligent room layout optimization
 * - Building code compliance hints
 */
export async function generateBuildingModelAI(
  input: BuildingGenSpec
): Promise<BuildingModel> {
  // AI-powered generation using LLM (premium feature, planned Q2 2026)
  // Falls back to procedural generation for now
  
  // Placeholder: Use procedural generator
  return generateBuildingModel(input);
}

/**
 * Attach database unit IDs to the generated model
 * Used to link 3D units to existing database records
 */
export function attachUnitDbIds(
  model: BuildingModel,
  units: Array<{
    _id: string;
    designKey?: string | null;
    electricityMeter?: string | null;
    waterMeter?: string | null;
  }>
): BuildingModel {
  const map = new Map<
    string,
    { id: string; electricityMeter: string | null; waterMeter: string | null }
  >();
  for (const u of units) {
    if (!u.designKey) continue;
    map.set(u.designKey, {
      id: u._id,
      electricityMeter: u.electricityMeter ?? null,
      waterMeter: u.waterMeter ?? null,
    });
  }
  
  const clone: BuildingModel = JSON.parse(JSON.stringify(model)) as BuildingModel;
  for (const f of clone.floors) {
    for (const unit of f.units) {
      const hit = map.get(unit.key);
      if (!hit) continue;
      unit.metadata.unitDbId = hit.id;
      if (hit.electricityMeter) unit.metadata.electricityMeter = hit.electricityMeter;
      if (hit.waterMeter) unit.metadata.waterMeter = hit.waterMeter;
    }
  }
  return clone;
}
