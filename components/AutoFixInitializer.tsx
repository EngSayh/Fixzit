'use client';

import { useEffect } from 'react';
import { autoFixManager } from '@/lib/AutoFixManager';

// This component initializes the auto-fix system when the app starts
export default function AutoFixInitializer() {
  useEffect(() => {
    // Start auto-monitoring with 5-minute intervals
    autoFixManager.startAutoMonitoring(5);

    // Run initial health check
    autoFixManager.runHealthCheck().catch(() => {
      // Health check failed - auto-fix manager will handle internally
    });

    // Cleanup on unmount
    return () => {
      autoFixManager.stopAutoMonitoring();
    };
  }, []);

  // This component doesn't render anything
  return null;
}
