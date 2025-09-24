export default function AqarLayout({ children }: { children: React.ReactNode }) {
  // Local sidebar removed: global layout already provides header/sidebar per role.
  return <>{children}</>;
}

