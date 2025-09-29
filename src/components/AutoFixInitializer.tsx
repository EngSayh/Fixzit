'use client&apos;;

import { useEffect } from &apos;react&apos;;
import { autoFixManager } from &apos;@/src/lib/AutoFixManager&apos;;

// This component initializes the auto-fix system when the app starts
export default function AutoFixInitializer() {
  useEffect(() => {
    console.log(&apos;🚀 Initializing Auto-Fix System...&apos;);

    // Start auto-monitoring with 5-minute intervals
    autoFixManager.startAutoMonitoring(5);

    // Run initial health check
    autoFixManager.runHealthCheck().then(results => {
      const failedChecks = results.filter(r => !r.success);
      if (failedChecks.length > 0) {
        console.warn(`⚠️ ${failedChecks.length} health checks failed on startup`);
      } else {
        console.log(&apos;✅ System health check passed on startup&apos;);
      }
    }).catch(error => {
      console.error(&apos;❌ Failed to run initial health check:&apos;, error);
    });

    // Cleanup on unmount
    return () => {
      autoFixManager.stopAutoMonitoring();
    };
  }, []);

  // This component doesn&apos;t render anything
  return null;
}
