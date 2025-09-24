import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: 'Fixzit — Facility Management + Marketplace',
  description: 'Fixzit: FM + Marketplaces (Aqar Souq & Fixzit Souq).',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // This layout is intentionally minimal as the main layout.tsx handles everything
  return <>{children}</>;
}
