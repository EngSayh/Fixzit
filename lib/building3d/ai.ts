/**
 * Building 3D AI Generation
 * 
 * @module lib/building3d/ai
 * @description AI-powered building model generation using OpenAI.
 * This is a premium feature for Pro/Enterprise organizations.
 * 
 * @server-only - Never import into client components
 * 
 * NOTE: This feature requires the 'openai' package to be installed.
 * If not available, it falls back to procedural generation.
 */
import "server-only";

import {
  BuildingGenSpec,
  BuildingModel,
  BuildingGenSpecSchema,
} from "./types";
import { generateBuildingModelProcedural } from "./procedural";

export type AiBuildingOptions = {
  spec: BuildingGenSpec;
  orgName?: string;
  propertyName?: string;
  model?: string; // override OpenAI model
};

/**
 * Paid feature: Use a model (LLM) to generate the full BuildingModel JSON.
 * - Uses Structured Outputs to enforce schema correctness.
 * - Falls back to procedural if AI fails or OpenAI is not configured.
 *
 * NOTE: This function is server-only; do not import into client components.
 */
export async function generateBuildingModelAI(
  opts: AiBuildingOptions
): Promise<BuildingModel> {
  const spec = BuildingGenSpecSchema.parse(opts.spec);

  const totalUnits = spec.floors * spec.apartmentsPerFloor;
  if (totalUnits > 200) {
    // Keep token usage sane.
    return generateBuildingModelProcedural({
      ...spec,
      generationMode: "procedural",
    });
  }

  // Check if OpenAI is configured
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fall back to procedural if no API key
    return generateBuildingModelProcedural({
      ...spec,
      generationMode: "procedural",
    });
  }

  try {
    // Dynamic import to avoid build errors if package not installed
    const { openai } = await import("@ai-sdk/openai");
    const { generateObject } = await import("ai");
    const { z } = await import("zod");

    const model = opts.model ?? process.env.OPENAI_BUILDING_MODEL ?? "gpt-4o-mini";
    const orgName = opts.orgName ? `Organization: ${opts.orgName}` : "";
    const propertyName = opts.propertyName ? `Property: ${opts.propertyName}` : "";

    const prompt =
      `${orgName}\n${propertyName}\n\n` +
      "Generate a BuildingModel for the following spec. Requirements:\n" +
      `- floors: ${spec.floors}\n` +
      `- apartmentsPerFloor: ${spec.apartmentsPerFloor}\n` +
      `- layout: ${spec.layout}\n` +
      `- template: ${spec.template}\n` +
      `- floorHeightM: ${spec.floorHeightM}\n` +
      `- unitWidthM: ${spec.unitWidthM}\n` +
      `- unitDepthM: ${spec.unitDepthM}\n` +
      `- gapM: ${spec.gapM}\n\n` +
      "Rules:\n" +
      "- Use schemaVersion: 1.\n" +
      "- generator must be 'ai-v1'.\n" +
      "- Each floor index starts at 0, elevationM = index * floorHeightM.\n" +
      "- Each unit key must follow: F{floorNumber}-U{2-digit unit} e.g. F1-U01.\n" +
      "- unit.metadata.unitNumber must follow: {floorNumber}{2-digit unit} e.g. 101.\n" +
      "- Keep bounds consistent with slab sizes.\n" +
      "- Provide room rects within unit bounds (0..width, 0..depth).\n" +
      (spec.prompt ? `\nAdditional prompt: ${spec.prompt}\n` : "");

    // Define simplified schema for AI generation
    const RoomKindEnum = z.enum(["living", "bedroom", "bathroom", "kitchen", "hall"]);
    const RoomSchema = z.object({
      id: z.string(),
      kind: RoomKindEnum,
      label: z.string(),
      rect: z.object({
        x: z.number(),
        z: z.number(),
        width: z.number(),
        depth: z.number(),
      }),
    });
    const UnitSchema = z.object({
      key: z.string(),
      label: z.string(),
      position: z.object({ x: z.number(), z: z.number() }),
      size: z.object({ width: z.number(), depth: z.number(), height: z.number() }),
      rooms: z.array(RoomSchema),
      metadata: z.object({
        unitNumber: z.string(),
        bedrooms: z.number(),
        bathrooms: z.number(),
        halls: z.number(),
        areaSqm: z.number(),
      }),
    });
    const FloorThemeSchema = z.object({
      baseColor: z.string(),
      accentColor: z.string(),
      roomColors: z.record(RoomKindEnum, z.string()),
    });
    const FloorSchema = z.object({
      index: z.number(),
      label: z.string(),
      elevationM: z.number(),
      units: z.array(UnitSchema),
      slab: z.object({ width: z.number(), depth: z.number(), thickness: z.number() }),
      theme: FloorThemeSchema,
    });
    const BuildingSchema = z.object({
      schemaVersion: z.number(),
      generatedAt: z.string(),
      generator: z.string(),
      spec: z.any(),
      floors: z.array(FloorSchema),
      bounds: z.object({ width: z.number(), height: z.number(), depth: z.number() }),
    });

    const result = await generateObject({
      model: openai(model),
      schema: BuildingSchema,
      prompt,
      system:
        "You are an architect engine that outputs valid building model JSON. " +
        "Use metric units. Use realistic room proportions. Ensure keys are stable and deterministic.",
    });

    const parsed = result.object as BuildingModel;
    // Ensure spec matches (or normalize to requested spec)
    parsed.spec = spec;
    parsed.generator = "ai-v1";
    return parsed;
  } catch (_err) {
    // Hard fallback to procedural so the feature never blocks the core workflow
    return generateBuildingModelProcedural({
      ...spec,
      generationMode: "procedural",
    });
  }
}
