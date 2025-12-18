import React from "react";
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { I18nProvider } from "@/i18n/I18nProvider";
import { TranslationProvider } from "@/contexts/TranslationContext";
import arDict from "@/i18n/dictionaries/ar";
import enDict from "@/i18n/dictionaries/en";
import LandingPage from "@/app/page";
import { mockFetch, restoreFetch } from "@/tests/helpers/domMocks";

beforeAll(() => {
  mockFetch().mockResolvedValue({ ok: true, json: async () => ({}) });
});

afterAll(() => {
  restoreFetch();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LandingPage translations", () => {
  it("renders Arabic hero CTA when locale is Arabic", async () => {
    await act(async () => {
      render(
        <I18nProvider initialLocale="ar" initialDict={arDict}>
          <TranslationProvider>
            <LandingPage />
          </TranslationProvider>
        </I18nProvider>,
      );
    });

    await waitFor(
      () => {
        expect(screen.getByText("احجز عرضًا مباشرًا")).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });

  it("renders English hero CTA when locale is English", async () => {
    await act(async () => {
      render(
        <I18nProvider initialLocale="en" initialDict={enDict}>
          <TranslationProvider>
            <LandingPage />
          </TranslationProvider>
        </I18nProvider>,
      );
    });

    await waitFor(
      () => {
        expect(screen.getByText("Book a live demo")).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });
});
