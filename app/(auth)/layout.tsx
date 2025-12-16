/**
 * Auth Route Group Layout
 * 
 * Purpose: Minimal shell for authentication pages (/login, /signup)
 * without full ClientLayout to avoid unnecessary navigation/sidebar.
 * 
 * If full shell is desired for auth pages, this file can be removed
 * and they will inherit ClientLayout from app/(app)/layout.tsx.
 * 
 * Decision: Keep full shell for branding consistency (per Layout Freeze).
 * Auth pages remain under (app) route group with ClientLayout.
 * This file is a placeholder for future minimal auth shell if needed.
 */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Currently passes through to parent (app) layout
  // To implement minimal shell: replace with custom header/footer
  return <>{children}</>;
}
