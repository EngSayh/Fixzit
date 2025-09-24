/**
 * Layout for the "fm" app segment that renders its children without adding headers or extra wrappers.
 *
 * This component intentionally avoids using ClientLayout to prevent duplicating the global header (the header is provided by app/layout.tsx).
 *
 * @param children - Content to render inside this layout; rendered as-is.
 * @returns The children wrapped in a fragment for use as a segment layout.
 */
export default function FMLayout({ children }: { children: React.ReactNode }) {
  // تجنّب تداخل ClientLayout لمنع تكرار الترويسة؛ الترويسة مركبة من app/layout.tsx
  return <>{children}</>;
}
