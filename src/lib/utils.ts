/**
 * Convert a string into a URL-friendly slug.
 *
 * The input is coerced to an empty string if falsy, lowercased, trimmed,
 * stripped of characters except a–z, 0–9, spaces, and hyphens, then
 * whitespace is collapsed to single hyphens and consecutive hyphens are
 * collapsed. The result is truncated to 64 characters. If the final slug
 * is empty, returns `'item'`.
 *
 * @param input - The source string to convert (falsy values are treated as empty).
 * @returns A URL-friendly slug (max 64 characters), or `'item'` when the result would be empty.
 */
export function generateSlug(input: string): string {
  return (input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64) || 'item';
}

