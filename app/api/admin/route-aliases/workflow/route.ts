/**
 * @fileoverview Route Alias Workflow API
 * @description Manages workflow status for route alias resolution including
 * ownership assignment and resolution tracking.
 * 
 * @module api/admin/route-aliases/workflow
 * @requires SUPER_ADMIN role
 * 
 * @endpoints
 * - GET /api/admin/route-aliases/workflow - Get all workflow statuses
 * - POST /api/admin/route-aliases/workflow - Update workflow for an alias
 * 
 * @requestBody (POST)
 * - aliasFile: (required) Path to the alias file
 * - owner: Assigned owner for resolution
 * - resolved: Whether the alias has been resolved
 * 
 * @response (GET)
 * - Map of aliasFile to workflow status {owner, resolved, updatedAt}
 * 
 * @response (POST)
 * - Updated workflow entry
 * 
 * @security
 * - SUPER_ADMIN only
 * - Tracks who resolved duplicates for audit
 */
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  readAliasWorkflow,
  upsertAliasWorkflow,
  AliasWorkflowMap,
} from "@/lib/routes/workflowStore";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "admin-route-aliases-workflow:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const map = readAliasWorkflow();
  return NextResponse.json(map satisfies AliasWorkflowMap);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { aliasFile, owner, resolved } = body as {
      aliasFile?: string;
      owner?: string;
      resolved?: boolean;
    };

    if (!aliasFile) {
      return NextResponse.json(
        { error: "aliasFile is required" },
        { status: 400 },
      );
    }

    const entry = upsertAliasWorkflow(aliasFile, {
      owner: owner ?? "",
      resolved: resolved ?? false,
    });

    return NextResponse.json(entry);
  } catch (_error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
