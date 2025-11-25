import React from "react";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/i18n/I18nProvider";
import {
  TranslationProvider,
  useTranslation,
} from "@/contexts/TranslationContext";

const ORIGINAL_FETCH = global.fetch;

beforeAll(() => {
  global.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({}) }) as typeof fetch;
});

afterAll(() => {
  global.fetch = ORIGINAL_FETCH;
});

function IntegrationHarness() {
  const { t, language, setLanguage } = useTranslation();
  return (
    <div>
      <div data-testid="language">{language}</div>
      <div data-testid="translation">{t("landing.hero.actions.bookDemo")}</div>
      <button onClick={() => setLanguage(language === "ar" ? "en" : "ar")}>
        switch
      </button>
    </div>
  );
}

describe("I18nProvider + TranslationProvider integration", () => {
  it("renders Arabic translation then switches to English via setLanguage", async () => {
    render(
      <I18nProvider initialLocale="ar">
        <TranslationProvider>
          <IntegrationHarness />
        </TranslationProvider>
      </I18nProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByTestId("language").textContent).toBe("ar");
        expect(screen.getByTestId("translation").textContent).toBe(
          "احجز عرضًا مباشرًا",
        );
      },
      { timeout: 10000 },
    );

    await userEvent.click(screen.getByRole("button", { name: /switch/i }));

    await waitFor(
      () => {
        expect(screen.getByTestId("language").textContent).toBe("en");
        expect(screen.getByTestId("translation").textContent).toBe(
          "Book a live demo",
        );
      },
      { timeout: 10000 },
    );
  });
});
