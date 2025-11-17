import { CopilotSession } from "./session";
import { logger } from '@/lib/logger';

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
  try {
    const { CopilotAudit } = await import('@/server/models/CopilotAudit') as any;
    await CopilotAudit.create({
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
      metadata: options.metadata
    });
  } catch (error) {
    logger.error("Failed to record copilot audit", { error });
  }
}
