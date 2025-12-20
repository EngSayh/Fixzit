import type { CopilotSession } from "./session";
import type { ToolExecutionResult, UploadPayload } from "./tools/types";
import {
  createWorkOrder,
  listMyWorkOrders,
  dispatchWorkOrder,
  scheduleVisit,
  uploadWorkOrderPhoto,
} from "./tools/work-orders";
import { approveQuotation } from "./tools/quotations";
import { ownerStatements } from "./tools/owner-statements";

export type { ToolExecutionResult, UploadPayload } from "./tools/types";

export async function executeTool(
  tool: string,
  input: Record<string, unknown>,
  session: CopilotSession,
): Promise<ToolExecutionResult> {
  switch (tool) {
    case "createWorkOrder":
      return createWorkOrder(session, input);
    case "listMyWorkOrders":
      return listMyWorkOrders(session);
    case "dispatchWorkOrder":
      return dispatchWorkOrder(session, input);
    case "scheduleVisit":
      return scheduleVisit(session, input);
    case "uploadWorkOrderPhoto":
      // Validate input matches UploadPayload structure before calling
      if (
        !input.workOrderId ||
        !input.fileName ||
        !input.mimeType ||
        !input.buffer
      ) {
        throw new Error("Invalid upload payload: missing required fields");
      }
      return uploadWorkOrderPhoto(session, input as unknown as UploadPayload);
    case "approveQuotation":
      return approveQuotation(session, input);
    case "ownerStatements":
      return ownerStatements(session, input);
    default:
      throw new Error(`Unsupported tool: ${tool}`);
  }
}

export function detectToolFromMessage(
  message: string,
): { name: string; args: Record<string, unknown> } | null {
  const normalized = message.trim();
  if (normalized.startsWith("/new-ticket")) {
    const parts = normalized.split(" ").slice(1);
    const args: Record<string, string> = {};
    let currentKey: string | null = null;

    for (const part of parts) {
      if (part.includes(":")) {
        const [key, ...rest] = part.split(":");
        if (key && rest.length) {
          currentKey = key;
          args[currentKey] = rest.join(":");
        }
      } else if (currentKey) {
        args[currentKey] = `${args[currentKey]} ${part}`.trim();
      }
    }

    return { name: "createWorkOrder", args };
  }

  if (/^\/my-?tickets?/i.test(normalized)) {
    return { name: "listMyWorkOrders", args: {} };
  }

  if (/^\/dispatch/i.test(normalized)) {
    const [, workOrderId] = normalized.split(" ");
    if (workOrderId) {
      return { name: "dispatchWorkOrder", args: { workOrderId } };
    }
  }

  if (/approve.*quotation|quotation.*approve|موافقة.*عرض/i.test(normalized)) {
    const quotationIdMatch = normalized.match(
      /(?:quotation|عرض)\s*[#:]?\s*([A-Z0-9-]+)/i,
    );
    const quotationId = quotationIdMatch ? quotationIdMatch[1] : undefined;
    return {
      name: "approveQuotation",
      args: quotationId ? { quotationId } : {},
    };
  }

  if (/^\/owner-statements/i.test(normalized)) {
    const [, period] = normalized.split(" ");
    return { name: "ownerStatements", args: period ? { period } : {} };
  }

  return null;
}
