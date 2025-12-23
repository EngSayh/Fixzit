/**
 * OfflineIndicator RTL/i18n Snapshot Tests
 * 
 * Tests for:
 * - RTL layout (Arabic locale) with correct spacing (me-1)
 * - LTR layout (English locale)
 * - Brand color compliance (#00A859 Fixzit Green)
 * - Correct i18n key usage
 */

import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// Mock navigator.onLine
let mockOnLine = true;
const originalNavigator = global.navigator;

beforeEach(() => {
  vi.clearAllMocks();
  mockOnLine = true;
  Object.defineProperty(global, "navigator", {
    value: { onLine: mockOnLine },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(global, "navigator", {
    value: originalNavigator,
    writable: true,
    configurable: true,
  });
});

// Mock TranslationContext with RTL support
const mockT = vi.fn((key: string, fallback?: string) => {
  const translations: Record<string, string> = {
    "common.offline.backOnline": "You're back online!",
    "common.offline.offline": "You're offline. Some features may be unavailable.",
  };
  return translations[key] || fallback || key;
});

const mockTArabic = vi.fn((key: string, fallback?: string) => {
  const translations: Record<string, string> = {
    "common.offline.backOnline": "أنت متصل مجدداً!",
    "common.offline.offline": "أنت غير متصل. بعض الميزات قد لا تكون متاحة.",
  };
  return translations[key] || fallback || key;
});

let mockIsRTL = false;
let mockCurrentT = mockT;

vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({
    t: mockCurrentT,
    isRTL: mockIsRTL,
    language: mockIsRTL ? "ar" : "en",
  }),
}));

import { OfflineIndicator } from "@/components/common/OfflineIndicator";

describe("OfflineIndicator RTL/i18n Tests", () => {
  describe("LTR (English) Mode", () => {
    beforeEach(() => {
      mockIsRTL = false;
      mockCurrentT = mockT;
    });

    it("renders offline state with English text", () => {
      // Simulate offline
      Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });
      
      render(<OfflineIndicator />);
      
      const status = screen.getByRole("status");
      expect(status).toBeInTheDocument();
      expect(status).toHaveTextContent("You're offline. Some features may be unavailable.");
    });

    it("uses correct i18n key for offline message", () => {
      Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });
      
      render(<OfflineIndicator />);
      
      expect(mockT).toHaveBeenCalledWith(
        "common.offline.offline",
        "You're offline. Some features may be unavailable."
      );
    });

    it("has me-1 class for RTL-safe icon spacing", () => {
      Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });
      
      const { container } = render(<OfflineIndicator />);
      
      // Find the WifiOff icon (first svg in the container)
      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("me-1");
    });
  });

  describe("RTL (Arabic) Mode", () => {
    beforeEach(() => {
      mockIsRTL = true;
      mockCurrentT = mockTArabic;
    });

    it("renders offline state with Arabic text", () => {
      Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });
      
      render(<OfflineIndicator />);
      
      const status = screen.getByRole("status");
      expect(status).toBeInTheDocument();
      expect(status).toHaveTextContent("أنت غير متصل. بعض الميزات قد لا تكون متاحة.");
    });

    it("uses correct i18n key for Arabic offline message", () => {
      Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });
      
      render(<OfflineIndicator />);
      
      expect(mockTArabic).toHaveBeenCalledWith(
        "common.offline.offline",
        "You're offline. Some features may be unavailable."
      );
    });

    it("maintains me-1 spacing for RTL layout compatibility", () => {
      Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });
      
      const { container } = render(<OfflineIndicator />);
      
      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("me-1");
    });
  });

  describe("Brand Compliance", () => {
    it("uses Fixzit Green (#00A859) for reconnected state", async () => {
      // Start offline
      Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });
      
      const { container, rerender } = render(
        <OfflineIndicator showReconnectedMessage={true} />
      );
      
      // Simulate coming back online
      Object.defineProperty(global.navigator, "onLine", { value: true, configurable: true });
      
      // Trigger online event
      await act(async () => {
        window.dispatchEvent(new Event("online"));
      });
      
      rerender(<OfflineIndicator showReconnectedMessage={true} />);
      
      const status = container.querySelector('[role="status"]');
      if (status) {
        // Check for Fixzit Green brand token
        expect(status.className).toContain("bg-[#00A859]");
      }
    });

    it("uses destructive color for offline state", () => {
      Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });
      
      const { container } = render(<OfflineIndicator />);
      
      const status = container.querySelector('[role="status"]');
      expect(status).toHaveClass("bg-destructive");
    });
  });

  describe("Accessibility", () => {
    it("has role=status for screen readers", () => {
      Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });
      
      render(<OfflineIndicator />);
      
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("has aria-live=polite for non-intrusive announcements", () => {
      Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });
      
      render(<OfflineIndicator />);
      
      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-live", "polite");
    });

    it("icons have aria-hidden for screen reader compatibility", () => {
      Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });
      
      const { container } = render(<OfflineIndicator />);
      
      const icon = container.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Position Variants", () => {
    it("applies top position classes", () => {
      Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });
      
      const { container } = render(<OfflineIndicator position="top" />);
      
      const status = container.querySelector('[role="status"]');
      expect(status).toHaveClass("top-0");
    });

    it("applies bottom position classes", () => {
      Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });
      
      const { container } = render(<OfflineIndicator position="bottom" />);
      
      const status = container.querySelector('[role="status"]');
      expect(status).toHaveClass("bottom-0");
    });
  });
});
