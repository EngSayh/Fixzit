// Directory: app/(public)/layout.tsx
import React from 'react';

// This layout applies to all routes within the (public) group,
// ensuring they do NOT inherit the main application's sidebar.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}