/**
 * HTML Sanitization Utility
 *
 * Provides secure HTML sanitization using DOMPurify.
 * Uses isomorphic-dompurify which handles both client and server environments.
 *
 * @module lib/sanitize-html
 */

import DOMPurify from "isomorphic-dompurify";
import {
  SANITIZE_RICHTEXT_CONFIG,
  SANITIZE_STRICT_CONFIG,
} from "./sanitize-html.config";

export type SanitizeHtmlOptions = {
  allowedTags?: string[];
  allowedAttributes?: string[];
};

export function sanitizeHtml(
  html: string,
  options?: SanitizeHtmlOptions,
): string {
  const config = {
    ...SANITIZE_STRICT_CONFIG,
    ALLOWED_TAGS: options?.allowedTags ?? SANITIZE_STRICT_CONFIG.ALLOWED_TAGS,
    ALLOWED_ATTR:
      options?.allowedAttributes ?? SANITIZE_STRICT_CONFIG.ALLOWED_ATTR,
  };

  return DOMPurify.sanitize(html ?? "", config);
}

/**
 * Sanitizes richer HTML/Markdown content while keeping common formatting tags intact.
 * Uses DOMPurify's default HTML profile (server-compatible via isomorphic-dompurify).
 */
export function sanitizeRichTextHtml(html: string) {
  return DOMPurify.sanitize(html ?? "", SANITIZE_RICHTEXT_CONFIG);
}
