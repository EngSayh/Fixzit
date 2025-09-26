/**
 * Converts the PayTabs `cart_amount` payload value into a finite number.
 *
 * The gateway may return the amount as a string (e.g. "147.25"), a string
 * with locale-specific separators ("1.234,56"), or a number depending on the
 * integration path. This helper normalizes the value and guarantees that
 * callers receive either a valid numeric amount or `null` when the payload is
 * malformed.
 */
export function parseCartAmount(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const sanitized = trimmed.replace(/[\s\u00A0_]/g, '');

    const US_GROUPED = /^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
    const EU_GROUPED = /^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/;
    const SIMPLE_DOT = /^-?\d+(?:\.\d+)?$/;
    const SIMPLE_COMMA = /^-?\d+(?:,\d+)?$/;

    let normalized: string | null = null;

    if (US_GROUPED.test(sanitized)) {
      normalized = sanitized.replace(/,/g, '');
    } else if (EU_GROUPED.test(sanitized)) {
      normalized = sanitized.replace(/\./g, '').replace(',', '.');
    } else if (SIMPLE_DOT.test(sanitized)) {
      normalized = sanitized;
    } else if (SIMPLE_COMMA.test(sanitized)) {
      normalized = sanitized.replace(',', '.');
    }

    if (!normalized) {
      return null;
    }

    if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}
