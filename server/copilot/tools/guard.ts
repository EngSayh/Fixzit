import { getPermittedTools } from "../policy";
import { CopilotSession } from "../session";

/**
 * Validates that a tool is permitted for the given session's role.
 * Throws a FORBIDDEN error if the tool is not allowed.
 */
export function ensureToolAllowed(session: CopilotSession, tool: string): void {
  const allowed = getPermittedTools(session.role);
  if (!allowed.includes(tool)) {
    const error = new Error(`Tool '${tool}' not permitted for role '${session.role}'`);
    (error as Error & { code: string }).code = "FORBIDDEN";
    throw error;
  }
}
