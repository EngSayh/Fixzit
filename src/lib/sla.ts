export function computeSlaMinutes(priority: 'LOW'|'MEDIUM'|'HIGH'|'URGENT' = 'MEDIUM'): number {
  switch (priority) {
    case 'LOW': return 72 * 60; // 3 days
    case 'MEDIUM': return 24 * 60; // 1 day
    case 'HIGH': return 8 * 60; // 8 hours
    case 'URGENT': return 2 * 60; // 2 hours
    default: return 24 * 60;
  }
}

export function computeDueAt(createdAt: Date = new Date(), minutes: number): Date {
  return new Date(createdAt.getTime() + minutes * 60 * 1000);
}

