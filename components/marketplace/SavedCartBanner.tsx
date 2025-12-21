/* Client component: surfaces locally saved cart items for unauthenticated users */
"use client";

import React from "react";
import Link from "next/link";

type SavedLine = {
  title?: string;
  qty?: number;
  price?: number;
  currency?: string;
};

const STORAGE_KEY = "marketplace_saved_cart";

export function SavedCartBanner() {
  const [saved, setSaved] = React.useState<SavedLine[]>([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSaved(parsed as SavedLine[]);
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  if (!saved.length) return null;

  const itemCount = saved.reduce((sum, line) => sum + (line.qty ?? 0), 0);
  const currency = saved.find((l) => l.currency)?.currency ?? "SAR";
  const estTotal = saved.reduce(
    (sum, line) => sum + (line.qty ?? 0) * (line.price ?? 0),
    0,
  );

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-primary">
            Saved cart ready to restore
          </p>
          <p className="text-muted-foreground">
            {itemCount} item(s) · approx {estTotal.toFixed(2)} {currency}. Sign
            in to restore and checkout.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Sign in to restore
        </Link>
      </div>
    </div>
  );
}
