'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FMIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/fm/dashboard');
  }, [router]);
  return null;
}


