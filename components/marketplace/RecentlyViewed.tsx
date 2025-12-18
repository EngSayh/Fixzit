/* Client component: shows locally tracked recently viewed products for unauthenticated users */
"use client";

import React from "react";
import Link from "next/link";

type ViewedItem = {
  id: string;
  name?: string;
};

const STORAGE_KEY = "marketplace_recently_viewed";

export function RecentlyViewed() {
  const [items, setItems] = React.useState<ViewedItem[]>([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setItems(parsed.slice(0, 5) as ViewedItem[]);
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-sm text-foreground">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Recently viewed</p>
          <p className="text-muted-foreground text-xs">
            Pick up where you left off. Sign in to sync across devices.
          </p>
        </div>
        <Link
          href="/login"
          className="text-primary text-xs font-semibold hover:underline"
        >
          Sign in
        </Link>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/marketplace/product/${item.id}`}
            className="rounded-full bg-muted px-3 py-1 text-xs text-foreground hover:bg-muted/80"
          >
            {item.name || item.id}
          </Link>
        ))}
      </div>
    </div>
  );
}
