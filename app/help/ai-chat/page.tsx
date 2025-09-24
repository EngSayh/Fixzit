'use client';

import dynamic from 'next/dynamic';

const AIChat = dynamic(() => import('@/src/components/AIChat'), { ssr: false });

export default function AIChatPage() {
  return <AIChat onClose={() => { try { window.history.back(); } catch {} }} />;
}
