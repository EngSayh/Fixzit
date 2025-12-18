/**
 * ImpersonationBanner Component Tests
 * Tests for superadmin impersonation status banner
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImpersonationBanner } from "@/components/superadmin/ImpersonationBanner";

// Mock dependencies
const mockHref = vi.fn();

// Mock window.location
delete (global.window as any).location;
global.window = Object.create(window);
Object.defineProperty(window, "location", {
  value: {
    href: "",
    set href(url: string) {
      mockHref(url);
    },
  },
  writable: true,
});

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key, // Return key as-is for testing
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const { toast } = await import("sonner");

// Mock fetch globally
global.fetch = vi.fn();

describe("ImpersonationBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
    mockHref.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Visibility", () => {
    it("should not render banner when no impersonation context is active", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: false, orgId: null }),
      });

      const { container } = render(<ImpersonationBanner />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it("should render banner when impersonation context is active", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, orgId: "org_abc123" }),
      });

      render(<ImpersonationBanner />);

      await waitFor(() => {
        expect(screen.getByText(/superadmin.impersonate.banner.title/i)).toBeInTheDocument();
      });
    });

    it("should display the impersonated organization ID", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, orgId: "org_abc123" }),
      });

      render(<ImpersonationBanner />);

      await waitFor(() => {
        expect(screen.getByText("org_abc123")).toBeInTheDocument();
      });
    });

    it("should check impersonation status on mount", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: false, orgId: null }),
      });

      render(<ImpersonationBanner />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/superadmin/impersonate/status");
      });
    });
  });

  describe("Banner Content", () => {
    it("should display impersonation mode title", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, orgId: "org_test" }),
      });

      render(<ImpersonationBanner />);

      await waitFor(() => {
        expect(screen.getByText(/superadmin.impersonate.banner.title/i)).toBeInTheDocument();
      });
    });

    it("should display viewing as organization text", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, orgId: "org_test" }),
      });

      render(<ImpersonationBanner />);

      await waitFor(() => {
        expect(screen.getByText(/superadmin.impersonate.banner.viewing/i)).toBeInTheDocument();
      });
    });

    it("should have exit button", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, orgId: "org_test" }),
      });

      render(<ImpersonationBanner />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /superadmin.impersonate.banner.exit/i })).toBeInTheDocument();
      });
    });
  });

  describe("Exit Functionality", () => {
    it("should trigger clear API when exit button is clicked", async () => {
      const user = userEvent.setup();

      // Mock status check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, orgId: "org_test" }),
      });

      // Mock clear API
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ImpersonationBanner />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /superadmin.impersonate.banner.exit/i })).toBeInTheDocument();
      });

      const exitButton = screen.getByRole("button", { name: /superadmin.impersonate.banner.exit/i });
      await user.click(exitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/superadmin/impersonate",
          expect.objectContaining({
            method: "DELETE",
          })
        );
      });
    });

    it("should redirect to superadmin issues after successful clear", async () => {
      const user = userEvent.setup();

      // Mock status check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, orgId: "org_test" }),
      });

      // Mock clear API
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ImpersonationBanner />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /superadmin.impersonate.banner.exit/i })).toBeInTheDocument();
      });

      const exitButton = screen.getByRole("button", { name: /superadmin.impersonate.banner.exit/i });
      await user.click(exitButton);

      await waitFor(() => {
        expect(mockHref).toHaveBeenCalledWith("/superadmin/issues");
      });
    });

    it("should show error toast when clear fails", async () => {
      const user = userEvent.setup();

      // Mock status check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, orgId: "org_test" }),
      });

      // Mock clear API failure
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Failed to clear" }),
      });

      render(<ImpersonationBanner />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /superadmin.impersonate.banner.exit/i })).toBeInTheDocument();
      });

      const exitButton = screen.getByRole("button", { name: /superadmin.impersonate.banner.exit/i });
      await user.click(exitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("superadmin.impersonate.banner.error.clearFailed");
      });
    });

    it("should show error toast when clear throws exception", async () => {
      const user = userEvent.setup();

      // Mock status check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, orgId: "org_test" }),
      });

      // Mock clear API exception
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      render(<ImpersonationBanner />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /superadmin.impersonate.banner.exit/i })).toBeInTheDocument();
      });

      const exitButton = screen.getByRole("button", { name: /superadmin.impersonate.banner.exit/i });
      await user.click(exitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("superadmin.impersonate.banner.error.clearFailed");
      });
    });
  });

  describe("Loading States", () => {
    it("should disable exit button during clear operation", async () => {
      const user = userEvent.setup();

      // Mock status check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, orgId: "org_test" }),
      });

      // Mock slow clear API
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true }),
        }), 100))
      );

      render(<ImpersonationBanner />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /superadmin.impersonate.banner.exit/i })).toBeInTheDocument();
      });

      const exitButton = screen.getByRole("button", { name: /superadmin.impersonate.banner.exit/i });
      await user.click(exitButton);

      // Button should be disabled during operation
      expect(exitButton).toBeDisabled();
    });

    it("should show clearing text during operation", async () => {
      const user = userEvent.setup();

      // Mock status check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, orgId: "org_test" }),
      });

      // Mock slow clear API
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true }),
        }), 100))
      );

      render(<ImpersonationBanner />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /superadmin.impersonate.banner.exit/i })).toBeInTheDocument();
      });

      const exitButton = screen.getByRole("button", { name: /superadmin.impersonate.banner.exit/i });
      await user.click(exitButton);

      // Should show clearing text
      expect(await screen.findByText(/superadmin.impersonate.banner.clearing/i)).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should have yellow warning background", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, orgId: "org_test" }),
      });

      const { container } = render(<ImpersonationBanner />);

      await waitFor(() => {
        const banner = container.querySelector(".bg-yellow-500");
        expect(banner).toBeInTheDocument();
      });
    });

    it("should be fixed at top of viewport", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, orgId: "org_test" }),
      });

      const { container } = render(<ImpersonationBanner />);

      await waitFor(() => {
        const banner = container.querySelector(".fixed");
        expect(banner).toBeInTheDocument();
      });
    });

    it("should have high z-index for visibility", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, orgId: "org_test" }),
      });

      const { container } = render(<ImpersonationBanner />);

      await waitFor(() => {
        const banner = container.querySelector(".z-50");
        expect(banner).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle status check failure gracefully", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const { container } = render(<ImpersonationBanner />);

      // Banner should not render on error
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it("should not render when status check returns non-ok response", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Unauthorized" }),
      });

      const { container } = render(<ImpersonationBanner />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });
});
