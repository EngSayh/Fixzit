export function generateSlug(input: string): string {
  const base = (input || '').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return base || 'item';
}

