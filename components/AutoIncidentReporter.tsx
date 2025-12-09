"use client";
import { useEffect } from "react";
import { STORAGE_KEYS } from "@/config/constants";
import { logger } from "@/lib/logger";

declare global {
  interface Window {
    __incidentReporter?: boolean;
    __incidentLastAt?: number;
  }
}

export default function AutoIncidentReporter() {
  useEffect(() => {
    const QUEUE_KEY = "fxz_failed_incidents";

    const loadQueued = (): Record<string, unknown>[] => {
      try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? (JSON.parse(raw) as Record<string, unknown>[]) : [];
      } catch {
        return [];
      }
    };

    const saveQueued = (items: Record<string, unknown>[]) => {
      try {
        const trimmed = items.slice(-20); // cap to avoid unbounded growth
        localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
      } catch {
        // ignore storage errors
      }
    };

    if (typeof window !== "undefined") {
      const enabled =
        String(process.env.NEXT_PUBLIC_ENABLE_INCIDENTS || "true") !== "false";
      if (!enabled || window.__incidentReporter) return;
      window.__incidentReporter = true;
    }
    const getUser = () => {
      // Security Note: Only extracts user ID and tenant ID from localStorage
      // Does not log sensitive data like tokens or PII
      // Backend must handle this data securely and in compliance with privacy regulations
      try {
        return localStorage.getItem(STORAGE_KEYS.userSession)
          ? JSON.parse(localStorage.getItem(STORAGE_KEYS.userSession) as string)
          : null;
      } catch (e) {
        // Silently return null - invalid JSON or localStorage unavailable
        logger.warn("Failed to parse user session from localStorage", {
          component: "AutoIncidentReporter",
          action: "getUser",
          error: e,
        });
        return null;
      }
    };
    const buildCtx = () => ({
      url: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      locale: typeof navigator !== "undefined" ? navigator.language : "en",
      rtl: typeof document !== "undefined" ? document.dir === "rtl" : false,
      time: new Date().toISOString(),
      network:
        typeof navigator !== "undefined"
          ? navigator.onLine
            ? "online"
            : "offline"
          : undefined,
    });
    const flushQueue = async () => {
      const queued = loadQueued();
      if (!queued.length) return;
      const remaining: Record<string, unknown>[] = [];
      for (const item of queued) {
        try {
          await fetch("/api/support/incidents", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(item),
            keepalive: true,
          });
        } catch {
          remaining.push(item);
        }
      }
      if (remaining.length !== queued.length) {
        saveQueued(remaining);
      }
    };

    const send = (payload: Record<string, unknown>) => {
      const now = Date.now();
      if (window.__incidentLastAt && now - window.__incidentLastAt < 30000)
        return; // throttle 30s
      window.__incidentLastAt = now;
      const url = "/api/support/incidents";
      try {
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        });
        if (
          "sendBeacon" in navigator &&
          typeof navigator.sendBeacon === "function" &&
          navigator.sendBeacon(url, blob)
        )
          return;
      } catch (e) {
        // Blob creation or sendBeacon may fail in restrictive environments
        logger.warn("[Telemetry] sendBeacon failed, falling back to fetch", {
          component: "AutoIncidentReporter",
          action: "sendBeacon",
          error: e,
        });
      }
      // Fire-and-forget: Incident reporting must never crash the app, even if API fails
      fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch((err) => {
        // Log fetch failures for debugging telemetry pipeline
        logger.warn("[Telemetry] Incident report fetch failed", {
          component: "AutoIncidentReporter",
          action: "send",
          error: err,
        });
        saveQueued([...loadQueued(), payload]);
      });
    };

    const onErr = (ev: ErrorEvent) => {
      const u = getUser();
      const user = u ? { userId: u.id, tenant: u.tenantId } : undefined;
      const ctx = buildCtx();
      send({
        code: "UI-UI-ERROR-001",
        message: ev.message,
        details: ev.error?.stack,
        userContext: user,
        clientContext: ctx,
      });
    };
    const onRej = (ev: PromiseRejectionEvent) => {
      const reason = ev.reason as
        | { message?: string; stack?: string }
        | string
        | undefined;
      const msg =
        typeof reason === "string"
          ? reason
          : reason?.message || "Unhandled rejection";
      const stack =
        typeof reason === "object" && reason?.stack
          ? String(reason.stack)
          : undefined;
      const u = getUser();
      const user = u ? { userId: u.id, tenant: u.tenantId } : undefined;
      const ctx = buildCtx();
      send({
        code: "UI-UI-REJECTION-001",
        message: msg,
        details: stack,
        userContext: user,
        clientContext: ctx,
      });
    };

    flushQueue();
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);
  return null;
}
