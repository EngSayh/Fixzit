export function computeDueAt(createdAt: Date, priority: string, category: string): Date {
  const baseMinutes = getBaseMinutes(priority, category);
  const dueAt = new Date(createdAt.getTime() + baseMinutes * 60 * 1000);
  return dueAt;
}

export function computeSlaMinutes(priority: string, category: string): number {
  return getBaseMinutes(priority, category);
}

function getBaseMinutes(priority: string, category: string): number {
  // Base SLA times in minutes
  const priorityMultipliers: Record<string, number> = {
    'CRITICAL': 0.5,    // 30 minutes
    'HIGH': 1,          // 1 hour
    'MEDIUM': 4,        // 4 hours
    'LOW': 24,          // 24 hours
    'URGENT': 0.25      // 15 minutes
  };

  const categoryMultipliers: Record<string, number> = {
    'ELECTRICAL': 1.2,
    'PLUMBING': 1.1,
    'HVAC': 1.3,
    'SECURITY': 0.8,
    'ELEVATOR': 1.5,
    'GENERAL': 1.0
  };

  const baseMinutes = priorityMultipliers[priority] || 4; // Default to MEDIUM
  const categoryMultiplier = categoryMultipliers[category] || 1.0;
  
  return Math.round(baseMinutes * categoryMultiplier * 60); // Convert to minutes
}