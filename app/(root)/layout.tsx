import { ReactNode } from "react";

/**
 * (root) Route Group Layout
 * 
 * This is a route group layout that inherits from app/layout.tsx.
 * It should NOT have html/body tags - those are provided by the root layout.
 * Fonts and theme are inherited from the root layout.
 */
export default function RootGroupLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      {children}
    </main>
  );
}
