/**
 * Shared DOM/environment mocks for Vitest suites.
 * Provides safe helpers to mock clipboard and fetch without direct assignment errors.
 */
import { vi } from "vitest";

type ClipboardLike = { writeText: (text: string) => Promise<void> };

const original = {
  clipboard: (typeof navigator !== "undefined" && navigator.clipboard) || undefined,
  fetch: (globalThis.fetch as typeof fetch | undefined) || undefined,
};

/**
 * Safely mock navigator.clipboard.writeText using defineProperty (clipboard is read-only by default in jsdom).
 */
export function mockClipboard(overrides?: Partial<ClipboardLike>) {
  const clipboardMock: ClipboardLike = {
    writeText: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: clipboardMock,
  });
  return clipboardMock;
}

export function restoreClipboard() {
  if (original.clipboard) {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: original.clipboard,
    });
  }
}

/**
 * Mock global fetch with a Vitest spy; returns the spy for per-test expectations.
 */
export function mockFetch() {
  const fetchMock = vi.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

export function restoreFetch() {
  if (original.fetch) {
    globalThis.fetch = original.fetch;
  }
}
