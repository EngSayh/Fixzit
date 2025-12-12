import createDOMPurify from "isomorphic-dompurify";
import {
  SANITIZE_RICHTEXT_CONFIG,
  SANITIZE_STRICT_CONFIG,
} from "./sanitize-html.config";

let domPurifyInstance: ReturnType<typeof createDOMPurify> | null = null;

export type SanitizeHtmlOptions = {
  allowedTags?: string[];
  allowedAttributes?: string[];
};

function getDOMPurify() {
  if (domPurifyInstance) return domPurifyInstance;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { JSDOM } = require("jsdom") as typeof import("jsdom");
  const windowLike: Window & typeof globalThis =
    typeof window === "undefined"
      ? ((new JSDOM("").window as unknown) as Window & typeof globalThis)
      : (window as unknown as Window & typeof globalThis);
  domPurifyInstance = createDOMPurify(windowLike);
  return domPurifyInstance;
}

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

  return getDOMPurify().sanitize(html ?? "", config);
}

/**
 * Sanitizes richer HTML/Markdown content while keeping common formatting tags intact.
 * Uses DOMPurify's default HTML profile (server-compatible via JSDOM).
 */
export function sanitizeRichTextHtml(html: string) {
  return getDOMPurify().sanitize(html ?? "", SANITIZE_RICHTEXT_CONFIG);
}
