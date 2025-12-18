/**
 * ImpersonationForm Component Tests
 * Tests for superadmin organization impersonation form
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImpersonationForm } from "@/components/superadmin/ImpersonationForm";

// Mock dependencies
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

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

// Mock fetch globally
global.fetch = vi.fn();

describe("ImpersonationForm", () => {
  const defaultProps = {
    nextUrl: "/fm/operations",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should render form with search input and org ID input", () => {
      render(<ImpersonationForm {...defaultProps} />);

      // Check for search input
      expect(screen.getByLabelText(/superadmin.impersonate.searchLabel/i)).toBeInTheDocument();
      
      // Check for org ID input
      expect(screen.getByLabelText(/superadmin.impersonate.orgIdLabel/i)).toBeInTheDocument();
      
      // Check for buttons
      expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /superadmin.impersonate.submitButton/i })).toBeInTheDocument();
    });

    it("should have search button initially disabled when input is empty", () => {
      render(<ImpersonationForm {...defaultProps} />);
      
      const searchButton = screen.getByRole("button", { name: /search/i });
      expect(searchButton).toBeDisabled();
    });

    it("should have submit button initially disabled when org ID is empty", () => {
      render(<ImpersonationForm {...defaultProps} />);
      
      const submitButton = screen.getByRole("button", { name: /superadmin.impersonate.submitButton/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Search Functionality", () => {
    it("should enable search button when organization name is entered", async () => {
      const user = userEvent.setup();
      render(<ImpersonationForm {...defaultProps} />);

      const searchInput = screen.getByLabelText(/superadmin.impersonate.searchLabel/i);
      const searchButton = screen.getByRole("button", { name: /search/i });

      await user.type(searchInput, "Acme Corp");

      expect(searchButton).not.toBeDisabled();
    });

    it("should trigger API call when search button is clicked", async () => {
      const user = userEvent.setup();
      const mockOrgs = [
        { id: "org_123", name: "Acme Corporation" },
        { id: "org_456", name: "Acme Industries" },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organizations: mockOrgs }),
      });

      render(<ImpersonationForm {...defaultProps} />);

      const searchInput = screen.getByLabelText(/superadmin.impersonate.searchLabel/i);
      const searchButton = screen.getByRole("button", { name: /search/i });

      await user.type(searchInput, "Acme");
      await user.click(searchButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/superadmin/organizations/search?q=Acme"
        );
      });
    });

    it("should display search results after successful search", async () => {
      const user = userEvent.setup();
      const mockOrgs = [
        { id: "org_123", name: "Acme Corporation" },
        { id: "org_456", name: "Acme Industries" },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organizations: mockOrgs }),
      });

      render(<ImpersonationForm {...defaultProps} />);

      const searchInput = screen.getByLabelText(/superadmin.impersonate.searchLabel/i);
      const searchButton = screen.getByRole("button", { name: /search/i });

      await user.type(searchInput, "Acme");
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
        expect(screen.getByText("Acme Industries")).toBeInTheDocument();
      });
    });

    it("should display error message when search returns empty results", async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organizations: [] }),
      });

      render(<ImpersonationForm {...defaultProps} />);

      const searchInput = screen.getByLabelText(/superadmin.impersonate.searchLabel/i);
      const searchButton = screen.getByRole("button", { name: /search/i });

      await user.type(searchInput, "NonexistentOrg");
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/superadmin.impersonate.noResults/i)).toBeInTheDocument();
      });
    });

    it("should display error message when search fails", async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      render(<ImpersonationForm {...defaultProps} />);

      const searchInput = screen.getByLabelText(/superadmin.impersonate.searchLabel/i);
      const searchButton = screen.getByRole("button", { name: /search/i });

      await user.type(searchInput, "Acme");
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/superadmin.impersonate.error.searchFailed/i)).toBeInTheDocument();
      });
    });

    it("should show error if search attempted with empty input", async () => {
      const user = userEvent.setup();
      render(<ImpersonationForm {...defaultProps} />);

      const searchInput = screen.getByLabelText(/superadmin.impersonate.searchLabel/i);
      
      // Type and then clear
      await user.type(searchInput, "A");
      await user.clear(searchInput);

      // Trigger search button via Enter key
      await user.type(searchInput, "{Enter}");

      await waitFor(() => {
        expect(screen.getByText(/superadmin.impersonate.error.enterName/i)).toBeInTheDocument();
      });
    });
  });

  describe("Organization Selection", () => {
    it("should populate org ID field when search result is selected", async () => {
      const user = userEvent.setup();
      const mockOrgs = [
        { id: "org_123", name: "Acme Corporation" },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organizations: mockOrgs }),
      });

      render(<ImpersonationForm {...defaultProps} />);

      const searchInput = screen.getByLabelText(/superadmin.impersonate.searchLabel/i);
      const searchButton = screen.getByRole("button", { name: /search/i });

      await user.type(searchInput, "Acme");
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
      });

      // Click on search result
      const orgButton = screen.getByText("Acme Corporation").closest("button");
      if (orgButton) await user.click(orgButton);

      // Check org ID input is populated
      const orgIdInput = screen.getByLabelText(/superadmin.impersonate.orgIdLabel/i) as HTMLInputElement;
      expect(orgIdInput.value).toBe("org_123");
    });

    it("should clear search results after selecting an organization", async () => {
      const user = userEvent.setup();
      const mockOrgs = [
        { id: "org_123", name: "Acme Corporation" },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organizations: mockOrgs }),
      });

      render(<ImpersonationForm {...defaultProps} />);

      const searchInput = screen.getByLabelText(/superadmin.impersonate.searchLabel/i);
      const searchButton = screen.getByRole("button", { name: /search/i });

      await user.type(searchInput, "Acme");
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
      });

      const orgButton = screen.getByText("Acme Corporation").closest("button");
      if (orgButton) await user.click(orgButton);

      // Search results should be cleared
      await waitFor(() => {
        expect(screen.queryByText("Acme Corporation")).not.toBeInTheDocument();
      });
    });
  });

  describe("Form Submission", () => {
    it("should enable submit button when org ID is entered", async () => {
      const user = userEvent.setup();
      render(<ImpersonationForm {...defaultProps} />);

      const orgIdInput = screen.getByLabelText(/superadmin.impersonate.orgIdLabel/i);
      const submitButton = screen.getByRole("button", { name: /superadmin.impersonate.submitButton/i });

      await user.type(orgIdInput, "org_abc123");

      expect(submitButton).not.toBeDisabled();
    });

    it("should trigger impersonation API on submit", async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, orgId: "org_abc123" }),
      });

      render(<ImpersonationForm {...defaultProps} />);

      const orgIdInput = screen.getByLabelText(/superadmin.impersonate.orgIdLabel/i);
      const submitButton = screen.getByRole("button", { name: /superadmin.impersonate.submitButton/i });

      await user.type(orgIdInput, "org_abc123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/superadmin/impersonate",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orgId: "org_abc123" }),
          })
        );
      });
    });

    it("should redirect to nextUrl after successful impersonation", async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, orgId: "org_abc123" }),
      });

      render(<ImpersonationForm {...defaultProps} />);

      const orgIdInput = screen.getByLabelText(/superadmin.impersonate.orgIdLabel/i);
      const submitButton = screen.getByRole("button", { name: /superadmin.impersonate.submitButton/i });

      await user.type(orgIdInput, "org_abc123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/fm/operations");
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("should display error message when impersonation fails", async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Organization not found" }),
      });

      render(<ImpersonationForm {...defaultProps} />);

      const orgIdInput = screen.getByLabelText(/superadmin.impersonate.orgIdLabel/i);
      const submitButton = screen.getByRole("button", { name: /superadmin.impersonate.submitButton/i });

      await user.type(orgIdInput, "org_invalid");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Organization not found/i)).toBeInTheDocument();
      });
    });

    it("should show error if submit attempted with empty org ID", async () => {
      const user = userEvent.setup();
      render(<ImpersonationForm {...defaultProps} />);

      const orgIdInput = screen.getByLabelText(/superadmin.impersonate.orgIdLabel/i);

      // Type and then clear
      await user.type(orgIdInput, "org");
      await user.clear(orgIdInput);

      // Try to submit via form submission
      const form = orgIdInput.closest("form");
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/superadmin.impersonate.error.selectOrg/i)).toBeInTheDocument();
      });
    });
  });

  describe("Clear Functionality", () => {
    it("should clear impersonation context when clear button is clicked", async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ImpersonationForm {...defaultProps} />);

      const clearButton = screen.getByRole("button", { name: /superadmin.impersonate.clearButton/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/superadmin/impersonate",
          expect.objectContaining({
            method: "DELETE",
          })
        );
      });
    });

    it("should redirect to superadmin issues after clearing", async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ImpersonationForm {...defaultProps} />);

      const clearButton = screen.getByRole("button", { name: /superadmin.impersonate.clearButton/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/superadmin/issues");
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading state during search", async () => {
      const user = userEvent.setup();

      // Simulate slow API response
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ organizations: [] }),
        }), 100))
      );

      render(<ImpersonationForm {...defaultProps} />);

      const searchInput = screen.getByLabelText(/superadmin.impersonate.searchLabel/i);
      const searchButton = screen.getByRole("button", { name: /search/i });

      await user.type(searchInput, "Acme");
      await user.click(searchButton);

      // Check for loading spinner (Loader2 icon)
      expect(screen.getByRole("button", { name: /search/i }).querySelector("svg")).toBeInTheDocument();
    });

    it("should show loading state during impersonation", async () => {
      const user = userEvent.setup();

      // Simulate slow API response
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true }),
        }), 100))
      );

      render(<ImpersonationForm {...defaultProps} />);

      const orgIdInput = screen.getByLabelText(/superadmin.impersonate.orgIdLabel/i);
      const submitButton = screen.getByRole("button", { name: /superadmin.impersonate.submitButton/i });

      await user.type(orgIdInput, "org_abc123");
      await user.click(submitButton);

      // Check for loading text
      expect(await screen.findByText(/superadmin.impersonate.loading/i)).toBeInTheDocument();
    });
  });
});
