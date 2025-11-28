"use client";

import { X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "fixzit:trial-banner:dismissed";

export default function TrialBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 left-4 z-40 max-w-4xl mx-auto rounded-2xl border border-primary/30 bg-primary/10 backdrop-blur px-4 py-3 shadow-lg",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-primary">
            You’re on a trial plan. Upgrade to keep all features active.
          </p>
          <p className="text-xs text-primary/80">
            View billing to manage your subscription, download invoices, or talk to sales.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-3 py-2 text-sm font-medium hover:bg-primary/90"
          >
            Upgrade <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/billing/history"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/50 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            Billing
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="p-2 rounded-lg text-primary hover:bg-primary/10"
            aria-label="Dismiss trial banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
