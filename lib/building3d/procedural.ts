/**
 * Building 3D Procedural Generation
 * 
 * @module lib/building3d/procedural
 * @description Deterministic procedural building model generation.
 * Free tier - no external API calls required.
 */
import {
  BuildingGenSpec,
  type BuildingModel,
  type FloorTheme,
  type RoomKind,
  type RoomModel,
} from "./types";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashToUint32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function floorTheme(index: number): FloorTheme {
  const hue = (210 + index * 20) % 360;
  return {
    baseColor: `hsl(${hue}, 16%, 88%)`,
    accentColor: `hsl(${hue}, 70%, 74%)`,
    roomColors: {
      living: "#e2e8f0",
      bedroom: "#fecaca",
      bathroom: "#bfdbfe",
      kitchen: "#bbf7d0",
      hall: "#f3f4f6",
    } satisfies Record<RoomKind, string>,
  };
}

function inferTemplateCounts(
  template: BuildingGenSpec["template"],
  rnd: () => number
): { bedrooms: number; bathrooms: number; halls: number } {
  if (template === "studio") return { bedrooms: 0, bathrooms: 1, halls: 1 };
  if (template === "1br") return { bedrooms: 1, bathrooms: 1, halls: 1 };
  if (template === "2br") return { bedrooms: 2, bathrooms: 2, halls: 1 };
  if (template === "3br") return { bedrooms: 3, bathrooms: 2, halls: 1 };
  // mixed
  const roll = rnd();
  if (roll < 0.25) return { bedrooms: 1, bathrooms: 1, halls: 1 };
  if (roll < 0.75) return { bedrooms: 2, bathrooms: 2, halls: 1 };
  return { bedrooms: 3, bathrooms: 2, halls: 1 };
}

function generateRooms(
  template: BuildingGenSpec["template"],
  w: number,
  d: number,
  rnd: () => number
): RoomModel[] {
  const rooms: RoomModel[] = [];
  const counts = inferTemplateCounts(template, rnd);

  // A simple, consistent split layout:
  // Front: Living + Kitchen
  // Back: Bedrooms + Bathrooms
  const frontDepth = d * 0.45;
  const backDepth = d - frontDepth;

  rooms.push({
    id: "living",
    kind: "living",
    label: "Living",
    rect: { x: 0, z: 0, width: w * 0.62, depth: frontDepth },
  });
  rooms.push({
    id: "kitchen",
    kind: "kitchen",
    label: "Kitchen",
    rect: { x: w * 0.62, z: 0, width: w * 0.38, depth: frontDepth },
  });

  // Hall
  rooms.push({
    id: "hall",
    kind: "hall",
    label: "Hall",
    rect: { x: 0, z: frontDepth, width: w * 0.18, depth: backDepth },
  });

  // Back strip is split into bedrooms/bathrooms
  const backX = w * 0.18;
  const backW = w - backX;
  const bedroomCount = counts.bedrooms;
  const bathroomCount = counts.bathrooms;
  const slots = Math.max(1, bedroomCount + bathroomCount);
  const slotW = backW / slots;

  let slot = 0;
  for (let i = 0; i < bedroomCount; i++) {
    rooms.push({
      id: `bedroom_${i + 1}`,
      kind: "bedroom",
      label: `Bedroom ${i + 1}`,
      rect: {
        x: backX + slot * slotW,
        z: frontDepth,
        width: slotW,
        depth: backDepth * 0.7,
      },
    });
    slot++;
  }
  for (let i = 0; i < bathroomCount; i++) {
    rooms.push({
      id: `bathroom_${i + 1}`,
      kind: "bathroom",
      label: `Bathroom ${i + 1}`,
      rect: {
        x: backX + slot * slotW,
        z: frontDepth + backDepth * 0.7,
        width: slotW,
        depth: backDepth * 0.3,
      },
    });
    slot++;
  }

  // Small jitter (non-overlapping) so models are less "cookie-cutter"
  const jitter = (v: number, span: number) => v + (rnd() - 0.5) * span;
  if (rooms.length > 0) {
    rooms[0].rect.width = Math.max(2, jitter(rooms[0].rect.width, 0.35));
  }

  return rooms;
}

export function generateBuildingModelProcedural(
  spec: BuildingGenSpec
): BuildingModel {
  const seedStr =
    spec.seed ??
    `floors:${spec.floors}|u:${spec.apartmentsPerFloor}|l:${spec.layout}|t:${spec.template}`;
  const rnd = mulberry32(hashToUint32(seedStr));

  const floors = [];
  const corridorWidth = spec.layout === "corridor" ? 2.6 : 0;

  // corridor layout: double-loaded corridor
  const unitsPerSide =
    spec.layout === "corridor"
      ? Math.ceil(spec.apartmentsPerFloor / 2)
      : spec.apartmentsPerFloor;
  const gridCols =
    spec.layout === "grid"
      ? Math.ceil(Math.sqrt(spec.apartmentsPerFloor))
      : unitsPerSide;
  const gridRows =
    spec.layout === "grid"
      ? Math.ceil(spec.apartmentsPerFloor / gridCols)
      : 2;

  const floorWidth =
    spec.layout === "grid"
      ? gridCols * spec.unitWidthM + (gridCols + 1) * spec.gapM
      : unitsPerSide * spec.unitWidthM + (unitsPerSide + 1) * spec.gapM;

  const floorDepth =
    spec.layout === "grid"
      ? gridRows * spec.unitDepthM + (gridRows + 1) * spec.gapM
      : spec.unitDepthM * 2 + corridorWidth + spec.gapM * 2;

  for (let f = 0; f < spec.floors; f++) {
    const elevation = f * spec.floorHeightM;
    const theme = floorTheme(f);
    const units = [];

    for (let u = 0; u < spec.apartmentsPerFloor; u++) {
      let x = 0;
      let z = 0;

      if (spec.layout === "grid") {
        const col = u % gridCols;
        const row = Math.floor(u / gridCols);
        x =
          col * (spec.unitWidthM + spec.gapM) -
          floorWidth / 2 +
          spec.unitWidthM / 2 +
          spec.gapM;
        z =
          row * (spec.unitDepthM + spec.gapM) -
          floorDepth / 2 +
          spec.unitDepthM / 2 +
          spec.gapM;
      } else {
        // corridor (double sided)
        const isTop = u % 2 === 0;
        const col = Math.floor(u / 2);
        x =
          col * (spec.unitWidthM + spec.gapM) -
          floorWidth / 2 +
          spec.unitWidthM / 2 +
          spec.gapM;
        z = isTop
          ? -(spec.unitDepthM / 2 + corridorWidth / 2)
          : spec.unitDepthM / 2 + corridorWidth / 2;
      }

      const unitKey = `F${f + 1}-U${String(u + 1).padStart(2, "0")}`;
      const unitNumber = `${String(f + 1)}${String(u + 1).padStart(2, "0")}`; // 101, 102, ... 201, 202 ...

      const rooms = generateRooms(spec.template, spec.unitWidthM, spec.unitDepthM, rnd);
      const bedrooms = rooms.filter((r) => r.kind === "bedroom").length;
      const bathrooms = rooms.filter((r) => r.kind === "bathroom").length;

      units.push({
        key: unitKey,
        label: `Unit ${unitNumber}`,
        position: { x, z },
        size: {
          width: spec.unitWidthM,
          depth: spec.unitDepthM,
          height: Math.max(2.2, spec.floorHeightM - 0.25),
        },
        rooms,
        metadata: {
          unitNumber,
          areaSqm: Math.round(spec.unitWidthM * spec.unitDepthM),
          bedrooms,
          bathrooms,
          halls: 1,
        },
      });
    }

    floors.push({
      index: f,
      label: f === 0 ? "Ground Floor" : `Floor ${f + 1}`,
      elevationM: elevation,
      units,
      slab: { width: floorWidth, depth: floorDepth, thickness: 0.25 },
      theme,
    });
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    generator: "procedural-v1",
    spec,
    floors,
    bounds: {
      width: floorWidth,
      height: spec.floors * spec.floorHeightM,
      depth: floorDepth,
    },
  };
}
