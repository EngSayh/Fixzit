import React from "react";
import { vi, describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock functions at module level
const mockPush = vi.fn();
const mockSignOut = vi.fn();
const mockLoggerWarn = vi.fn();
const mockLoggerError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
    locale: "en",
  }),
}));

vi.mock("lucide-react", () => ({
  Loader2: (props: Record<string, unknown>) => <div {...props} data-testid="loader-icon" />,
  CheckCircle: (props: Record<string, unknown>) => <div {...props} data-testid="check-icon" />,
  XCircle: (props: Record<string, unknown>) => <div {...props} data-testid="x-icon" />,
}));

vi.mock("@/components/brand", () => ({
  BrandLogo: (props: { "data-testid"?: string }) => (
    <img src="/logo.png" alt="Fixzit" data-testid={props["data-testid"] || "brand-logo"} />
  ),
}));

import LogoutPage from "@/app/logout/page";

/**
 * LogoutPage Unit Tests
 * 
 * Tests for the logout page component covering:
 * - Basic rendering in processing state  
 * - localStorage guard for Safari Private Mode / CSP environments
 * - sessionStorage guard for restricted environments
 * - Error logging when signOut fails
 * - NextAuth signOut integration
 */
describe("LogoutPage", () => {
  let originalLocalStorage: Storage;
  let originalSessionStorage: Storage;
  let localStorageStore: Record<string, string>;

  beforeAll(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock - resolves immediately
    mockSignOut.mockResolvedValue({ url: "/login" });

    originalLocalStorage = window.localStorage;
    originalSessionStorage = window.sessionStorage;

    localStorageStore = {};

    const createMockStorage = (store: Record<string, string>): Storage => ({
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
      get length() { return Object.keys(store).length; },
    });

    Object.defineProperty(window, "localStorage", {
      value: createMockStorage(localStorageStore),
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, "sessionStorage", {
      value: createMockStorage({}),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "sessionStorage", {
      value: originalSessionStorage,
      writable: true,
      configurable: true,
    });
  });

  describe("Basic Rendering", () => {
    test("renders logout page and shows processing state", async () => {
      // Mock signOut to never resolve (keep in processing state)
      mockSignOut.mockImplementation(() => new Promise(() => {}));
      
      render(<LogoutPage />);
      
      expect(screen.getByTestId("logout-page")).toBeInTheDocument();
      expect(screen.getByText("Signing you out...")).toBeInTheDocument();
    });
  });

  describe("localStorage Guard (Regression: audit fix)", () => {
    /**
     * REGRESSION TEST: localStorage access must be guarded
     * 
     * This test ensures that logout works correctly even when localStorage
     * throws errors, which happens in:
     * - Safari Private Mode
     * - Strict CSP environments
     * - When storage quota is exceeded
     * 
     * The test validates that logger.warn is called with the proper message
     * when localStorage throws, proving the try/catch guard is in place.
     */
    test("logs warning when localStorage.getItem throws error", async () => {
      const mockGetItem = vi.fn().mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: mockGetItem,
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
          key: vi.fn(),
          length: 0,
        },
        writable: true,
        configurable: true,
      });

      mockSignOut.mockResolvedValue({ url: "/login" });
      
      render(<LogoutPage />);

      // Wait for the warning to be logged (this happens synchronously in useEffect)
      await waitFor(() => {
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          "localStorage unavailable during logout (Safari Private Mode or CSP restriction)",
          expect.objectContaining({ error: expect.anything() })
        );
      }, { timeout: 2000 });
    });

    test("logs warning when sessionStorage.clear throws error", async () => {
      Object.defineProperty(window, "sessionStorage", {
        value: {
          clear: vi.fn().mockImplementation(() => {
            throw new Error("SecurityError");
          }),
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          key: vi.fn(),
          length: 0,
        },
        writable: true,
        configurable: true,
      });

      mockSignOut.mockResolvedValue({ url: "/login" });
      
      render(<LogoutPage />);

      await waitFor(() => {
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          "Failed to clear session storage",
          expect.objectContaining({ error: expect.any(Error) })
        );
      }, { timeout: 2000 });
    });
  });

  describe("Error Handling", () => {
    test("logs error when signOut fails", async () => {
      mockSignOut.mockReset();
      mockSignOut.mockImplementation(() => Promise.reject(new Error("Network error")));

      render(<LogoutPage />);

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          "Logout error:",
          expect.any(Error)
        );
      }, { timeout: 2000 });
    });
  });

  describe("NextAuth Integration", () => {
    test("calls signOut with correct options", async () => {
      mockSignOut.mockResolvedValue({ url: "/login" });
      
      render(<LogoutPage />);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledWith({
          redirect: false,
          redirectTo: "/login",
        });
      }, { timeout: 1000 });
    });
  });
});
