import type { ComponentPropsWithoutRef } from "react";
import { createElement } from "react";
import { sanitizeHtml, type SanitizeHtmlOptions } from "@/lib/sanitize-html";

type SafeHtmlProps<T extends keyof JSX.IntrinsicElements> = {
  html: string;
  as?: T;
  sanitizeOptions?: SanitizeHtmlOptions;
} & Omit<ComponentPropsWithoutRef<T>, "dangerouslySetInnerHTML" | "children">;

/**
 * Sanitizes and renders HTML using DOMPurify on both server and client.
 * Defaults to a div wrapper but can render any intrinsic element via `as`.
 */
export function SafeHtml<T extends keyof JSX.IntrinsicElements = "div">({
  html,
  as,
  sanitizeOptions,
  ...rest
}: SafeHtmlProps<T>) {
  const tag = (as ?? "div") as string;
  const cleaned = sanitizeHtml(html ?? "", {
    allowedAttributes: sanitizeOptions?.allowedAttributes,
    allowedTags: sanitizeOptions?.allowedTags,
  });

  // Use createElement to avoid TypeScript inference issues with generic element types
  return createElement(tag, {
    ...rest,
    dangerouslySetInnerHTML: { __html: cleaned },
  } as React.HTMLAttributes<HTMLElement> & { dangerouslySetInnerHTML: { __html: string } });
}
