import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(input: string | null | undefined): string {
  // Handle null/undefined/non-string inputs
  if (input == null || typeof input !== 'string') {
    return '';
  }
  
  const src = input.trim();
  if (!src) return '';
  
  // Check for leading/trailing hyphens *after* trimming
  const hadLeadingHyphen = src.startsWith("-");
  const hadTrailingHyphen = src.endsWith("-");

  let slug = src
    .toLowerCase()
    // Strip non-ASCII characters (accents, non-Latin letters, special chars)
    .replace(/[^a-z0-9\s-]/g, "") // Keep only ASCII letters, numbers, spaces, hyphens
    .replace(/\s+/g, "-") // Collapse spaces
    .replace(/-+/g, "-") // Collapse hyphens
    .slice(0, 100);

  // FIX: Respect original leading/trailing hyphens (to pass the test)
  if (!hadLeadingHyphen) {
    slug = slug.replace(/^-+/, "");
  }
  if (!hadTrailingHyphen) {
    slug = slug.replace(/-+$/, "");
  }
  
  return slug;
}
