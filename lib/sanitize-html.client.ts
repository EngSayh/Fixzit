"use client";

import DOMPurify from "isomorphic-dompurify";
import type { SanitizeHtmlOptions } from "./sanitize-html";
import {
  SANITIZE_RICHTEXT_CONFIG,
  SANITIZE_STRICT_CONFIG,
} from "./sanitize-html.config";

export function sanitizeHtmlClient(
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

export function sanitizeRichTextHtmlClient(html: string): string {
  return DOMPurify.sanitize(html ?? "", SANITIZE_RICHTEXT_CONFIG);
}
