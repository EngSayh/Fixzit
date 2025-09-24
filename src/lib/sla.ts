export function computeSlaMinutes(priority: 'LOW'|'MEDIUM'|'HIGH'|'URGENT' = 'MEDIUM'): number {
  switch (priority) {
    case 'LOW': return 72 * 60;
    case 'MEDIUM': return 24 * 60;
    case 'HIGH': return 8 * 60;
    case 'URGENT': return 2 * 60;
    default: return 24 * 60;
  }
}

export function computeDueAt(createdAt: Date = new Date(), minutes: number): Date {
  return new Date(createdAt.getTime() + minutes * 60 * 1000);
}

