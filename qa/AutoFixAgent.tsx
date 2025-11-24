"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { nanoid } from "nanoid";
import { getDomPath } from "./domPath";
import { hijackConsole, ConsoleRecord } from "./consoleHijack";
import { heuristics } from "./qaPatterns";
import { passesStrict } from "./acceptance";

type QaEvent = {
  id: string;
  type:
    | "click"
    | "console"
    | "runtime-error"
    | "unhandled-rejection"
    | "network-error"
    | "gate";
  route: string;
  role: string;
  orgId: string;
  ts: number;
  meta?: Record<string, unknown>;
  screenshot?: string; // data URL when captured
};

const HUD_POS_KEY = "fixzit.qa.hud.pos";

export function AutoFixAgent() {
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<{
    console: number;
    network: number;
    hydration: number;
  }>({ console: 0, network: 0, hydration: 0 });
  const [lastNote, setLastNote] = useState<string>("");
  const [halted, setHalted] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      return JSON.parse(localStorage.getItem(HUD_POS_KEY)!) || { x: 16, y: 16 };
    } catch (e) {
      // Silently use default position if localStorage unavailable or invalid JSON
      if (process.env.NODE_ENV === "development") {
        console.warn("Failed to restore HUD position:", e);
      }
      return { x: 16, y: 16 };
    }
  });

  // Get from context or localStorage
  const role =
    typeof window !== "undefined"
      ? localStorage.getItem("fixzit-role") || "Guest"
      : "Guest";
  const orgId =
    typeof window !== "undefined"
      ? localStorage.getItem("fixzit-org") || "unknown"
      : "unknown";
  const hudRef = useRef<HTMLDivElement>(null);
  const eventBuffer = useRef<QaEvent[]>([]);
  const originalFetchRef = useRef<typeof fetch | null>(null);

  const sendBatch = async () => {
    if (!eventBuffer.current.length) return;
    const payload = eventBuffer.current.splice(0, eventBuffer.current.length);
    try {
      await fetch("/api/qa/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: payload }),
      });
    } catch {
      /* logging should never crash the app */
    }
  };

  // ---- CLICK TRACER (capture phase) ----
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target) return;
      const tag = (target as HTMLElement).tagName.toLowerCase();
      const clickable =
        tag === "button" ||
        tag === "a" ||
        (target as HTMLElement).onclick ||
        target.closest('button,a,[role="button"]');
      if (!clickable) return;

      const evt: QaEvent = {
        id: nanoid(),
        type: "click",
        route: window.location.pathname,
        role,
        orgId,
        ts: Date.now(),
        meta: {
          tag,
          text: (target as HTMLElement).innerText?.slice(0, 80) || "",
          path: getDomPath(target),
        },
      };
      eventBuffer.current.push(evt);
      if (!halted) sendBatch();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [halted, role, orgId]);

  // ---- CONSOLE & RUNTIME ----
  useEffect(() => {
    const undo = hijackConsole((rec: ConsoleRecord) => {
      if (rec.level === "error") {
        setErrors((s) => ({ ...s, console: s.console + 1 }));
        bufferConsole(rec);
        haltAndHeal(
          "console",
          rec.args?.[0]?.message || String(rec.args?.[0] || "console.error"),
        );
      }
    });

    const onError = (ev: ErrorEvent) => {
      if (/hydration/i.test(ev.message)) {
        setErrors((s) => ({ ...s, hydration: s.hydration + 1 }));
      }
      bufferRuntime("runtime-error", ev.message, ev.error?.stack);
      haltAndHeal("runtime-error", ev.message);
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      const msg = String(
        ev.reason?.message || ev.reason || "unhandledrejection",
      );
      bufferRuntime("unhandled-rejection", msg, ev.reason?.stack);
      haltAndHeal("unhandled-rejection", msg);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("fixzit:errorBoundary", (e: Event) => {
      const customEvent = e as CustomEvent<{
        error?: { message?: string; stack?: string };
      }>;
      bufferRuntime(
        "runtime-error",
        customEvent.detail?.error?.message || "ErrorBoundary",
        customEvent.detail?.error?.stack,
      );
      haltAndHeal(
        "runtime-error",
        customEvent.detail?.error?.message || "ErrorBoundary",
      );
    });

    return () => {
      undo();
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  // ---- NETWORK ---- (Fixed: Prevent fetch interceptor detaching)
  useEffect(() => {
    // Store original fetch only if not already stored
    if (!originalFetchRef.current) {
      originalFetchRef.current = window.fetch.bind(window);
    }

    // Set up interceptor with reliability checks
    const interceptedFetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      try {
        // Use the stored original fetch to avoid recursion
        const originalFetch = originalFetchRef.current;
        if (!originalFetch) {
          throw new Error("Original fetch reference lost");
        }

        const res = await originalFetch(input, init);
        // Only intercept if agent is active and response is not ok
        if (active && !res.ok) {
          setErrors((s) => ({ ...s, network: s.network + 1 }));
          const url =
            typeof input === "string" ? input : (input as Request).url;
          bufferNetwork(url, res.status);
          haltAndHeal("network-error", `HTTP ${res.status} on ${url}`);
        }
        return res;
      } catch (err: unknown) {
        // Only intercept if agent is active
        if (active) {
          const error = err as Error;
          setErrors((s) => ({ ...s, network: s.network + 1 }));
          const url =
            typeof input === "string" ? input : (input as Request).url;
          bufferNetwork(url, -1);
          haltAndHeal(
            "network-error",
            `Network error on ${url}: ${String(error?.message || error)}`,
          );
        }
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
  const haltAndHeal = async (type: QaEvent["type"], msg: string) => {
    if (!active || halted) return;
    setHalted(true);
    await capture("before");
    const { note } = await tryHeuristics(msg);
    setLastNote(note);
    // wait 10s (per STRICT) then capture again
    await wait(10000);
    await capture("after");
    // Check gates and only then un-halt
    const clean = passesStrict({
      consoleErrors: errors.console,
      networkFailures: errors.network,
      hydrationErrors: errors.hydration,
    });
    bufferGate(clean);
    await sendBatch();
    setHalted(false);
  };

  const tryHeuristics = async (message: string) => {
    if (process.env.NEXT_PUBLIC_QA_AUTOFIX !== "1")
      return { note: "Auto-heal disabled" };
    for (const h of heuristics) {
      if (h.test({ message })) {
        try {
          return await h.apply();
        } catch (e) {
          // Heuristic failed to apply - continue to next heuristic
          if (process.env.NODE_ENV === "development") {
            console.warn("Heuristic application failed:", h, e);
          }
        }
      }
    }
    return { note: "No heuristic matched; logged for follow-up." };
  };

  const capture = async (phase: "before" | "after") => {
    try {
      const canvas = await html2canvas(document.body, {
        backgroundColor: null,
        scale: 0.6,
      });
      const data = canvas.toDataURL("image/jpeg", 0.6);
      eventBuffer.current.push({
        id: nanoid(),
        type: "gate",
        route: window.location.pathname,
        role,
        orgId,
        ts: Date.now(),
        meta: { phase, errors },
        screenshot: data,
      });
    } catch (e) {
      // Screenshot capture failed - log but don't crash QA agent
      if (process.env.NODE_ENV === "development") {
        console.warn("Failed to capture screenshot:", e);
      }
    }
  };

  const bufferConsole = (rec: ConsoleRecord) => {
    eventBuffer.current.push({
      id: nanoid(),
      type: "console",
      route: window.location.pathname,
      role,
      orgId,
      ts: Date.now(),
      meta: rec,
    });
  };
  const bufferRuntime = (
    type: QaEvent["type"],
    message: string,
    stack?: string,
  ) => {
    eventBuffer.current.push({
      id: nanoid(),
      type,
      route: window.location.pathname,
      role,
      orgId,
      ts: Date.now(),
      meta: { message, stack },
    });
  };
  const bufferNetwork = (url: string, status: number) => {
    eventBuffer.current.push({
      id: nanoid(),
      type: "network-error",
      route: window.location.pathname,
      role,
      orgId,
      ts: Date.now(),
      meta: { url, status },
    });
  };
  const bufferGate = (clean: boolean) => {
    eventBuffer.current.push({
      id: nanoid(),
      type: "gate",
      route: window.location.pathname,
      role,
      orgId,
      ts: Date.now(),
      meta: { clean, errors },
    });
  };

  // ---- HUD (draggable, non-invasive) ----
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (hudRef.current?.dataset.dragging === "1") {
        const nx = Math.max(
          8,
          Math.min(window.innerWidth - 180, e.clientX - 60),
        );
        const ny = Math.max(
          8,
          Math.min(window.innerHeight - 48, e.clientY - 10),
        );
        setPos({ x: nx, y: ny });
      }
    };
    const onUp = () => {
      if (hudRef.current) {
        hudRef.current.dataset.dragging = "0";
        localStorage.setItem(HUD_POS_KEY, JSON.stringify(pos));
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [pos]);

  const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

  // Minimal status colors consistent with brand tokens (no layout changes).
  const badge = useMemo(() => {
    const bad = errors.console + errors.network + errors.hydration;
    return bad ? "hsl(var(--warning))" : "hsl(var(--success))";
  }, [errors]);

  return (
    <div
      ref={hudRef}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 2147483647,
        pointerEvents: "auto",
      }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).id === "fixzit-hud")
          hudRef.current!.dataset.dragging = "1";
      }}
    >
      <div
        id="fixzit-hud"
        style={{
          userSelect: "none",
          cursor: "move",
          fontFamily: "system-ui, sans-serif",
          background: "hsl(var(--primary))",
          color: "white",
          borderRadius: 8,
          padding: "6px 10px",
          boxShadow: "0 2px 8px rgba(0,0,0,.2)",
          width: 180,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <strong>Fixzit QA</strong>
          <span
            style={{
              background: badge,
              width: 10,
              height: 10,
              borderRadius: "50%",
            }}
          />
        </div>
        <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
          Role: {role} · {window.location.pathname}
        </div>
        <div style={{ fontSize: 12, marginTop: 6 }}>
          CE:{errors.console} · NE:{errors.network} · HY:{errors.hydration}
        </div>
        {halted && (
          <div
            style={{ fontSize: 12, marginTop: 6, color: "hsl(var(--warning))" }}
          >
            HALTED: {lastNote || "diagnosing…"}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button
            type="button"
            onClick={() => setActive((a) => !a)}
            style={btnStyle}
          >
            Agent: {active ? "On" : "Off"}
          </button>
          <button
            type="button"
            onClick={() => {
              setErrors({ console: 0, network: 0, hydration: 0 });
            }}
            style={btnStyle}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "hsl(var(--primary))",
  color: "white",
  border: "none",
  padding: "4px 8px",
  borderRadius: 6,
  fontSize: 12,
  cursor: "pointer",
};
