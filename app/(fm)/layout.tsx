/**
 * FM (Facility Management) Route Group Layout
 * Wraps FM-specific routes with ClientLayout (TopBar + Sidebar + Footer)
 * 
 * @module app/(fm)/layout
 */

import ClientLayout from '@/components/ClientLayout';

export default function FMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
