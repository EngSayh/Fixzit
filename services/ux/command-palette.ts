/**
 * Command Palette Service
 * 
 * Implements a Spotlight/Alfred-style command palette (Cmd+K)
 * for power users with:
 * - Permission-aware global search
 * - Quick actions
 * - Keyboard shortcuts
 * - Recent items
 * 
 * @module services/ux/command-palette
 */

// =============================================================================
// TYPES
// =============================================================================

export type CommandCategory =
  | "navigation"
  | "action"
  | "search"
  | "recent"
  | "quick_create"
  | "settings"
  | "help";

export type CommandIcon =
  | "search"
  | "home"
  | "users"
  | "building"
  | "wrench"
  | "invoice"
  | "settings"
  | "plus"
  | "eye"
  | "edit"
  | "trash"
  | "download"
  | "upload"
  | "refresh"
  | "help"
  | "keyboard"
  | "moon"
  | "sun"
  | "globe"
  | "shield"
  | "chart"
  | "calendar"
  | "mail"
  | "bell";

export interface Command {
  /** Unique command ID */
  id: string;
  /** Display label */
  label: string;
  /** Optional subtitle/description */
  description?: string;
  /** Category for grouping */
  category: CommandCategory;
  /** Icon name */
  icon: CommandIcon;
  /** Keyboard shortcut (e.g., "mod+shift+p") */
  shortcut?: string;
  /** Required permissions */
  permissions?: string[];
  /** Required roles */
  roles?: string[];
  /** Keywords for search matching */
  keywords: string[];
  /** Action to execute */
  action: CommandAction;
  /** Is this command tenant-scoped */
  tenantScoped?: boolean;
  /** Priority for ordering (higher = more prominent) */
  priority?: number;
  /** Is this command currently available */
  available?: boolean;
}

export type CommandAction =
  | { type: "navigate"; path: string }
  | { type: "modal"; modalId: string; props?: Record<string, unknown> }
  | { type: "function"; handler: string }
  | { type: "external"; url: string }
  | { type: "copy"; value: string }
  | { type: "toggle"; setting: string };

export interface CommandGroup {
  category: CommandCategory;
  label: string;
  commands: Command[];
}

export interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  filteredCommands: Command[];
  recentCommands: string[];
  isLoading: boolean;
}

// =============================================================================
// DEFAULT COMMANDS
// =============================================================================

export const SUPERADMIN_COMMANDS: Command[] = [
  // Navigation Commands
  {
    id: "nav-dashboard",
    label: "Go to Dashboard",
    description: "Main dashboard overview",
    category: "navigation",
    icon: "home",
    shortcut: "mod+shift+d",
    keywords: ["home", "dashboard", "overview", "main"],
    action: { type: "navigate", path: "/superadmin" },
    priority: 100,
  },
  {
    id: "nav-tenants",
    label: "Go to Tenants",
    description: "Manage all tenants",
    category: "navigation",
    icon: "building",
    shortcut: "mod+shift+t",
    keywords: ["tenants", "organizations", "companies", "customers"],
    action: { type: "navigate", path: "/superadmin/tenants" },
    priority: 95,
  },
  {
    id: "nav-users",
    label: "Go to Users",
    description: "Manage all users",
    category: "navigation",
    icon: "users",
    shortcut: "mod+shift+u",
    keywords: ["users", "accounts", "people", "members"],
    action: { type: "navigate", path: "/superadmin/users" },
    priority: 90,
  },
  {
    id: "nav-compliance",
    label: "Go to Compliance",
    description: "ZATCA, NCA, PDPL dashboards",
    category: "navigation",
    icon: "shield",
    keywords: ["compliance", "zatca", "nca", "pdpl", "regulatory"],
    action: { type: "navigate", path: "/superadmin/compliance" },
    priority: 85,
  },
  {
    id: "nav-security",
    label: "Go to Security",
    description: "Security settings and audit logs",
    category: "navigation",
    icon: "shield",
    keywords: ["security", "audit", "logs", "access", "permissions"],
    action: { type: "navigate", path: "/superadmin/security" },
    priority: 80,
  },
  {
    id: "nav-analytics",
    label: "Go to Analytics",
    description: "Platform analytics and insights",
    category: "navigation",
    icon: "chart",
    keywords: ["analytics", "metrics", "insights", "reports", "data"],
    action: { type: "navigate", path: "/superadmin/analytics" },
    priority: 75,
  },
  
  // Quick Actions
  {
    id: "action-create-tenant",
    label: "Create New Tenant",
    description: "Add a new organization",
    category: "quick_create",
    icon: "plus",
    shortcut: "mod+shift+n",
    keywords: ["create", "new", "tenant", "organization", "add"],
    action: { type: "modal", modalId: "create-tenant" },
    permissions: ["tenants:create"],
    priority: 100,
  },
  {
    id: "action-create-user",
    label: "Create New User",
    description: "Add a new user account",
    category: "quick_create",
    icon: "plus",
    keywords: ["create", "new", "user", "account", "add"],
    action: { type: "modal", modalId: "create-user" },
    permissions: ["users:create"],
    priority: 95,
  },
  {
    id: "action-impersonate",
    label: "Impersonate User",
    description: "Ghost mode - view as another user",
    category: "action",
    icon: "eye",
    keywords: ["impersonate", "ghost", "view", "as", "user", "debug"],
    action: { type: "modal", modalId: "ghost-mode" },
    permissions: ["users:impersonate"],
    roles: ["SUPER_ADMIN"],
    priority: 80,
  },
  {
    id: "action-freeze-tenant",
    label: "Freeze Tenant",
    description: "Temporarily disable a tenant",
    category: "action",
    icon: "shield",
    keywords: ["freeze", "disable", "suspend", "tenant", "block"],
    action: { type: "modal", modalId: "freeze-tenant" },
    permissions: ["tenants:freeze"],
    roles: ["SUPER_ADMIN"],
    priority: 60,
  },
  {
    id: "action-export-data",
    label: "Export Data",
    description: "Export platform data",
    category: "action",
    icon: "download",
    keywords: ["export", "download", "data", "csv", "report"],
    action: { type: "modal", modalId: "export-data" },
    permissions: ["data:export"],
    priority: 50,
  },
  
  // Settings
  {
    id: "settings-theme",
    label: "Toggle Dark Mode",
    description: "Switch between light and dark themes",
    category: "settings",
    icon: "moon",
    shortcut: "mod+shift+l",
    keywords: ["dark", "light", "theme", "mode", "toggle"],
    action: { type: "toggle", setting: "theme" },
    priority: 90,
  },
  {
    id: "settings-language",
    label: "Change Language",
    description: "Switch interface language",
    category: "settings",
    icon: "globe",
    keywords: ["language", "arabic", "english", "locale", "translation"],
    action: { type: "modal", modalId: "language-selector" },
    priority: 85,
  },
  {
    id: "settings-notifications",
    label: "Notification Settings",
    description: "Configure alerts and notifications",
    category: "settings",
    icon: "bell",
    keywords: ["notifications", "alerts", "settings", "configure"],
    action: { type: "navigate", path: "/superadmin/settings/notifications" },
    priority: 70,
  },
  
  // Help
  {
    id: "help-shortcuts",
    label: "Keyboard Shortcuts",
    description: "View all available shortcuts",
    category: "help",
    icon: "keyboard",
    shortcut: "mod+/",
    keywords: ["keyboard", "shortcuts", "help", "keys", "hotkeys"],
    action: { type: "modal", modalId: "shortcuts-help" },
    priority: 100,
  },
  {
    id: "help-docs",
    label: "Documentation",
    description: "Open documentation in new tab",
    category: "help",
    icon: "help",
    keywords: ["documentation", "docs", "help", "guide", "manual"],
    action: { type: "external", url: "https://docs.fixzit.app" },
    priority: 90,
  },
  {
    id: "help-support",
    label: "Contact Support",
    description: "Get help from support team",
    category: "help",
    icon: "mail",
    keywords: ["support", "help", "contact", "ticket", "issue"],
    action: { type: "modal", modalId: "contact-support" },
    priority: 80,
  },
];

// =============================================================================
// KEYBOARD SHORTCUTS
// =============================================================================

export interface KeyboardShortcut {
  id: string;
  keys: string;
  description: string;
  category: string;
  action: () => void | Promise<void>;
  enabled?: boolean;
}

export const KEYBOARD_SHORTCUTS: Omit<KeyboardShortcut, "action">[] = [
  // Global
  { id: "open-palette", keys: "mod+k", description: "Open command palette", category: "Global" },
  { id: "close-modal", keys: "escape", description: "Close modal/palette", category: "Global" },
  { id: "toggle-theme", keys: "mod+shift+l", description: "Toggle dark mode", category: "Global" },
  { id: "show-shortcuts", keys: "mod+/", description: "Show keyboard shortcuts", category: "Global" },
  
  // Navigation
  { id: "go-dashboard", keys: "mod+shift+d", description: "Go to Dashboard", category: "Navigation" },
  { id: "go-tenants", keys: "mod+shift+t", description: "Go to Tenants", category: "Navigation" },
  { id: "go-users", keys: "mod+shift+u", description: "Go to Users", category: "Navigation" },
  { id: "go-back", keys: "mod+[", description: "Go back", category: "Navigation" },
  { id: "go-forward", keys: "mod+]", description: "Go forward", category: "Navigation" },
  
  // Actions
  { id: "quick-create", keys: "mod+shift+n", description: "Quick create", category: "Actions" },
  { id: "search", keys: "mod+f", description: "Focus search", category: "Actions" },
  { id: "save", keys: "mod+s", description: "Save changes", category: "Actions" },
  { id: "refresh", keys: "mod+r", description: "Refresh data", category: "Actions" },
  
  // Table/List
  { id: "select-all", keys: "mod+a", description: "Select all items", category: "Table" },
  { id: "delete-selected", keys: "mod+backspace", description: "Delete selected", category: "Table" },
  { id: "next-page", keys: "mod+.", description: "Next page", category: "Table" },
  { id: "prev-page", keys: "mod+,", description: "Previous page", category: "Table" },
];

// =============================================================================
// SEARCH & FILTERING
// =============================================================================

/**
 * Filter commands based on search query
 */
export function filterCommands(
  commands: Command[],
  query: string,
  userPermissions: string[] = [],
  userRoles: string[] = []
): Command[] {
  if (!query.trim()) {
    // Return all available commands sorted by priority
    return commands
      .filter(cmd => isCommandAvailable(cmd, userPermissions, userRoles))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  const words = normalizedQuery.split(/\s+/);
  
  return commands
    .filter(cmd => isCommandAvailable(cmd, userPermissions, userRoles))
    .map(cmd => {
      const score = calculateMatchScore(cmd, words);
      return { command: cmd, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ command }) => command);
}

/**
 * Check if command is available to user
 */
function isCommandAvailable(
  command: Command,
  userPermissions: string[],
  userRoles: string[]
): boolean {
  if (command.available === false) {
    return false;
  }
  
  // Check role requirements
  if (command.roles && command.roles.length > 0) {
    if (!command.roles.some(role => userRoles.includes(role))) {
      return false;
    }
  }
  
  // Check permission requirements
  if (command.permissions && command.permissions.length > 0) {
    if (!command.permissions.some(perm => userPermissions.includes(perm))) {
      return false;
    }
  }
  
  return true;
}

/**
 * Calculate search match score for a command
 */
function calculateMatchScore(command: Command, queryWords: string[]): number {
  let score = 0;
  const label = command.label.toLowerCase();
  const description = (command.description ?? "").toLowerCase();
  const keywords = command.keywords.map(k => k.toLowerCase());
  
  for (const word of queryWords) {
    // Exact label match (highest score)
    if (label === word) {
      score += 100;
    } else if (label.startsWith(word)) {
      score += 80;
    } else if (label.includes(word)) {
      score += 50;
    }
    
    // Keyword match
    for (const keyword of keywords) {
      if (keyword === word) {
        score += 60;
      } else if (keyword.startsWith(word)) {
        score += 40;
      } else if (keyword.includes(word)) {
        score += 20;
      }
    }
    
    // Description match
    if (description.includes(word)) {
      score += 10;
    }
  }
  
  // Boost by priority
  score += (command.priority ?? 0) / 10;
  
  return score;
}

/**
 * Group commands by category
 */
export function groupCommandsByCategory(commands: Command[]): CommandGroup[] {
  const categoryLabels: Record<CommandCategory, string> = {
    navigation: "Navigation",
    action: "Actions",
    search: "Search Results",
    recent: "Recent",
    quick_create: "Quick Create",
    settings: "Settings",
    help: "Help",
  };
  
  const categoryOrder: CommandCategory[] = [
    "recent",
    "quick_create",
    "action",
    "navigation",
    "search",
    "settings",
    "help",
  ];
  
  const groups: Map<CommandCategory, Command[]> = new Map();
  
  for (const command of commands) {
    const existing = groups.get(command.category) ?? [];
    groups.set(command.category, [...existing, command]);
  }
  
  return categoryOrder
    .filter(category => groups.has(category))
    .map(category => ({
      category,
      label: categoryLabels[category],
      commands: groups.get(category)!,
    }));
}

// =============================================================================
// RECENT COMMANDS
// =============================================================================

const RECENT_COMMANDS_KEY = "fixzit_recent_commands";
const MAX_RECENT_COMMANDS = 5;

/**
 * Get recent commands from localStorage
 */
export function getRecentCommands(): string[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add command to recent list
 */
export function addRecentCommand(commandId: string): void {
  if (typeof window === "undefined") return;
  
  try {
    const recent = getRecentCommands().filter(id => id !== commandId);
    recent.unshift(commandId);
    
    localStorage.setItem(
      RECENT_COMMANDS_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT_COMMANDS))
    );
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get commands marked as recent
 */
export function getRecentCommandObjects(
  allCommands: Command[],
  recentIds: string[]
): Command[] {
  return recentIds
    .map(id => allCommands.find(cmd => cmd.id === id))
    .filter((cmd): cmd is Command => cmd !== undefined)
    .map(cmd => ({ ...cmd, category: "recent" as CommandCategory }));
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Detect if the user is on macOS
 * Uses User-Agent Client Hints if available, fallback to navigator.platform
 */
function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  if (uaData?.platform) {
    return uaData.platform.toLowerCase() === "macos";
  }
  return /Mac|iPod|iPhone|iPad/i.test(navigator.platform);
}

/**
 * Format keyboard shortcut for display
 */
export function formatShortcut(shortcut: string): string {
  const isMac = isMacPlatform();
  
  return shortcut
    .replace(/mod/g, isMac ? "⌘" : "Ctrl")
    .replace(/shift/g, isMac ? "⇧" : "Shift")
    .replace(/alt/g, isMac ? "⌥" : "Alt")
    .replace(/\+/g, " + ")
    .toUpperCase();
}

/**
 * Parse keyboard shortcut to key combination
 */
export function parseShortcut(shortcut: string): {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
} {
  const parts = shortcut.toLowerCase().split("+");
  
  return {
    key: parts[parts.length - 1],
    mod: parts.includes("mod"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
  };
}

/**
 * Check if keyboard event matches shortcut
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcut(shortcut);
  const isMac = typeof navigator !== "undefined" 
    ? /Mac|iPod|iPhone|iPad/.test(navigator.platform) 
    : false;
  
  const modKey = isMac ? event.metaKey : event.ctrlKey;
  const normalizedKey = typeof event.key === "string" ? event.key.toLowerCase() : "";
  
  return (
    normalizedKey === parsed.key &&
    modKey === parsed.mod &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt
  );
}
