import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment and release tracking
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
  
  // Performance Monitoring (Edge is limited, keep minimal)
  tracesSampleRate: 0.1, // 10% sampling
  
  // Error Sampling
  sampleRate: 1.0,
  
  // Debug mode
  debug: process.env.NODE_ENV === "development",
  
  // Filter out noise
  beforeSend(event) {
    // Filter out development errors
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    
    return event;
  },
});
