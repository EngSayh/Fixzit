export function computeSlaMinutes(priority: string): number {
  switch ((priority || '').toUpperCase()) {
    case 'URGENT': return 240; // 4h
    case 'HIGH': return 24 * 60; // 1 day
    case 'MEDIUM': return 3 * 24 * 60; // 3 days
    case 'LOW': return 7 * 24 * 60; // 7 days
    default: return 3 * 24 * 60;
  }
}

export function computeDueAt(createdAt: Date | string | number, slaMinutes: number): Date {
  const base = new Date(createdAt || Date.now());
  return new Date(base.getTime() + Math.max(0, slaMinutes) * 60 * 1000);
}