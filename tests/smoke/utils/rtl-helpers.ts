import type { Page } from "@playwright/test";
import { existsSync } from "node:fs";

export const ADMIN_STATE_PATH =
  process.env.RTL_SMOKE_ADMIN_STATE ?? "tests/state/admin.json";
export const hasAdminState = existsSync(ADMIN_STATE_PATH);

export const setLocaleToArabic = async (page: Page) => {
  await page.evaluate(() => {
    localStorage.setItem("locale", "ar");
    localStorage.setItem("fxz.locale", "ar-SA");
    localStorage.setItem("fxz.lang", "ar");
  });
};
