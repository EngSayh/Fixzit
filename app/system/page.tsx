'use client';

import SystemVerifier from '@/src/components/SystemVerifier';

/**
 * Page component that provides the outer layout and background for the system verification UI.
 *
 * Renders a centered, responsive container with padding and the SystemVerifier component inside.
 *
 * @returns The SystemPage React element.
 */
export default function SystemPage() {
  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SystemVerifier />
      </div>
    </div>
  );
}

