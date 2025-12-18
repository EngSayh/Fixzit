import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment and release tracking
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0, // 10% in prod, 100% in dev
  
  // Error Sampling
  // Capture all errors in dev, 100% in prod (errors are rare enough)
  sampleRate: 1.0,
  
  // Debug mode (only in development)
  debug: process.env.NODE_ENV === "development",
  
  // Integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true, // Privacy: mask all text content
      blockAllMedia: true, // Privacy: don't capture images/videos
    }),
  ],
  
  // Session Replay (only for errors in production)
  replaysSessionSampleRate: 0, // Don't capture sessions by default
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0, // Capture 100% of error sessions in prod
  
  // Filter out noise
  beforeSend(event, hint) {
    // Filter out development errors
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    
    // Filter out known third-party errors
    const error = hint.originalException as Error;
    if (error?.message?.includes("ResizeObserver loop")) {
      return null; // Browser resize observer noise
    }
    
    return event;
  },
  
  // Add user context enrichment
  beforeSendTransaction(event) {
    return event;
  },
});
