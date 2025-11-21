// Minimal stub of `next/server` for unit tests that run outside Next.js.
// Provides the shape needed by next-auth env helpers and any lightweight imports in model tests.
export class NextRequest {
  nextUrl: URL;
  url: string;
  headers: Headers;
  constructor(input: string | URL, init?: { headers?: Headers | Record<string, string> }) {
    const url = typeof input === 'string' ? input : input.toString();
    this.nextUrl = new URL(url);
    this.url = url;
    const headersInit = init?.headers ?? {};
    this.headers = headersInit instanceof Headers ? headersInit : new Headers(headersInit);
  }
}

export class NextResponse {
  static json(body: unknown, init?: ResponseInit) {
    return new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: init?.headers ?? { 'content-type': 'application/json' },
    });
  }
}

export const headers = () => new Headers();
export const cookies = () => ({
  get: (_key: string) => undefined as undefined,
  set: (_key: string, _value: string) => undefined,
});
