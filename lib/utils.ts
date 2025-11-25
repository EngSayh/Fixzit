import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(input: string | null | undefined): string {
  // Handle null/undefined/non-string inputs
  if (input == null || typeof input !== "string") {
    return "";
  }

  const src = input.trim();
  if (!src) return "";

  // Check for leading/trailing hyphens *after* trimming
  const hadLeadingHyphen = src.startsWith("-");
  const hadTrailingHyphen = src.endsWith("-");

  let slug = src
    .toLowerCase()
    // FIX: Allow Arabic and other Unicode letters (prevents stripping)
    // Use Unicode property escapes to match letters in any language
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // Keep letters, numbers, spaces, hyphens
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
