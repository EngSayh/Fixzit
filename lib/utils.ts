import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(input: string): string {
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
