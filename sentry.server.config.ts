import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment and release tracking
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0, // 10% in prod, 100% in dev
  
  // Error Sampling
  sampleRate: 1.0,
  
  // Debug mode (only in development)
  debug: process.env.NODE_ENV === "development",
  
  // Integrations
  integrations: [
    Sentry.httpIntegration(),
    Sentry.prismaIntegration(), // If using Prisma
  ],
  
  // Filter out noise
  beforeSend(event, hint) {
    // Filter out development errors
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    
    // Filter known issues
    const error = hint.originalException as Error;
    if (error?.message?.includes("ECONNRESET")) {
      return null; // Client disconnects are normal
    }
    
    return event;
  },
  
  // MongoDB slow query tracking
  beforeSendTransaction(event) {
    return event;
  },
});
