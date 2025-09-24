export default function FMLayout({ children }: { children: React.ReactNode }) {
  // تجنّب تداخل ClientLayout لمنع تكرار الترويسة؛ الترويسة مركبة من app/layout.tsx
  return <>{children}</>;
}
