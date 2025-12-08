/**
 * Next.js Instrumentation
 *
 * This file is loaded when the Next.js server starts.
 * Used to initialize workers, validate config, and set up monitoring.
 *
 * IMPORTANT: This file must NOT have static imports of Node.js-only modules.
 * Use dynamic imports with runtime checks to avoid bundling issues.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * @module instrumentation
 */

export async function register() {
  // Only run in Node.js runtime, not Edge or browser
  // Next.js sets NEXT_RUNTIME to 'nodejs' or 'edge'
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import of Node.js-specific code
    // This prevents webpack from bundling Node.js-only modules for Edge/browser
    const { registerNode } = await import("./instrumentation-node");
    await registerNode();
  }

  // Edge runtime initialization can be added here if needed
  // if (process.env.NEXT_RUNTIME === 'edge') {
  //   const { registerEdge } = await import('./instrumentation-edge');
  //   await registerEdge();
  // }
}
