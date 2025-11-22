/**
 * Tests for SupportPopup component
 * Framework: Vitest
 * Library: @testing-library/react, @testing-library/jest-dom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
// Note: @ts-expect-error annotations in this file are used only to mock clipboard APIs in jsdom.

// Using path mapping for cleaner imports
import SupportPopup from "@/components/SupportPopup";

// Utilities for jsdom environment
const origAlert = window.alert;
const origClipboard = navigator.clipboard;
const origFetch = global.fetch;
const origGetItem = window.localStorage.getItem;
const origSetItem = window.localStorage.setItem;
const origRemoveItem = window.localStorage.removeItem;

beforeEach(() => {
  // jsdom localStorage is available; ensure deterministic state
  const store = new Map();
  window.localStorage.getItem = vi.fn((key) => (store.has(key) ? store.get(key) : null));
  window.localStorage.setItem = vi.fn((key, value) => { store.set(key, value); });
  window.localStorage.removeItem = vi.fn((key) => { store.delete(key); });
  window.alert = vi.fn();
  // @ts-expect-error: partial clipboard mock
  navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
  global.fetch = vi.fn();
});

afterEach(() => {
  window.alert = origAlert;
  // @ts-expect-error: restore
  navigator.clipboard = origClipboard;
  global.fetch = origFetch as any;
  window.localStorage.getItem = origGetItem;
  window.localStorage.setItem = origSetItem;
  window.localStorage.removeItem = origRemoveItem;
  vi.clearAllMocks();
});

function typeInto(selectorText: string, value: string) {
  const input = screen.getByLabelText(selectorText) as HTMLInputElement | HTMLTextAreaElement;
  fireEvent.change(input, { target: { value } });
  return input;
}

describe("SupportPopup - rendering and validation", () => {
  test("disables Submit Ticket and Copy details when subject and description are empty", () => {
    render(<SupportPopup open={true} onClose={vi.fn()} />);
    const copyBtn = screen.getByRole("button", { name: /copy details/i });
    const submitBtn = screen.getByTestId("submit-btn") as HTMLButtonElement;
    expect(copyBtn).toBeDisabled();
    expect(submitBtn).toBeDisabled();
  });

  test("enables Copy details when subject is provided", () => {
    render(<SupportPopup open={true} onClose={vi.fn()} />);
    typeInto("Subject *", "A subject");
    const copyBtn = screen.getByRole("button", { name: /copy details/i });
    expect(copyBtn).toBeEnabled();
  });

  test("enables Submit Ticket when both subject and description are provided", () => {
    render(<SupportPopup open={true} onClose={vi.fn()} />);
    typeInto("Subject *", "Login fails");
    typeInto("Description *", "Cannot login using SSO.");
    const submitBtn = screen.getByTestId("submit-btn") as HTMLButtonElement;
    expect(submitBtn).toBeEnabled();
  });

  test("shows guest-only fields when x-user is not in localStorage", () => {
    render(<SupportPopup open={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone \(optional\)/i)).toBeInTheDocument();
  });

  test("hides guest-only fields when x-user exists", () => {
    window.localStorage.setItem("x-user", "u123");
    render(<SupportPopup open={true} onClose={vi.fn()} />);
    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email \*/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/phone \(optional\)/i)).not.toBeInTheDocument();
  });
});

describe("SupportPopup - errorDetails auto-population", () => {
  const errorDetails = {
    errorId: "err-42",
    timestamp: "2025-01-01T00:00:00Z",
    url: "https://app.example.com/path",
    userAgent: "Mozilla/5.0",
    viewport: "1200x800",
    system: { platform: "web", language: "en-US", onLine: true, memory: { used: 104857600 } },
    localStorage: { hasAuth: false, hasUser: true, hasLang: true, hasTheme: false },
    error: {
      name: "TypeError",
      message: "Cannot read properties of undefined (reading 'x')",
      stack: "stack trace...",
      componentStack: "component stack..."
    }
  };

  test("pre-populates subject, priority, type, module and description", () => {
    render(<SupportPopup open={true} onClose={vi.fn()} errorDetails={errorDetails} />);
    const subjectInput = screen.getByLabelText("Subject *") as HTMLInputElement;
    expect(subjectInput.value).toMatch(/^System Error: TypeError - Cannot read properties of undefined/);
    const priority = screen.getByLabelText("Priority") as HTMLSelectElement;
    const type = screen.getByLabelText("Type") as HTMLSelectElement;
    const moduleSel = screen.getByLabelText("Module") as HTMLSelectElement;
    expect(priority.value).toBe("High");
    expect(type.value).toBe("Bug");
    expect(moduleSel.value).toBe("Other");

    const desc = screen.getByLabelText("Description *") as HTMLTextAreaElement;
    expect(desc.value).toContain("Automated Error Report");
    expect(desc.value).toContain("Error ID: `err-42`");
    expect(desc.value).toContain("Type: TypeError");
    expect(desc.value).toContain("Stack Trace:");
  });
});

describe("SupportPopup - copy details", () => {
  test("copies subject when description is empty", async () => {
    render(<SupportPopup open={true} onClose={vi.fn()} />);
    typeInto("Subject *", "Subject only");
    const copyBtn = screen.getByRole("button", { name: /copy details/i });
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Subject only");
      expect(window.alert).toHaveBeenCalledWith("Details copied to clipboard");
    });
  });

  test("copies description when provided", async () => {
    render(<SupportPopup open={true} onClose={vi.fn()} />);
    typeInto("Subject *", "S");
    typeInto("Description *", "Full details...");
    const copyBtn = screen.getByRole("button", { name: /copy details/i });
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Full details...");
    });
  });

  test("silently ignores clipboard errors", async () => {
    // Intentional override of mock for error testing
    navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error("Clipboard denied"));
    render(<SupportPopup open={true} onClose={vi.fn()} />);
    typeInto("Subject *", "X");
    const copyBtn = screen.getByRole("button", { name: /copy details/i });
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(window.alert).not.toHaveBeenCalledWith("Details copied to clipboard");
    });
  });
});

describe("SupportPopup - submission flow", () => {
  function setupForm({ loggedIn = false } = {}) {
    if (loggedIn) {
      window.localStorage.setItem("x-user", "user-token");
    }
    const onClose = vi.fn();
    render(<SupportPopup open={true} onClose={onClose} />);
    typeInto("Subject *", "Issue creating invoice");
    typeInto("Description *", "Detailed repro steps...");

    if (!loggedIn) {
      typeInto("Your Name *", "Guest User");
      typeInto("Email *", "guest@example.com");
      typeInto("Phone (optional)", "+123456789");
    }

    const submitBtn = screen.getByTestId("submit-btn") as HTMLButtonElement;
    return { onClose, submitBtn };
  }

  test("shows loading state and posts payload for guest users (includes requester)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: "TCK-1001" })
    });

    const { onClose, submitBtn } = setupForm({ loggedIn: false });

    fireEvent.click(submitBtn);
    // Button should enter loading state
    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.textContent).toMatch(/creating ticket/i);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, any];
    expect(url).toBe("/api/support/tickets");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ "content-type": "application/json" });
    const body = JSON.parse(init.body as string);
    // Required fields
    expect(body).toMatchObject({
      subject: "Issue creating invoice",
      type: "Bug",
      priority: "Medium",
      category: "Technical",
      subCategory: "Bug Report",
      module: "Other",
    });
    // Guest-only requester payload
    expect(body.requester).toMatchObject({
      name: "Guest User",
      email: "guest@example.com",
      phone: "+123456789",
    });

    // Success alert and closing
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Support Ticket Created Successfully"));
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Ticket ID: TCK-1001"));
      expect(onClose).toHaveBeenCalled();
    });
  });

  test("does not include requester for logged-in users, still succeeds", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: "TCK-2002" })
    });

    const { onClose, submitBtn } = setupForm({ loggedIn: true });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, any];
    const body = JSON.parse(init.body as string);
    expect(body.requester).toBeUndefined();

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Ticket ID: TCK-2002"));
      expect(onClose).toHaveBeenCalled();
    });
  });

  test("handles API error gracefully and resets button state", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "server error" })
    });

    const { submitBtn } = setupForm({ loggedIn: false });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/Failed to create ticket/i));
    });

    // Button should be reset
    expect(submitBtn.disabled).toBe(false);
    expect(submitBtn.textContent).toMatch(/submit ticket/i);
  });

  test("handles network rejection and resets button state", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network down"));

    const { submitBtn } = setupForm({ loggedIn: false });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Network down"));
    });

    expect(submitBtn.disabled).toBe(false);
    expect(submitBtn.textContent).toMatch(/submit ticket/i);
  });
});
