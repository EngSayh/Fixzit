import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";
import {
  Role,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";

/**
 * POST /api/souq/returns/inspect
 * Complete return inspection
 * Admin/Inspector-only endpoint
 */
export async function POST(request: NextRequest) {
  let userId: string | undefined;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = session.user.id;

    // Admin or operations staff with inspect permissions - canonical Role + subRole per STRICT v4.1
    const rawSubRole = ((session.user as { subRole?: string | null }).subRole ?? undefined) as string | undefined;
    const normalizedSubRole =
      rawSubRole && Object.values(SubRole).includes(rawSubRole as SubRole)
        ? (rawSubRole as SubRole)
        : undefined;
    const userRole = normalizeRole(session.user.role, normalizedSubRole as SubRole | undefined);
    const userSubRole =
      normalizeSubRole(normalizedSubRole as SubRole | undefined) ??
      inferSubRoleFromRole(session.user.role);

    const isPlatformAdmin = userRole === Role.SUPER_ADMIN || session.user.isSuperAdmin;
    const isAdminRole =
      userRole !== null &&
      [Role.ADMIN, Role.CORPORATE_OWNER].includes(userRole);
    
    // TEAM_MEMBER with ops/support subRole can inspect returns
    const isOpsStaff =
      userRole === Role.TEAM_MEMBER &&
      userSubRole !== undefined &&
      [SubRole.OPERATIONS_MANAGER, SubRole.SUPPORT_AGENT].includes(userSubRole);
    
    if (!isPlatformAdmin && !isAdminRole && !isOpsStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { rmaId, condition, restockable, inspectionNotes, inspectionPhotos } =
      body;

    // Validation
    if (!rmaId || !condition || restockable === undefined) {
      return NextResponse.json(
        {
          error: "Missing required fields: rmaId, condition, restockable",
        },
        { status: 400 },
      );
    }

    const validConditions = [
      "like_new",
      "good",
      "acceptable",
      "damaged",
      "defective",
    ];
    if (!validConditions.includes(condition)) {
      return NextResponse.json(
        {
          error: `Invalid condition. Must be one of: ${validConditions.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Complete inspection
    await returnsService.inspectReturn({
      rmaId,
      orgId,
      inspectorId: session.user.id,
      condition,
      restockable,
      inspectionNotes,
      inspectionPhotos,
    });

    return NextResponse.json({
      success: true,
      message: "Inspection completed successfully",
    });
  } catch (error) {
    logger.error("Inspect return error", error as Error, { userId });
    return NextResponse.json(
      {
        error: "Failed to complete inspection",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
