export type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export function computeSlaMinutes(priority: Priority): number {
  switch (priority) {
    case 'URGENT':
      return 4 * 60; // 4h
    case 'HIGH':
      return 24 * 60; // 24h
    case 'MEDIUM':
      return 72 * 60; // 72h
    case 'LOW':
    default:
      return 120 * 60; // 120h
  }
}

export function computeDueAt(from: Date, minutes: number): Date {
  return new Date(from.getTime() + minutes * 60 * 1000);
}


