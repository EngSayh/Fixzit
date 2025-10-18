'use client';

import SystemVerifier from '@/components/SystemVerifier';

export default function SystemPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SystemVerifier />
      </div>
    </div>
  );
}


