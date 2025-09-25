export function normalizePaytabsString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseCartAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^(?:\+)?\d+(?:\.\d{1,2})?$/.test(trimmed)) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }

  return null;
}

export function normalizePaytabsStatus(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toUpperCase();
}
