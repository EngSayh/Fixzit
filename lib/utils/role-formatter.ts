export function formatRoleLabel(role: string): string {
  if (!role) {
    return '';
  }

  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, match => match.toUpperCase());
}
