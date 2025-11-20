import createDOMPurify from 'isomorphic-dompurify';
import { JSDOM } from 'jsdom';

let domPurifyInstance: ReturnType<typeof createDOMPurify> | null = null;

function getDOMPurify() {
  if (domPurifyInstance) return domPurifyInstance;
  const windowLike: Window & typeof globalThis =
    typeof window === 'undefined' ? (new JSDOM('').window as Window & typeof globalThis) : window;
  domPurifyInstance = createDOMPurify(windowLike);
  return domPurifyInstance;
}

export function sanitizeHtml(html: string) {
  return getDOMPurify().sanitize(html ?? '', {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'br', 'span', 'div', 'h1', 'h2', 'h3', 'h4'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class'],
  });
}
