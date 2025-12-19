export const isMarketplaceEnabled = () =>
  globalThis.process?.env?.MARKETPLACE_ENABLED === "true";

export const isPlaywrightTests = () =>
  globalThis.process?.env?.PLAYWRIGHT_TESTS === "true";
