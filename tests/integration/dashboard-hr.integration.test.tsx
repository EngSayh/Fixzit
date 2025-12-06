import React from "react";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { I18nProvider } from "@/i18n/I18nProvider";
import { TranslationProvider } from "@/contexts/TranslationContext";
import HRDashboard from "@/app/dashboard/hr/page";

const ORIGINAL_FETCH = global.fetch;

beforeAll(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      employees: { total: 8, active: 7, on_leave: 1 },
      attendance: { present: 5, absent: 2, late: 1 },
    }),
  }) as typeof fetch;
});

afterAll(() => {
  global.fetch = ORIGINAL_FETCH;
});

describe("HR dashboard RTL integration", () => {
  it("renders Arabic header and enforces RTL direction", async () => {
    await act(async () => {
      render(
        <I18nProvider initialLocale="ar">
          <TranslationProvider>
            <HRDashboard />
          </TranslationProvider>
        </I18nProvider>,
      );
    });

    await waitFor(
      () => {
        expect(screen.getByText("الموارد البشرية")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(document.documentElement.dir).toBe("rtl");
  });
});
