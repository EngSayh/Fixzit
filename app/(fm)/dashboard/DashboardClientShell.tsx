"use client";

import dynamic from "next/dynamic";

// Dynamic import with ssr: false is allowed in Client Components
const DashboardLiveUpdates = dynamic(
  () => import("@/components/dashboard/DashboardLiveUpdates"),
  { ssr: false },
);

/**
 * Client shell for dashboard live functionality.
 * This wrapper allows using dynamic imports with ssr: false
 * which is not permitted in Server Components.
 */
export default function DashboardClientShell() {
  return <DashboardLiveUpdates />;
}
