/**
 * Agent Token Protocol - Auto-Generation Utility
 * 
 * Per AGENTS.md v7.0 Section 3, every action must include an Agent Token.
 * This utility auto-generates tokens based on agent type and file context.
 * 
 * @module lib/agent-token
 * @author [AGENT-001-A]
 */

// =============================================================================
// AGENT ID ASSIGNMENT TABLE (from AGENTS.md Section 3.2)
// =============================================================================

export const AgentType = {
  VSCODE_COPILOT: '001',
  CLAUDE_CODE: '002',
  CODEX: '003',
  CURSOR: '004',
  WINDSURF: '005',
  TESTS_SCRIPTS: '006',
} as const;

export type AgentTypeCode = typeof AgentType[keyof typeof AgentType];

export const AgentInstance = {
  A: 'A',
  B: 'B',
  C: 'C',
} as const;

export type AgentInstanceLetter = typeof AgentInstance[keyof typeof AgentInstance];

// File path patterns mapped to agent types (from AGENTS.md Section 3.2)
const PATH_TO_AGENT: Array<{ patterns: RegExp[]; agentType: AgentTypeCode }> = [
  // AGENT-006: Tests/Scripts
  {
    patterns: [
      /^tests\//,
      /^__tests__\//,
      /^scripts\//,
      /^cypress\//,
      /^playwright\//,
      /^\.github\/workflows\//,
    ],
    agentType: AgentType.TESTS_SCRIPTS,
  },
  // AGENT-002: Finance/Billing
  {
    patterns: [
      /^app\/api\/finance\//,
      /^app\/api\/billing\//,
      /^lib\/payments\//,
      /^lib\/invoices\//,
      /^lib\/tax\//,
      /^lib\/currency\//,
      /^domain\/finance\//,
      /^services\/finance\//,
    ],
    agentType: AgentType.CLAUDE_CODE,
  },
  // AGENT-003: Souq/Marketplace
  {
    patterns: [
      /^app\/api\/souq\//,
      /^app\/api\/marketplace\//,
      /^lib\/products\//,
      /^lib\/orders\//,
      /^lib\/cart\//,
      /^lib\/shipping\//,
      /^services\/souq\//,
    ],
    agentType: AgentType.CODEX,
  },
  // AGENT-004: Aqar/Real Estate
  {
    patterns: [
      /^app\/api\/aqar\//,
      /^app\/api\/properties\//,
      /^lib\/listings\//,
      /^lib\/bookings\//,
      /^lib\/contracts\//,
      /^services\/aqar\//,
    ],
    agentType: AgentType.CURSOR,
  },
  // AGENT-005: HR/Payroll
  {
    patterns: [
      /^app\/api\/hr\//,
      /^app\/api\/payroll\//,
      /^lib\/attendance\//,
      /^lib\/leaves\//,
      /^lib\/salaries\//,
      /^services\/hr\//,
    ],
    agentType: AgentType.WINDSURF,
  },
  // AGENT-001: Core/Auth/Middleware (default/fallback)
  {
    patterns: [
      /^app\/api\/core\//,
      /^middleware/,
      /^lib\/auth\//,
      /^lib\/session\//,
      /^lib\/jwt\//,
      /^lib\/errors\//,
      /^lib\/logging\//,
      /^components\//,
      /^app\//,  // Fallback for other app routes
      /^lib\//,  // Fallback for other lib files
    ],
    agentType: AgentType.VSCODE_COPILOT,
  },
];

// =============================================================================
// CURRENT AGENT CONTEXT (set by environment or session)
// =============================================================================

/**
 * Current agent instance (A, B, or C)
 * Can be set via AGENT_INSTANCE env var or defaults to 'A'
 */
export function getCurrentInstance(): AgentInstanceLetter {
  const envInstance = process.env.AGENT_INSTANCE?.toUpperCase();
  if (envInstance === 'A' || envInstance === 'B' || envInstance === 'C') {
    return envInstance;
  }
  return 'A';
}

/**
 * Current agent type override
 * Can be set via AGENT_TYPE env var (e.g., 'COPILOT', 'CLAUDE', 'CODEX')
 */
export function getAgentTypeOverride(): AgentTypeCode | null {
  const envType = process.env.AGENT_TYPE?.toUpperCase();
  switch (envType) {
    case 'COPILOT':
    case 'VSCODE_COPILOT':
      return AgentType.VSCODE_COPILOT;
    case 'CLAUDE':
    case 'CLAUDE_CODE':
      return AgentType.CLAUDE_CODE;
    case 'CODEX':
      return AgentType.CODEX;
    case 'CURSOR':
      return AgentType.CURSOR;
    case 'WINDSURF':
      return AgentType.WINDSURF;
    default:
      return null;
  }
}

// =============================================================================
// TOKEN GENERATION
// =============================================================================

/**
 * Generate agent token from file path
 * 
 * @param filePath - Relative path from workspace root (e.g., 'app/api/finance/route.ts')
 * @param instance - Optional override for instance letter (A, B, C)
 * @returns Agent token in format [AGENT-XXX-Y]
 * 
 * @example
 * generateToken('app/api/finance/billing/route.ts') // '[AGENT-002-A]'
 * generateToken('tests/api/auth.test.ts')           // '[AGENT-006-A]'
 * generateToken('components/Button.tsx')            // '[AGENT-001-A]'
 */
export function generateToken(
  filePath: string,
  instance?: AgentInstanceLetter
): string {
  // Check for explicit agent type override
  const override = getAgentTypeOverride();
  if (override) {
    return formatToken(override, instance ?? getCurrentInstance());
  }

  // Normalize path (remove leading slashes, use forward slashes)
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');

  // Find matching agent type based on file path
  for (const mapping of PATH_TO_AGENT) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(normalizedPath)) {
        return formatToken(mapping.agentType, instance ?? getCurrentInstance());
      }
    }
  }

  // Default to AGENT-001 (VS Code Copilot / Core)
  return formatToken(AgentType.VSCODE_COPILOT, instance ?? getCurrentInstance());
}

/**
 * Format a token string
 */
export function formatToken(
  agentType: AgentTypeCode,
  instance: AgentInstanceLetter
): string {
  return `[AGENT-${agentType}-${instance}]`;
}

/**
 * Parse an existing token string
 * 
 * @param token - Token string like '[AGENT-001-A]'
 * @returns Parsed components or null if invalid
 */
export function parseToken(token: string): {
  agentType: AgentTypeCode;
  instance: AgentInstanceLetter;
} | null {
  const match = token.match(/^\[AGENT-(\d{3})-([A-C])\]$/);
  if (!match) return null;

  const typeCode = match[1] as AgentTypeCode;
  const instance = match[2] as AgentInstanceLetter;

  // Validate type code
  const validTypes = Object.values(AgentType);
  if (!validTypes.includes(typeCode)) return null;

  return { agentType: typeCode, instance };
}

/**
 * Validate an agent token format
 * 
 * @param token - Token to validate
 * @returns True if valid format
 */
export function isValidToken(token: string): boolean {
  return parseToken(token) !== null;
}

/**
 * Strip brackets from token for storage
 * 
 * @param token - Token with brackets like '[AGENT-001-A]'
 * @returns Token without brackets like 'AGENT-001-A'
 */
export function stripBrackets(token: string): string {
  return token.replace(/^\[|\]$/g, '');
}

/**
 * Add brackets to raw token
 * 
 * @param rawToken - Token without brackets like 'AGENT-001-A'
 * @returns Token with brackets like '[AGENT-001-A]'
 */
export function addBrackets(rawToken: string): string {
  if (rawToken.startsWith('[')) return rawToken;
  return `[${rawToken}]`;
}

// =============================================================================
// SSOT EVENT HELPERS
// =============================================================================

export interface AgentEventContext {
  agentId: string;         // e.g., 'AGENT-001-A'
  agentToken: string;      // e.g., '[AGENT-001-A]'
  timestamp: Date;
  sessionId?: string;
}

/**
 * Create event context for SSOT logging
 * 
 * @param filePath - Current file being worked on
 * @param sessionId - Optional session identifier
 * @returns Event context with agent token
 */
export function createEventContext(
  filePath: string,
  sessionId?: string
): AgentEventContext {
  const token = generateToken(filePath);
  return {
    agentId: stripBrackets(token),
    agentToken: token,
    timestamp: new Date(),
    sessionId: sessionId ?? `session-${Date.now()}`,
  };
}

/**
 * Get agent description for logs/UI
 * 
 * @param agentType - Agent type code
 * @returns Human-readable agent name
 */
export function getAgentName(agentType: AgentTypeCode): string {
  switch (agentType) {
    case AgentType.VSCODE_COPILOT:
      return 'VS Code Copilot';
    case AgentType.CLAUDE_CODE:
      return 'Claude Code';
    case AgentType.CODEX:
      return 'Codex';
    case AgentType.CURSOR:
      return 'Cursor';
    case AgentType.WINDSURF:
      return 'Windsurf';
    case AgentType.TESTS_SCRIPTS:
      return 'Tests/Scripts Agent';
    default:
      return 'Unknown Agent';
  }
}

// =============================================================================
// COMMIT MESSAGE HELPERS
// =============================================================================

/**
 * Format a commit message with agent token
 * 
 * @param type - Commit type (feat, fix, chore, etc.)
 * @param scope - Scope of change
 * @param description - Commit description
 * @param filePath - Primary file being changed (for token generation)
 * @param issueKey - Optional issue key (e.g., 'BUG-214')
 * @returns Formatted commit message
 * 
 * @example
 * formatCommitMessage('fix', 'api', 'handle JSON parse errors', 'app/api/issues/route.ts', 'BUG-214')
 * // 'fix(api): handle JSON parse errors [AGENT-001-A] [BUG-214]'
 */
export function formatCommitMessage(
  type: string,
  scope: string,
  description: string,
  filePath: string,
  issueKey?: string
): string {
  const token = generateToken(filePath);
  let message = `${type}(${scope}): ${description} ${token}`;
  if (issueKey) {
    message += ` [${issueKey}]`;
  }
  return message;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  AgentType,
  AgentInstance,
  generateToken,
  parseToken,
  isValidToken,
  formatToken,
  stripBrackets,
  addBrackets,
  createEventContext,
  getAgentName,
  formatCommitMessage,
  getCurrentInstance,
  getAgentTypeOverride,
};
