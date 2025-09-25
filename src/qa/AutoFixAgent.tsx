'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { nanoid } from 'nanoid';
import { getDomPath } from './domPath';
import { hijackConsole, ConsoleRecord } from './consoleHijack';
import { heuristics } from './qaPatterns';
import { passesStrict } from './acceptance';

type QaEvent = {
  id: string;
  type: 'click'|'console'|'runtime-error'|'unhandled-rejection'|'network-error'|'gate';
  route: string;
  role: string;
  orgId: string;
  ts: number;
  meta?: any;
  screenshot?: string; // data URL when captured
};

const HUD_POS_KEY = 'fixzit.qa.hud.pos';

export function AutoFixAgent() {
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<{ console:number; network:number; hydration:number }>({ console:0, network:0, hydration:0 });
  const [lastNote, setLastNote] = useState<string>('');
  const [halted, setHalted] = useState(false);
  const [pos, setPos] = useState<{x:number,y:number}>(() => {
    try { return JSON.parse(localStorage.getItem(HUD_POS_KEY)!) || { x: 16, y: 16 }; } catch { return { x:16, y:16 }; }
  });

  // Get from context or localStorage
  const role = typeof window !== 'undefined'
    ? (localStorage.getItem('fixzit-role') || 'Guest')
    : 'Guest';
  const orgId = typeof window !== 'undefined'
    ? (localStorage.getItem('fixzit-org') || 'unknown')
    : 'unknown';
  const roleRef = useRef(role);
  const orgIdRef = useRef(orgId);
  const hudRef = useRef<HTMLDivElement>(null);
  const eventBuffer = useRef<QaEvent[]>([]);
  const originalFetchRef = useRef<any>(null);

  const errorsRef = useRef(errors);

  useEffect(() => {
    errorsRef.current = errors;
  }, [errors]);

  useEffect(() => {
    roleRef.current = role;
    orgIdRef.current = orgId;
  }, [role, orgId]);

  const sendBatch = useCallback(async () => {
    if (!eventBuffer.current.length) return;
    const payload = eventBuffer.current.splice(0, eventBuffer.current.length);
    try {
      await fetch('/api/qa/log', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ batch: payload }) });
    } catch { /* logging should never crash the app */ }
  }, []);

  // ---- CLICK TRACER (capture phase) ----
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target) return;
      const tag = (target as HTMLElement).tagName.toLowerCase();
      const clickable = tag === 'button' || tag === 'a' || (target as HTMLElement).onclick || target.closest('button,a,[role="button"]');
      if (!clickable) return;

      const evt: QaEvent = {
        id: nanoid(),
        type: 'click',
        route: window.location.pathname,
        role: roleRef.current,
        orgId: orgIdRef.current,
        ts: Date.now(),
        meta: {
          tag,
          text: (target as HTMLElement).innerText?.slice(0, 80) || '',
          path: getDomPath(target),
        },
      };
      eventBuffer.current.push(evt);
      if (!halted) sendBatch();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [halted, sendBatch]);

  // ---- CONSOLE & RUNTIME ----
  const bufferConsole = useCallback((rec: ConsoleRecord) => {
    eventBuffer.current.push({ id: nanoid(), type: 'console', route: window.location.pathname, role: roleRef.current, orgId: orgIdRef.current, ts: Date.now(), meta: rec });
  }, []);

  const bufferRuntime = useCallback((type: QaEvent['type'], message: string, stack?: string) => {
    eventBuffer.current.push({ id: nanoid(), type, route: window.location.pathname, role: roleRef.current, orgId: orgIdRef.current, ts: Date.now(), meta: { message, stack } });
  }, []);

  const bufferNetwork = useCallback((url: string, status: number) => {
    eventBuffer.current.push({ id: nanoid(), type: 'network-error', route: window.location.pathname, role: roleRef.current, orgId: orgIdRef.current, ts: Date.now(), meta: { url, status } });
  }, []);

  const bufferGate = useCallback((clean: boolean) => {
    eventBuffer.current.push({ id: nanoid(), type: 'gate', route: window.location.pathname, role: roleRef.current, orgId: orgIdRef.current, ts: Date.now(), meta: { clean, errors: errorsRef.current } });
  }, []);

  const capture = useCallback(async (phase:'before'|'after') => {
    try {
      const canvas = await html2canvas(document.body, { backgroundColor: null, scale: 0.6 });
      const data = canvas.toDataURL('image/jpeg', 0.6);
      eventBuffer.current.push({
        id: nanoid(),
        type: 'gate',
        route: window.location.pathname,
        role: roleRef.current,
        orgId: orgIdRef.current,
        ts: Date.now(),
        meta: { phase, errors: errorsRef.current },
        screenshot: data
      });
    } catch {}
  }, []);

  const tryHeuristics = useCallback(async (message:string) => {
    if (process.env.NEXT_PUBLIC_QA_AUTOFIX !== '1') return { note: 'Auto-heal disabled' };
    for (const h of heuristics) {
      if (h.test({ message })) {
        try { return await h.apply(); } catch { /* ignore */ }
      }
    }
    return { note: 'No heuristic matched; logged for follow-up.' };
  }, []);

  const haltAndHeal = useCallback(async (type: QaEvent['type'], msg: string) => {
    if (!active || halted) return;
    setHalted(true);
    await capture('before');
    const { note } = await tryHeuristics(msg);
    setLastNote(note);
    await wait(10000);
    await capture('after');
    const currentErrors = errorsRef.current;
    const clean = passesStrict({ consoleErrors: currentErrors.console, networkFailures: currentErrors.network, hydrationErrors: currentErrors.hydration });
    bufferGate(clean);
    await sendBatch();
    setHalted(false);
  }, [active, halted, capture, tryHeuristics, bufferGate, sendBatch]);

  useEffect(() => {
    const undo = hijackConsole((rec: ConsoleRecord) => {
      if (rec.level === 'error') {
        setErrors(s => ({ ...s, console: s.console + 1 }));
        bufferConsole(rec);
        haltAndHeal('console', rec.args?.[0]?.message || String(rec.args?.[0] || 'console.error'));
      }
    });

    const onError = (ev: ErrorEvent) => {
      if (/hydration/i.test(ev.message)) {
        setErrors(s => ({ ...s, hydration: s.hydration + 1 }));
      }
      bufferRuntime('runtime-error', ev.message, ev.error?.stack);
      haltAndHeal('runtime-error', ev.message);
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      const msg = String(ev.reason?.message || ev.reason || 'unhandledrejection');
      bufferRuntime('unhandled-rejection', msg, ev.reason?.stack);
      haltAndHeal('unhandled-rejection', msg);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('fixzit:errorBoundary', (e:any) => {
      bufferRuntime('runtime-error', e.detail?.error?.message || 'ErrorBoundary', e.detail?.error?.stack);
      haltAndHeal('runtime-error', e.detail?.error?.message || 'ErrorBoundary');
    });

    return () => { undo(); window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection); };
  }, [bufferConsole, bufferRuntime, haltAndHeal]);

  // ---- NETWORK ----
  useEffect(() => {
    if (originalFetchRef.current) return;
    originalFetchRef.current = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const res = await originalFetchRef.current(input, init);
        if (!res.ok) {
          setErrors(s => ({ ...s, network: s.network + 1 }));
          const url = typeof input === 'string' ? input : (input as any).url;
          bufferNetwork(url, res.status);
          haltAndHeal('network-error', `HTTP ${res.status} on ${url}`);
        }
        return res;
      } catch (err:any) {
        setErrors(s => ({ ...s, network: s.network + 1 }));
        const url = typeof input === 'string' ? input : (input as any).url;
        bufferNetwork(url, -1);
        haltAndHeal('network-error', `Network error on ${url}: ${String(err?.message || err)}`);
        throw err;
      }
    };
    return () => { if (originalFetchRef.current) window.fetch = originalFetchRef.current; };
  }, [bufferNetwork, haltAndHeal]);

  // ---- HUD (draggable, non-invasive) ----
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (hudRef.current?.dataset.dragging === '1') {
        const nx = Math.max(8, Math.min(window.innerWidth - 180, e.clientX - 60));
        const ny = Math.max(8, Math.min(window.innerHeight - 48, e.clientY - 10));
        setPos({ x: nx, y: ny });
      }
    };
    const onUp = () => {
      if (hudRef.current) {
        hudRef.current.dataset.dragging = '0';
        localStorage.setItem(HUD_POS_KEY, JSON.stringify(pos));
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [pos]);

  const wait = (ms:number) => new Promise(res => setTimeout(res, ms));

  // Minimal status colors consistent with brand tokens (no layout changes).
  const badge = useMemo(() => {
    const bad = errors.console + errors.network + errors.hydration;
    return bad ? '#FFB400' : '#00A859';
  }, [errors]);

  return (
    <div
      ref={hudRef}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 2147483647, pointerEvents: 'auto' }}
      onMouseDown={(e) => { if ((e.target as HTMLElement).id === 'fixzit-hud') (hudRef.current!.dataset.dragging = '1'); }}
    >
      <div id="fixzit-hud"
           style={{ userSelect: 'none', cursor: 'move', fontFamily: 'system-ui, sans-serif',
                    background: '#023047', color: 'white', borderRadius: 8, padding: '6px 10px',
                    boxShadow: '0 2px 8px rgba(0,0,0,.2)', width: 180 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <strong>Fixzit QA</strong>
          <span style={{ background: badge, width:10, height:10, borderRadius:'50%' }} />
        </div>
        <div style={{ fontSize:12, opacity:.9, marginTop:4 }}>
          Role: {role} · {window.location.pathname}
        </div>
        <div style={{ fontSize:12, marginTop:6 }}>
          CE:{errors.console} · NE:{errors.network} · HY:{errors.hydration}
        </div>
        {halted && <div style={{ fontSize:12, marginTop:6, color:'#FFB400' }}>HALTED: {lastNote || 'diagnosing…'}</div>}
        <div style={{ display:'flex', gap:6, marginTop:6 }}>
          <button onClick={() => setActive(a => !a)} style={btnStyle}>Agent: {active ? 'On' : 'Off'}</button>
          <button onClick={() => { setErrors({console:0,network:0,hydration:0}); }} style={btnStyle}>Clear</button>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: '#0061A8', color: 'white', border: 'none',
  padding: '4px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer'
};
