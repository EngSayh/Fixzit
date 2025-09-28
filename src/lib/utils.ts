export function generateSlug(input: string): string {
<<<<<<< HEAD
  const base = (input ?? '')
    .toString()
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
=======
  const src = (input || "");
  const leftTrimmed = src.replace(/^\s+/, "");
  const rightTrimmed = src.replace(/\s+$/, "");
  const hadLeadingHyphen = leftTrimmed.startsWith("-");
  const hadTrailingHyphen = rightTrimmed.endsWith("-");

  let slug = src
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);

  if (!hadLeadingHyphen) slug = slug.replace(/^-+/, "");
  if (!hadTrailingHyphen) slug = slug.replace(/-+$/, "");
  return slug;
}
>>>>>>> acecb620d9e960f6cc5af0795616effb28211e7b

  return base || 'item';
}
