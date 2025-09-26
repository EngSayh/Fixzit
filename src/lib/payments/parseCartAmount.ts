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

    const condensed = trimmed.replace(/[\s\u00A0_]/g, '');
    const sanitized = condensed.replace(/[^0-9,.-]/g, '');
    const cleaned = sanitized.replace(/^[^-\d]+/, '');

    if (!cleaned) {
      return null;
    }

    const US_GROUPED = /^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
    const EU_GROUPED = /^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/;
    const SIMPLE_DOT = /^-?\d+(?:\.\d+)?$/;
    const SIMPLE_COMMA = /^-?\d+(?:,\d+)?$/;

    let normalized: string | null = null;

    if (US_GROUPED.test(cleaned)) {
      normalized = cleaned.replace(/,/g, '');
    } else if (EU_GROUPED.test(cleaned)) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (SIMPLE_DOT.test(cleaned)) {
      normalized = cleaned;
    } else if (SIMPLE_COMMA.test(cleaned)) {
      normalized = cleaned.replace(',', '.');
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
