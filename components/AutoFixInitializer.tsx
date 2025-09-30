'use client';

import { useEffect } from 'react';
import { autoFixManager } from '@/lib/AutoFixManager';

// This component initializes the auto-fix system when the app starts
export default function AutoFixInitializer() {
  useEffect(() => {
    console.log('🚀 Initializing Auto-Fix System...');

    // Start auto-monitoring with 5-minute intervals
    autoFixManager.startAutoMonitoring(5);

    // Run initial health check
    autoFixManager.runHealthCheck().then(results => {
      const failedChecks = results.filter(r => !r.success);
      if (failedChecks.length > 0) {
        console.warn(`⚠️ ${failedChecks.length} health checks failed on startup`);
      } else {
        console.log('✅ System health check passed on startup');
      }
    }).catch(error => {
      console.error('❌ Failed to run initial health check:', error);
    });

    // Cleanup on unmount
    return () => {
      autoFixManager.stopAutoMonitoring();
    };
  }, []);

  // This component doesn't render anything
  return null;
}
