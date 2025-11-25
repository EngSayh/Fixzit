export type GateSummary = {
  consoleErrors: number;
  networkFailures: number;
  hydrationErrors: number;
  buildErrors?: number; // supplied by server when available
};
export function passesStrict(summary: GateSummary) {
  // 0 console errors, 0 network failures, 0 hydration errors as per STRICT acceptance.
  return (
    summary.consoleErrors === 0 &&
    summary.networkFailures === 0 &&
    summary.hydrationErrors === 0
  );
}
