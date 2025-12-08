/**
 * Escape values used inside Meilisearch filter expressions.
 * - Removes control characters
 * - Escapes backslashes and quotes
 */
export function escapeMeiliFilterValue(value: string): string {
  let sanitized = "";
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0x20) {
      sanitized += value[i];
    }
  }
  return `"${sanitized.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
