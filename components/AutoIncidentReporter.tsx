'use client';
import { useEffect } from 'react';

declare global { interface Window { __incidentReporter?: boolean; __incidentLastAt?: number; } }

export default function AutoIncidentReporter(){
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const enabled = String(process.env.NEXT_PUBLIC_ENABLE_INCIDENTS || 'true') !== 'false';
      if (!enabled || window.__incidentReporter) return;
      window.__incidentReporter = true;
    }
    const getUser = () => {
      try { return localStorage.getItem('x-user') ? JSON.parse(localStorage.getItem('x-user') as string) : null; } catch { return null; }
    };
    const buildCtx = () => ({
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      locale: typeof navigator !== 'undefined' ? navigator.language : 'en',
      rtl: typeof document !== 'undefined' ? (document.dir === 'rtl') : false,
      time: new Date().toISOString(),
      network: typeof navigator !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : undefined
    });
    const send = (payload: unknown) => {
      const now = Date.now();
      if (window.__incidentLastAt && now - window.__incidentLastAt < 30000) return; // throttle 30s
      window.__incidentLastAt = now;
      const url = '/api/support/incidents';
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        if ('sendBeacon' in navigator && typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(url, blob)) return;
      } catch {}
      fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(()=>{});
    };

    const onErr = (ev: ErrorEvent) => {
      const u = getUser();
      const user = u ? { userId: u.id, tenant: u.tenantId } : undefined;
      const ctx = buildCtx();
      send({ code: 'UI-UI-UNKNOWN-000', message: ev.message, details: ev.error?.stack, userContext: user, clientContext: ctx });
    };
    const onRej = (ev: PromiseRejectionEvent) => {
      const reason: unknown = ev.reason;
      const msg = typeof reason === 'string' ? reason : (reason?.message || 'Unhandled rejection');
      const stack = reason?.stack ? String(reason.stack) : undefined;
      const u = getUser();
      const user = u ? { userId: u.id, tenant: u.tenantId } : undefined;
      const ctx = buildCtx();
      send({ code: 'UI-UI-UNKNOWN-000', message: msg, details: stack, userContext: user, clientContext: ctx });
    };
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
    };
  }, []);
  return null;
}

