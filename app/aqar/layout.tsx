/**
 * Minimal layout for Aqar pages that renders its children directly.
 *
 * This component intentionally adds no surrounding structure or sidebar;
 * the global application layout provides header and sidebar per user role.
 *
 * @param children - React nodes to render within the Aqar page.
 * @returns A React fragment containing `children`.
 */
export default function AqarLayout({ children }: { children: React.ReactNode }) {
  // Local sidebar removed: global layout already provides header/sidebar per role.
  return <>{children}</>;
}

