export function parseCartAmount(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    let s = value.trim();
    if (!s) return fallback;
    // Normalize unicode minus and whitespace (incl NBSP)
    s = s.replace(/\u2212/g, '-').replace(/[\s\u00A0]/g, '');
    // Parentheses negative e.g. (1,234.56)
    if (/^\(.*\)$/.test(s)) s = '-' + s.slice(1, -1);
    // Keep only digits, separators, and a leading '-'
    s = s.replace(/[^0-9.,-]/g, '').replace(/(?!^)-/g, '');
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastDot !== -1 && lastComma !== -1) {
      const decimalSep = lastComma > lastDot ? ',' : '.';
      const thousandSep = decimalSep === ',' ? '.' : ',';
      s = s.replace(new RegExp('\\' + thousandSep, 'g'), '');
      if (decimalSep === ',') s = s.replace(/,/g, '.');
    } else if (lastComma !== -1) {
      if (/^-?\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
      else s = s.replace(/,/g, '.');
    } else if (lastDot !== -1) {
      if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    }
    const parsed = Number.parseFloat(s);
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
