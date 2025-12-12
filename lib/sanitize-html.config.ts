import type { Config } from "dompurify";

export const SANITIZE_ALLOWED_TAGS = [
  "p",
  "strong",
  "em",
  "u",
  "a",
  "ul",
  "ol",
  "li",
  "br",
  "span",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "pre",
  "code",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
  "hr",
];

export const SANITIZE_ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "style",
  "class",
  "src",
  "alt",
  "title",
];

export const SANITIZE_STRICT_CONFIG: Config = {
  ALLOWED_TAGS: SANITIZE_ALLOWED_TAGS,
  ALLOWED_ATTR: SANITIZE_ALLOWED_ATTR,
};

export const SANITIZE_RICHTEXT_CONFIG: Config = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ["target", "rel", "class", "style"],
};
