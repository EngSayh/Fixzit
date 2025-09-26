export function parseCartAmount(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }

    const normalized = trimmed
      .replace(/[^0-9.,-]/g, '')
      .replace(/,(?=\d{3}(?:\D|$))/g, '')
      .replace(/,/g, '.');

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (value && typeof value === 'object' && 'amount' in (value as Record<string, unknown>)) {
    return parseCartAmount((value as Record<string, unknown>).amount, fallback);
  }

  return fallback;
}

export function parseCartAmountOrThrow(value: unknown, message = 'Invalid cart amount'): number {
  const parsed = parseCartAmount(value, Number.NaN);
  if (!Number.isFinite(parsed)) {
    throw new Error(message);
  }
  return parsed;
}
