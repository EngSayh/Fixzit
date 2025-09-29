'use client&apos;;
import { useEffect } from &apos;react&apos;;

declare global { interface Window { __incidentReporter?: boolean; __incidentLastAt?: number; } }

export default function AutoIncidentReporter(){
  useEffect(() => {
    if (typeof window !== &apos;undefined&apos;) {
      const enabled = String(process.env.NEXT_PUBLIC_ENABLE_INCIDENTS || &apos;true&apos;) !== &apos;false&apos;;
      if (!enabled || window.__incidentReporter) return;
      window.__incidentReporter = true;
    }
    const getUser = () => {
      try { return localStorage.getItem(&apos;x-user&apos;) ? JSON.parse(localStorage.getItem(&apos;x-user&apos;) as string) : null; } catch { return null; }
    };
    const buildCtx = () => ({
      url: typeof window !== &apos;undefined&apos; ? window.location.href : &apos;',
      userAgent: typeof navigator !== &apos;undefined&apos; ? navigator.userAgent : &apos;',
      locale: typeof navigator !== &apos;undefined&apos; ? navigator.language : &apos;en&apos;,
      rtl: typeof document !== &apos;undefined&apos; ? (document.dir === &apos;rtl&apos;) : false,
      time: new Date().toISOString(),
      network: typeof navigator !== &apos;undefined&apos; ? (navigator.onLine ? &apos;online&apos; : &apos;offline&apos;) : undefined
    });
    const send = (payload: any) => {
      const now = Date.now();
      if (window.__incidentLastAt && now - window.__incidentLastAt < 30000) return; // throttle 30s
      window.__incidentLastAt = now;
      const url = &apos;/api/support/incidents&apos;;
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: &apos;application/json&apos; });
        if ('sendBeacon&apos; in navigator && typeof (navigator as any).sendBeacon === &apos;function&apos; && (navigator as any).sendBeacon(url, blob)) return;
      } catch {}
      fetch(url, { method: &apos;POST&apos;, headers: { &apos;content-type&apos;: &apos;application/json&apos; }, body: JSON.stringify(payload), keepalive: true }).catch(()=>{});
    };

    const onErr = (ev: ErrorEvent) => {
      const u = getUser();
      const user = u ? { userId: u.id, tenant: u.tenantId } : undefined;
      const ctx = buildCtx();
      send({ code: &apos;UI-UI-UNKNOWN-000&apos;, message: ev.message, details: ev.error?.stack, userContext: user, clientContext: ctx });
    };
    const onRej = (ev: PromiseRejectionEvent) => {
      const reason: any = ev.reason;
      const msg = typeof reason === 'string&apos; ? reason : (reason?.message || &apos;Unhandled rejection&apos;);
      const stack = reason?.stack ? String(reason.stack) : undefined;
      const u = getUser();
      const user = u ? { userId: u.id, tenant: u.tenantId } : undefined;
      const ctx = buildCtx();
      send({ code: &apos;UI-UI-UNKNOWN-000&apos;, message: msg, details: stack, userContext: user, clientContext: ctx });
    };
    window.addEventListener(&apos;error&apos;, onErr);
    window.addEventListener(&apos;unhandledrejection&apos;, onRej);
    return () => {
      window.removeEventListener(&apos;error&apos;, onErr);
      window.removeEventListener(&apos;unhandledrejection&apos;, onRej);
    };
  }, []);
  return null;
}

