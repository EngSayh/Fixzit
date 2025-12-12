import type { ComponentPropsWithoutRef, ElementType } from "react";
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
  const Component = (as ?? "div") as ElementType;
  const cleaned = sanitizeHtml(html ?? "", {
    allowedAttributes: sanitizeOptions?.allowedAttributes,
    allowedTags: sanitizeOptions?.allowedTags,
  });

  return (
    <Component
      {...rest}
      dangerouslySetInnerHTML={{
        __html: cleaned,
      }}
    />
  );
}
