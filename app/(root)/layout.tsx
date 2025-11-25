import type { Metadata } from "next";
import "../globals.css";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Fixzit — Facility Management + Marketplace",
  description: "Fixzit: FM + Marketplaces (Aqar Souq & Fixzit Souq).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-card">
        <main>{children}</main>
      </body>
    </html>
  );
}
