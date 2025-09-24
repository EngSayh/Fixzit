export function computeSlaMinutes(priority: string): number {
  switch (priority) {
    case 'URGENT':
    case 'P1':
      return 4 * 60;
    case 'HIGH':
    case 'P2':
      return 24 * 60;
    case 'MEDIUM':
    case 'P3':
      return 72 * 60;
    default:
      return 72 * 60;
  }
}

export function computeDueAt(createdAt: Date, slaMinutes: number): Date {
  return new Date(createdAt.getTime() + slaMinutes * 60 * 1000);
}

