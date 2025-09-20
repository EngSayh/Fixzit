/**
 * Client-side auth guard hook
 * Uses router.replace instead of window.top navigation to prevent SecurityError
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '../utils/auth';
import { buildNextParam } from '../utils/nextParam';

export function useRequireAuth(redirectTo: string = '/auth/login') {
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      const currentPath = window.location.pathname + window.location.search;
      const nextParam = buildNextParam(currentPath);
      const loginUrl = `${redirectTo}?next=${nextParam}`;
      
      // Use router.replace to stay in current frame (no SecurityError)
      router.replace(loginUrl);
    }
  }, [router, redirectTo]);

  return isLoggedIn();
}