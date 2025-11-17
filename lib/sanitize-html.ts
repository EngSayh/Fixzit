import createDOMPurify from 'isomorphic-dompurify';
import { JSDOM } from 'jsdom';

let domPurifyInstance: ReturnType<typeof createDOMPurify> | null = null;

function getDOMPurify() {
  if (domPurifyInstance) return domPurifyInstance;
  const windowLike = typeof window === 'undefined' ? new JSDOM('').window : window;
  domPurifyInstance = createDOMPurify(windowLike as unknown as Window & typeof globalThis);
  return domPurifyInstance;
}

export function sanitizeHtml(html: string) {
  return getDOMPurify().sanitize(html ?? '', {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'br', 'span', 'div', 'h1', 'h2', 'h3', 'h4'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class'],
  });
}
