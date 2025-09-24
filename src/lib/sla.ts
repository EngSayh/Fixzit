/**
 * SLA (Service Level Agreement) utility functions
 */

export interface SlaConfig {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  escalationTimeMinutes: number;
}

// Default SLA configurations
const DEFAULT_SLA_CONFIG: Record<string, SlaConfig> = {
  LOW: {
    priority: 'LOW',
    responseTimeMinutes: 480, // 8 hours
    resolutionTimeMinutes: 2880, // 48 hours
    escalationTimeMinutes: 1440 // 24 hours
  },
  MEDIUM: {
    priority: 'MEDIUM',
    responseTimeMinutes: 240, // 4 hours
    resolutionTimeMinutes: 1440, // 24 hours
    escalationTimeMinutes: 720 // 12 hours
  },
  HIGH: {
    priority: 'HIGH',
    responseTimeMinutes: 60, // 1 hour
    resolutionTimeMinutes: 480, // 8 hours
    escalationTimeMinutes: 240 // 4 hours
  },
  CRITICAL: {
    priority: 'CRITICAL',
    responseTimeMinutes: 15, // 15 minutes
    resolutionTimeMinutes: 120, // 2 hours
    escalationTimeMinutes: 60 // 1 hour
  }
};

/**
 * Compute due date based on creation time and priority
 */
export function computeDueAt(
  createdAt: Date, 
  priority: string = 'MEDIUM',
  type: 'response' | 'resolution' | 'escalation' = 'resolution'
): Date {
  const config = DEFAULT_SLA_CONFIG[priority.toUpperCase()] || DEFAULT_SLA_CONFIG.MEDIUM;
  const minutes = type === 'response' 
    ? config.responseTimeMinutes
    : type === 'escalation' 
    ? config.escalationTimeMinutes
    : config.resolutionTimeMinutes;

  const dueAt = new Date(createdAt);
  dueAt.setMinutes(dueAt.getMinutes() + minutes);
  
  return dueAt;
}

/**
 * Compute SLA minutes based on priority and type
 */
export function computeSlaMinutes(
  priority: string = 'MEDIUM',
  type: 'response' | 'resolution' | 'escalation' = 'resolution'
): number {
  const config = DEFAULT_SLA_CONFIG[priority.toUpperCase()] || DEFAULT_SLA_CONFIG.MEDIUM;
  
  switch (type) {
    case 'response':
      return config.responseTimeMinutes;
    case 'escalation':
      return config.escalationTimeMinutes;
    case 'resolution':
    default:
      return config.resolutionTimeMinutes;
  }
}

/**
 * Check if SLA is breached
 */
export function isSlaBreached(
  createdAt: Date,
  currentTime: Date = new Date(),
  priority: string = 'MEDIUM',
  type: 'response' | 'resolution' | 'escalation' = 'resolution'
): boolean {
  const dueAt = computeDueAt(createdAt, priority, type);
  return currentTime > dueAt;
}

/**
 * Get remaining time until SLA breach
 */
export function getRemainingTime(
  createdAt: Date,
  currentTime: Date = new Date(),
  priority: string = 'MEDIUM',
  type: 'response' | 'resolution' | 'escalation' = 'resolution'
): number {
  const dueAt = computeDueAt(createdAt, priority, type);
  const remainingMs = dueAt.getTime() - currentTime.getTime();
  return Math.max(0, Math.floor(remainingMs / (1000 * 60))); // Return minutes
}

/**
 * Get SLA status
 */
export function getSlaStatus(
  createdAt: Date,
  currentTime: Date = new Date(),
  priority: string = 'MEDIUM',
  type: 'response' | 'resolution' | 'escalation' = 'resolution'
): {
  status: 'ok' | 'warning' | 'breached';
  remainingMinutes: number;
  dueAt: Date;
} {
  const dueAt = computeDueAt(createdAt, priority, type);
  const remainingMinutes = getRemainingTime(createdAt, currentTime, priority, type);
  const totalMinutes = computeSlaMinutes(priority, type);
  
  let status: 'ok' | 'warning' | 'breached';
  if (remainingMinutes <= 0) {
    status = 'breached';
  } else if (remainingMinutes <= totalMinutes * 0.25) { // Warning when 25% time left
    status = 'warning';
  } else {
    status = 'ok';
  }

  return {
    status,
    remainingMinutes,
    dueAt
  };
}

/**
 * Format remaining time as human readable string
 */
export function formatRemainingTime(minutes: number): string {
  if (minutes <= 0) return 'Overdue';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    return `${hours}h ${mins}m`;
  } else {
    return `${mins}m`;
  }
}

/**
 * Get all SLA configurations
 */
export function getAllSlaConfigs(): Record<string, SlaConfig> {
  return DEFAULT_SLA_CONFIG;
}

/**
 * Update SLA configuration (for custom implementations)
 */
export function updateSlaConfig(priority: string, config: Partial<SlaConfig>): void {
  const existing = DEFAULT_SLA_CONFIG[priority.toUpperCase()];
  if (existing) {
    DEFAULT_SLA_CONFIG[priority.toUpperCase()] = { ...existing, ...config };
  }
}