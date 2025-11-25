import { NextRequest, NextResponse } from "next/server";
import { resolveCopilotSession } from "@/server/copilot/session";
import { getPermittedTools } from "@/server/copilot/policy";

import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * @openapi
 * /api/copilot/profile:
 *   get:
 *     summary: copilot/profile operations
 *     tags: [copilot]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const session = await resolveCopilotSession(req);
  const tools = getPermittedTools(session.role);

  return NextResponse.json({
    session,
    tools,
    quickActions: tools.map((tool) => ({
      name: tool,
      label: mapToolToLabel(tool, session.locale),
      description: mapToolToDescription(tool, session.locale),
    })),
  });
}

function mapToolToLabel(tool: string, locale: string) {
  switch (tool) {
    case "createWorkOrder":
      return locale === "ar" ? "إنشاء أمر عمل" : "Create work order";
    case "listMyWorkOrders":
      return locale === "ar" ? "عرض أوامري" : "My work orders";
    case "dispatchWorkOrder":
      return locale === "ar" ? "إسناد أمر عمل" : "Dispatch work order";
    case "scheduleVisit":
      return locale === "ar" ? "تحديد موعد" : "Schedule visit";
    case "uploadWorkOrderPhoto":
      return locale === "ar" ? "رفع صورة" : "Upload photo";
    case "ownerStatements":
      return locale === "ar" ? "بيانات المالك" : "Owner statements";
    default:
      return tool;
  }
}

function mapToolToDescription(tool: string, locale: string) {
  switch (tool) {
    case "createWorkOrder":
      return locale === "ar"
        ? "إبلاغ فريق الصيانة بمشكلة جديدة"
        : "Raise a new maintenance request.";
    case "listMyWorkOrders":
      return locale === "ar"
        ? "استعرض أحدث أوامر العمل المرتبطة بك"
        : "See your latest maintenance tickets.";
    case "dispatchWorkOrder":
      return locale === "ar"
        ? "إسناد مهمة لفني أو مورد"
        : "Assign the work order to a technician or vendor.";
    case "scheduleVisit":
      return locale === "ar"
        ? "حدد وقت زيارة أو متابعة"
        : "Set the next visit date/time.";
    case "uploadWorkOrderPhoto":
      return locale === "ar"
        ? "أرفق صوراً للحالة"
        : "Attach site photos for context.";
    case "ownerStatements":
      return locale === "ar"
        ? "ملخص الدخل والمصروفات"
        : "Summaries of income vs expenses.";
    default:
      return "";
  }
}
