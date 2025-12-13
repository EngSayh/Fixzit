/**
 * Superadmin Layout
 * Minimal layout for superadmin pages without main app shell
 * 
 * @module app/superadmin/layout
 */

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Superadmin | Fixzit",
  description: "System administration access",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
