import { getPermittedTools } from "../policy";
import { CopilotSession } from "../session";

export async function ensureToolAllowed(session: CopilotSession, tool: string) {
  const allowed = getPermittedTools(session.role);
  if (!allowed.includes(tool)) {
    const error = new Error("Tool not permitted for this role") as Error & {
      code: string;
    };
    error.code = "FORBIDDEN";
    throw error;
  }
}
