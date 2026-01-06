/**
 * Building 3D Feature Flags
 * 
 * @module lib/building3d/features
 * @description Feature flag checks for building 3D capabilities.
 * Checks org subscription plan for AI generation access.
 * 
 * @server-only - Never import into client components
 */
import "server-only";

import { getDatabase } from "@/lib/mongodb-unified";
import { ObjectId } from "mongodb";
import { COLLECTIONS } from "@/lib/db/collection-names";

/**
 * Check if an organization can use AI building generation.
 * 
 * Access is granted if:
 * 1. FIXZIT_ENABLE_BUILDING_AI=true (global flag)
 * 2. Org is on pro/professional/enterprise plan
 * 3. Org has 'AI_BUILDING_MODEL' or 'building_ai' feature enabled
 */
export async function orgCanUseBuildingAI(orgId: string): Promise<boolean> {
  // Global override
  if (process.env.FIXZIT_ENABLE_BUILDING_AI === "true") return true;

  try {
    const db = await getDatabase();
    const org = await db.collection(COLLECTIONS.ORGANIZATIONS).findOne({
      _id: new ObjectId(orgId),
    });

    if (!org) return false;

    // Check subscription plan
    const plan =
      org?.subscription?.plan ?? org?.plan ?? org?.subscriptionPlan ?? "";
    if (
      typeof plan === "string" &&
      ["pro", "professional", "enterprise"].includes(plan.toLowerCase())
    ) {
      return true;
    }

    // Check features array
    const features = Array.isArray(org?.features) ? org.features : [];
    if (
      features.includes("AI_BUILDING_MODEL") ||
      features.includes("building_ai")
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
