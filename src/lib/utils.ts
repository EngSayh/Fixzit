/**
 * Convert a string into a URL-friendly slug.
 *
 * The input is coerced to an empty string if nullish, lowercased, trimmed,
 * diacritics are removed, and non‑letter/digit characters are stripped (Unicode‑aware)
 * except spaces and hyphens. Whitespace is collapsed to single hyphens,
 * consecutive and edge hyphens are trimmed, then the result is truncated to 64 characters.
 * If the final slug is empty, returns `'item'`.
 *
 * @param input - The source string to convert (nullish values are treated as empty).
 * @returns A URL-friendly slug (max 64 characters), or `'item'` when the result would be empty.
 */
export function generateSlug(input: string): string {
  const maxLen = 64;
  const fallback = 'item';
  let s = (input ?? '').toString().toLowerCase().trim();
  // Remove diacritics while preserving letters from all scripts (Arabic, etc.)
  s = s.normalize('NFKD').replace(/\p{M}+/gu, '');
  // Keep letters, numbers, spaces and hyphens across all locales
  s = s
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length > maxLen) {
    s = s.slice(0, maxLen).replace(/-+$/g, '');
  }
  return s || fallback;
}

