import { CopilotSession } from "./session";
import { logger } from "@/lib/logger";
import { setTenantContext } from "../plugins/tenantIsolation";
import { isMongoOffline } from "@/lib/mongodb-unified";

export interface AuditOptions {
  session: CopilotSession;
  intent: string;
  tool?: string;
  status: "SUCCESS" | "DENIED" | "ERROR";
  message?: string;
  prompt?: string;
  response?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(options: AuditOptions) {
  // Skip audit recording in offline mode (no MongoDB connection)
  if (isMongoOffline()) {
    logger.info("[CopilotAudit] Skipping audit in offline mode", {
      intent: options.intent,
      status: options.status,
    });
    return;
  }

  // Ensure tenant context is set so tenantIsolation plugin can inject orgId
  setTenantContext({ orgId: options.session.tenantId });
  try {
    const { CopilotAudit } = await import("@/server/models/CopilotAudit");
    await CopilotAudit.create({
      orgId: options.session.tenantId,
      tenantId: options.session.tenantId,
      userId: options.session.userId,
      role: options.session.role,
      locale: options.session.locale,
      intent: options.intent,
      tool: options.tool,
      status: options.status,
      message: options.message,
      prompt: options.prompt,
      response: options.response,
      metadata: options.metadata,
    });
  } catch (error) {
    logger.error("Failed to record copilot audit", { error });
  }
}
