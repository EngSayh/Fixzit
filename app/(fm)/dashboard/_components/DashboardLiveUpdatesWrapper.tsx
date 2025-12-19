"use client";

import dynamic from "next/dynamic";

/**
 * Client wrapper for DashboardLiveUpdates.
 * Keeps ssr:false inside a client component to satisfy Next.js server rules.
 */
const DashboardLiveUpdates = dynamic(
  () => import("@/components/dashboard/DashboardLiveUpdates"),
  { ssr: false },
);

export default function DashboardLiveUpdatesWrapper() {
  return <DashboardLiveUpdates />;
}
