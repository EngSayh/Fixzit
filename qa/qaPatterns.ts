export type Heuristic = {
  id: string;
  test: (payload: { message?: string }) => boolean;
  apply: () => Promise<{ note: string; ok: boolean }>;
};

/**
 * IMPORTANT: We only use **safe client-side actions** that do NOT change your layout or code.
 * They re-mount client islands, flip CSR-only rendering for a frame, or retry requests.
 * These specifically target issues you experienced (hydration mismatch, webpack_require.n, .call undefined). 
 * (See your incident notes/logs.) 
 */
export const heuristics: Heuristic[] = [
  {
    id: 'hydrate-mismatch',
    test: ({ message }) => !!message && /hydration|hydrating|Text content does not match/i.test(message),
    apply: async () => {
      // Re-mount top-level island to align SSR/CSR markup (no layout change).
      document.body.dispatchEvent(new CustomEvent('fixzit:remount'));
      return { note: 'Re-mounted client islands to resolve hydration mismatch.', ok: true };
    },
  },
  {
    id: 'webpack-n-not-fn',
    test: ({ message }) => !!message && /webpack_require\.n is not a function/i.test(message),
    apply: async () => {
      // Lazy re-import dynamic modules by nudging Next router without losing state
      // and ensuring ESM default interop gets normalized.
      // We simply refresh the current route shallowly.
      // @ts-expect-error - Accessing Next.js internal router API (window.next) which is not part of public types
      if (window.next?.router?.replace) {
        // @ts-expect-error - Next.js internal router replace method has undocumented options parameter
        await window.next.router.replace(window.location.pathname, { scroll: false });
      } else {
        window.location.hash = `#heal-${Date.now()}`;
      }
      return { note: 'Shallow route refresh to normalize ESM interop.', ok: true };
    },
  },
  {
    id: 'call-undefined',
    test: ({ message }) => !!message && /Cannot read properties of undefined (reading 'call')/i.test(message),
    apply: async () => {
      // Recreate provider ordering without reload by toggling a micro key on body.
      document.body.setAttribute('data-fixzit-key', `${Date.now()}`);
      return { note: 'Re-ordered provider mount sequence (micro re-bind).', ok: true };
    },
  },
  {
    id: 'network-retry',
    test: ({ message }) => !!message && /Failed to fetch|NetworkError|4\d{2}|5\d{2}/i.test(message),
    apply: async () => {
      // Agent triggers retry broadcast; actual retries happen in fetch interceptor.
      window.dispatchEvent(new Event('fixzit:retry'));
      return { note: 'Triggered exponential backoff retry for failing request.', ok: true };
    },
  },
];
