'use client&apos;;

import React, { useEffect, useMemo, useRef, useState } from &apos;react&apos;;
import html2canvas from &apos;html2canvas&apos;;
import { nanoid } from &apos;nanoid&apos;;
import { getDomPath } from &apos;./domPath&apos;;
import { hijackConsole, ConsoleRecord } from &apos;./consoleHijack&apos;;
import { heuristics } from &apos;./qaPatterns&apos;;
import { passesStrict } from &apos;./acceptance&apos;;

type QaEvent = {
  id: string;
  type: &apos;click&apos;|'console&apos;|'runtime-error&apos;|'unhandled-rejection&apos;|'network-error&apos;|'gate&apos;;
  route: string;
  role: string;
  orgId: string;
  ts: number;
  meta?: any;
  screenshot?: string; // data URL when captured
};

const HUD_POS_KEY = &apos;fixzit.qa.hud.pos&apos;;

export function AutoFixAgent() {
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<{ console:number; network:number; hydration:number }>({ console:0, network:0, hydration:0 });
  const [lastNote, setLastNote] = useState<string>(&apos;');
  const [halted, setHalted] = useState(false);
  const [pos, setPos] = useState<{x:number,y:number}>(() => {
    try { return JSON.parse(localStorage.getItem(HUD_POS_KEY)!) || { x: 16, y: 16 }; } catch { return { x:16, y:16 }; }
  });

  // Get from context or localStorage
  const role = typeof window !== &apos;undefined&apos; 
    ? (localStorage.getItem(&apos;fixzit-role&apos;) || &apos;Guest&apos;)
    : &apos;Guest&apos;;
  const orgId = typeof window !== &apos;undefined&apos;
    ? (localStorage.getItem(&apos;fixzit-org&apos;) || &apos;unknown&apos;)
    : &apos;unknown&apos;;
  const hudRef = useRef<HTMLDivElement>(null);
  const eventBuffer = useRef<QaEvent[]>([]);
  const originalFetchRef = useRef<any>(null);

  const sendBatch = async () => {
    if (!eventBuffer.current.length) return;
    const payload = eventBuffer.current.splice(0, eventBuffer.current.length);
    try {
      await fetch(&apos;/api/qa/log&apos;, { method: &apos;POST&apos;, headers: { &apos;Content-Type&apos;:'application/json&apos; }, body: JSON.stringify({ batch: payload }) });
    } catch { /* logging should never crash the app */ }
  };

  // ---- CLICK TRACER (capture phase) ----
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target) return;
      const tag = (target as HTMLElement).tagName.toLowerCase();
      const clickable = tag === &apos;button&apos; || tag === &apos;a' || (target as HTMLElement).onclick || target.closest(&apos;button,a,[role="button"]&apos;);
      if (!clickable) return;

      const evt: QaEvent = {
        id: nanoid(),
        type: &apos;click&apos;,
        route: window.location.pathname,
        role, orgId,
        ts: Date.now(),
        meta: {
          tag,
          text: (target as HTMLElement).innerText?.slice(0, 80) || &apos;',
          path: getDomPath(target),
        },
      };
      eventBuffer.current.push(evt);
      if (!halted) sendBatch();
    };
    document.addEventListener(&apos;click&apos;, onClick, true);
    return () => document.removeEventListener(&apos;click&apos;, onClick, true);
  }, [halted, role, orgId]);

  // ---- CONSOLE & RUNTIME ----
  useEffect(() => {
    const undo = hijackConsole((rec: ConsoleRecord) => {
      if (rec.level === &apos;error&apos;) {
        setErrors(s => ({ ...s, console: s.console + 1 }));
        bufferConsole(rec);
        haltAndHeal(&apos;console&apos;, rec.args?.[0]?.message || String(rec.args?.[0] || &apos;console.error&apos;));
      }
    });

    const onError = (ev: ErrorEvent) => {
      if (/hydration/i.test(ev.message)) {
        setErrors(s => ({ ...s, hydration: s.hydration + 1 }));
      }
      bufferRuntime(&apos;runtime-error&apos;, ev.message, ev.error?.stack);
      haltAndHeal(&apos;runtime-error&apos;, ev.message);
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      const msg = String(ev.reason?.message || ev.reason || &apos;unhandledrejection&apos;);
      bufferRuntime(&apos;unhandled-rejection&apos;, msg, ev.reason?.stack);
      haltAndHeal(&apos;unhandled-rejection&apos;, msg);
    };

    window.addEventListener(&apos;error&apos;, onError);
    window.addEventListener(&apos;unhandledrejection&apos;, onRejection);
    window.addEventListener(&apos;fixzit:errorBoundary&apos;, (e:any) => {
      bufferRuntime(&apos;runtime-error&apos;, e.detail?.error?.message || &apos;ErrorBoundary&apos;, e.detail?.error?.stack);
      haltAndHeal(&apos;runtime-error&apos;, e.detail?.error?.message || &apos;ErrorBoundary&apos;);
    });

    return () => { undo(); window.removeEventListener(&apos;error&apos;, onError); window.removeEventListener(&apos;unhandledrejection&apos;, onRejection); };
  }, []);

  // ---- NETWORK ---- (Fixed: Prevent fetch interceptor detaching)
  useEffect(() => {
    // Store original fetch only if not already stored
    if (!originalFetchRef.current) {
      originalFetchRef.current = window.fetch.bind(window);
    }

    // Set up interceptor with reliability checks
    const interceptedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        // Use the stored original fetch to avoid recursion
        const originalFetch = originalFetchRef.current;
        if (!originalFetch) {
          throw new Error('Original fetch reference lost');
        }

        const res = await originalFetch(input, init);
        if (!res.ok) {
          setErrors(s => ({ ...s, network: s.network + 1 }));
          const url = typeof input === 'string&apos; ? input : (input as any).url;
          bufferNetwork(url, res.status);
          haltAndHeal(&apos;network-error&apos;, `HTTP ${res.status} on ${url}`);
        }
        return res;
      } catch (err:any) {
        setErrors(s => ({ ...s, network: s.network + 1 }));
        const url = typeof input === 'string&apos; ? input : (input as any).url;
        bufferNetwork(url, -1);
        haltAndHeal(&apos;network-error&apos;, `Network error on ${url}: ${String(err?.message || err)}`);
        throw err;
      }
    };

    window.fetch = interceptedFetch;

    return () => { 
      // Only restore if we're the current interceptor
      if (window.fetch === interceptedFetch && originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
      }
    };
  }, [active]); // Depend on active state to ensure reliability

  // ---- HALT–FIX–VERIFY ----
  const haltAndHeal = async (type: QaEvent[&apos;type&apos;], msg: string) => {
    if (!active || halted) return;
    setHalted(true);
    await capture(&apos;before&apos;);
    const { note } = await tryHeuristics(msg);
    setLastNote(note);
    // wait 10s (per STRICT) then capture again
    await wait(10000);
    await capture(&apos;after&apos;);
    // Check gates and only then un-halt
    const clean = passesStrict({ consoleErrors: errors.console, networkFailures: errors.network, hydrationErrors: errors.hydration });
    bufferGate(clean);
    await sendBatch();
    setHalted(false);
  };

  const tryHeuristics = async (message:string) => {
    if (process.env.NEXT_PUBLIC_QA_AUTOFIX !== &apos;1') return { note: &apos;Auto-heal disabled&apos; };
    for (const h of heuristics) {
      if (h.test({ message })) {
        try { return await h.apply(); } catch { /* ignore */ }
      }
    }
    return { note: &apos;No heuristic matched; logged for follow-up.&apos; };
  };

  const capture = async (phase:&apos;before&apos;|'after&apos;) => {
    try {
      const canvas = await html2canvas(document.body, { backgroundColor: null, scale: 0.6 });
      const data = canvas.toDataURL(&apos;image/jpeg&apos;, 0.6);
      eventBuffer.current.push({
        id: nanoid(),
        type: &apos;gate&apos;,
        route: window.location.pathname, role, orgId, ts: Date.now(),
        meta: { phase, errors }, screenshot: data
      });
    } catch {}
  };

  const bufferConsole = (rec: ConsoleRecord) => {
    eventBuffer.current.push({ id: nanoid(), type: &apos;console&apos;, route: window.location.pathname, role, orgId, ts: Date.now(), meta: rec });
  };
  const bufferRuntime = (type: QaEvent[&apos;type&apos;], message: string, stack?: string) => {
    eventBuffer.current.push({ id: nanoid(), type, route: window.location.pathname, role, orgId, ts: Date.now(), meta: { message, stack } });
  };
  const bufferNetwork = (url: string, status: number) => {
    eventBuffer.current.push({ id: nanoid(), type: &apos;network-error&apos;, route: window.location.pathname, role, orgId, ts: Date.now(), meta: { url, status } });
  };
  const bufferGate = (clean: boolean) => {
    eventBuffer.current.push({ id: nanoid(), type: &apos;gate&apos;, route: window.location.pathname, role, orgId, ts: Date.now(), meta: { clean, errors } });
  };

  // ---- HUD (draggable, non-invasive) ----
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (hudRef.current?.dataset.dragging === &apos;1') {
        const nx = Math.max(8, Math.min(window.innerWidth - 180, e.clientX - 60));
        const ny = Math.max(8, Math.min(window.innerHeight - 48, e.clientY - 10));
        setPos({ x: nx, y: ny });
      }
    };
    const onUp = () => {
      if (hudRef.current) {
        hudRef.current.dataset.dragging = &apos;0';
        localStorage.setItem(HUD_POS_KEY, JSON.stringify(pos));
      }
    };
    window.addEventListener(&apos;mousemove&apos;, onMove);
    window.addEventListener(&apos;mouseup&apos;, onUp);
    return () => { window.removeEventListener(&apos;mousemove&apos;, onMove); window.removeEventListener(&apos;mouseup&apos;, onUp); };
  }, [pos]);

  const wait = (ms:number) => new Promise(res => setTimeout(res, ms));

  // Minimal status colors consistent with brand tokens (no layout changes).
  const badge = useMemo(() => {
    const bad = errors.console + errors.network + errors.hydration;
    return bad ? &apos;#FFB400&apos; : &apos;#00A859&apos;;
  }, [errors]);

  return (
    <div
      ref={hudRef}
      style={{ position: &apos;fixed&apos;, left: pos.x, top: pos.y, zIndex: 2147483647, pointerEvents: &apos;auto&apos; }}
      onMouseDown={(e) => { if ((e.target as HTMLElement).id === &apos;fixzit-hud&apos;) (hudRef.current!.dataset.dragging = &apos;1'); }}
    >
      <div id="fixzit-hud"
           style={{ userSelect: &apos;none&apos;, cursor: &apos;move&apos;, fontFamily: 'system-ui, sans-serif&apos;,
                    background: &apos;#023047&apos;, color: &apos;white&apos;, borderRadius: 8, padding: &apos;6px 10px&apos;,
                    boxShadow: &apos;0 2px 8px rgba(0,0,0,.2)&apos;, width: 180 }}>
        <div style={{ display:&apos;flex&apos;, justifyContent:'space-between&apos;, alignItems:&apos;center&apos; }}>
          <strong>Fixzit QA</strong>
          <span style={{ background: badge, width:10, height:10, borderRadius:&apos;50%&apos; }} />
        </div>
        <div style={{ fontSize:12, opacity:.9, marginTop:4 }}>
          Role: {role} · {window.location.pathname}
        </div>
        <div style={{ fontSize:12, marginTop:6 }}>
          CE:{errors.console} · NE:{errors.network} · HY:{errors.hydration}
        </div>
        {halted && <div style={{ fontSize:12, marginTop:6, color:&apos;#FFB400&apos; }}>HALTED: {lastNote || &apos;diagnosing…&apos;}</div>}
        <div style={{ display:&apos;flex&apos;, gap:6, marginTop:6 }}>
          <button onClick={() => setActive(a => !a)} style={btnStyle}>Agent: {active ? &apos;On&apos; : &apos;Off&apos;}</button>
          <button onClick={() => { setErrors({console:0,network:0,hydration:0}); }} style={btnStyle}>Clear</button>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: &apos;#0061A8&apos;, color: &apos;white&apos;, border: &apos;none&apos;,
  padding: &apos;4px 8px&apos;, borderRadius: 6, fontSize: 12, cursor: &apos;pointer&apos;
};
