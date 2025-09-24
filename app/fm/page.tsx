'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirects to the FM dashboard and renders nothing.
 *
 * On mount, replaces the current history entry with `/fm/dashboard` using Next.js'
 * client-side router so the browser navigates without adding a new history entry.
 *
 * @returns null — this component does not render any UI.
 */
export default function FMIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/fm/dashboard');
  }, [router]);
  return null;
}


