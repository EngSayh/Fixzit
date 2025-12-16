import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";

// Mock translation context
vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback || _key,
    isRTL: false,
  }),
}));

// Mock next/link for testing environment
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Silence toast notifications
vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

import ProfilePage from "@/app/(app)/profile/page";

const originalEnv = { ...process.env };

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "test" };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("renders fetched profile data on success", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          name: "Jane Doe",
          email: "jane@example.com",
          phone: "123",
          role: "Manager",
          joinDate: "Feb 2024",
        },
      }),
    }) as unknown as typeof fetch;

    await act(async () => {
      render(<ProfilePage />);
    });

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(await screen.findByText("jane@example.com")).toBeInTheDocument();
  });

  it("shows retry UI and avoids admin fallback in production on fetch failure", async () => {
    process.env.NODE_ENV = "production";
    const fetchMock = vi.fn();
    fetchMock
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            name: "Recovered User",
            email: "recovered@example.com",
            role: "User",
            joinDate: "Mar 2024",
          },
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    await act(async () => {
      render(<ProfilePage />);
    });

    // Error banner with retry CTA
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Failed to load profile data");
    expect(screen.queryByText("Admin User")).not.toBeInTheDocument();

    // Retry triggers a second fetch and loads data
    await act(async () => {
      fireEvent.click(screen.getByText("Retry"));
    });

    expect(await screen.findByText("Recovered User")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
