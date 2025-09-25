import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: 'Fixzit — Facility Management + Marketplace',
  description: 'Fixzit: FM + Marketplaces (Aqar Souq & Fixzit Souq).',
};

/**
 * Minimal root layout that renders the app's root children.
 *
 * This layout intentionally does not add wrappers or global chrome; the main
 * layout file is responsible for shared UI, metadata, and providers.
 *
 * @param children - The React nodes to render at the root of the application.
 * @returns The rendered children.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  // This layout is intentionally minimal as the main layout.tsx handles everything
  return <>{children}</>;
}
