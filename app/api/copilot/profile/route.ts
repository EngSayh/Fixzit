import { NextRequest, NextResponse } from "next/server";
import { resolveCopilotSession } from "@/server/copilot/session";
import { getPermittedTools } from "@/server/copilot/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await resolveCopilotSession(req);
  const tools = getPermittedTools(session.role);

  return NextResponse.json({
    session,
    tools,
    quickActions: tools.map(tool => ({
      name: tool,
      label: mapToolToLabel(tool, session.locale),
      description: mapToolToDescription(tool, session.locale)
    }))
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
      return locale === "ar" ? "إبلاغ فريق الصيانة بمشكلة جديدة" : "Raise a new maintenance request.";
    case "listMyWorkOrders":
      return locale === "ar" ? "استعرض أحدث أوامر العمل المرتبطة بك" : "See your latest maintenance tickets.";
    case "dispatchWorkOrder":
      return locale === "ar" ? "إسناد مهمة لفني أو مورد" : "Assign the work order to a technician or vendor.";
    case "scheduleVisit":
      return locale === "ar" ? "حدد وقت زيارة أو متابعة" : "Set the next visit date/time.";
    case "uploadWorkOrderPhoto":
      return locale === "ar" ? "أرفق صوراً للحالة" : "Attach site photos for context.";
    case "ownerStatements":
      return locale === "ar" ? "ملخص الدخل والمصروفات" : "Summaries of income vs expenses.";
    default:
      return "";
  }
}
