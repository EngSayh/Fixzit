// src/lib/trace.ts - Trace context and correlation ID management
import { randomUUID } from 'crypto';

export type ClientContext = {
  url: string;
  userAgent: string;
  locale?: string;
  rtl?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  time: string; // ISO
  traceId?: string;        // from W3C traceparent if available
  correlationId?: string;  // from middleware
  referrer?: string;
  network?: 'online' | 'offline';
  viewport?: {
    width: number;
    height: number;
  };
  device?: {
    platform?: string;
    vendor?: string;
    mobile?: boolean;
  };
};

export function buildClientContext(): ClientContext {
  const nav = typeof navigator !== 'undefined' ? navigator : ({} as any);
  const loc = typeof location !== 'undefined' ? location : ({} as any);
  const doc = typeof document !== 'undefined' ? document : ({} as any);
  const win = typeof window !== 'undefined' ? window : ({} as any);

  return {
    url: loc?.href ?? '',
    userAgent: nav?.userAgent ?? '',
    locale: (nav?.language || 'en').toLowerCase(),
    rtl: doc?.dir === 'rtl',
    theme: (typeof localStorage !== 'undefined'
      ? (localStorage.getItem('fxz_theme') as any)
      : 'auto') || 'auto',
    time: new Date().toISOString(),
    correlationId: typeof document !== 'undefined'
      ? document?.querySelector('meta[name="x-correlation-id"]')?.getAttribute('content') ?? undefined
      : undefined,
    traceId: typeof document !== 'undefined'
      ? document?.querySelector('meta[name="x-trace-id"]')?.getAttribute('content') ?? undefined
      : undefined,
    referrer: doc?.referrer,
    network: typeof navigator !== 'undefined' && 'onLine' in navigator
      ? (navigator.onLine ? 'online' : 'offline')
      : undefined,
    viewport: win?.innerWidth ? {
      width: win.innerWidth,
      height: win.innerHeight
    } : undefined,
    device: nav?.userAgent ? {
      platform: nav?.platform,
      vendor: nav?.vendor,
      mobile: /Mobile|Android|iPhone/i.test(nav.userAgent)
    } : undefined
  };
}

// Generate correlation ID for client-side operations
export function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Extract trace context from headers or meta tags
export function getTraceContext(): { traceId?: string; correlationId?: string } {
  if (typeof document === 'undefined') return {};
  
  return {
    traceId: document.querySelector('meta[name="x-trace-id"]')?.getAttribute('content') ?? undefined,
    correlationId: document.querySelector('meta[name="x-correlation-id"]')?.getAttribute('content') ?? undefined
  };
}
