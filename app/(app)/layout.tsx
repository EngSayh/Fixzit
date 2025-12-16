/**
 * App Route Group Layout
 * Wraps marketplace, souq, aqar, and public routes with ClientLayout
 * 
 * @module app/(app)/layout
 */

import ClientLayout from '@/components/ClientLayout';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
