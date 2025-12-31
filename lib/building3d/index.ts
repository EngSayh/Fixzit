/**
 * Building 3D Module - Public API
 * 
 * @module lib/building3d
 * @description Re-exports for the building 3D generation module.
 * Import from '@/lib/building3d' for clean imports.
 */

// Types
export * from "./types";

// Procedural generator (free tier)
export { generateBuildingModelProcedural } from "./procedural";

// Feature flags
export { orgCanUseBuildingAI } from "./features";

// Note: AI generation is server-only and should be imported directly
// from './ai' in server-side code only:
// import { generateBuildingModelAI } from '@/lib/building3d/ai';
