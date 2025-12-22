/**
 * Marketing Route Group Layout
 * Wraps marketing/public pages with ClientLayout (TopBar + Footer, no Sidebar)
 * 
 * @module app/(marketing)/layout
 */

import ClientLayout from '@/components/ClientLayout';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
