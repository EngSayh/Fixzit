/**
 * Help page E2E tests (Playwright)
 * Framework: @playwright/test (Playwright Test)
 *
 * Focus:
 * - Validates UI/UX described in the provided diff for the Help page, including quick actions,
 *   tutorials, and the dynamic articles list fetched from /api/help/articles.
 * - Covers happy paths, edge cases (empty results), and failure conditions (network error).
 *
 * Notes:
 * - We intercept /api/help/articles to provide deterministic responses.
 * - We verify popup behavior for window.open quick actions by listening for 'popup' events.
 * - We avoid introducing new dependencies to match repository conventions.
 */

import { test, expect } from "@playwright/test";

const HELP_URL = "/help";
const API_ARTICLES = "**/api/help/articles";

test.describe("Help page - Knowledge Center", () => {
  test("renders hero section and quick actions", async ({ page }) => {
    await page.route(API_ARTICLES, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      }),
    );

    await page.goto(HELP_URL);

    await expect(
      page.getByRole("heading", { name: /Fixzit Knowledge Center/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Ask AI Assistant/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Create Support Ticket/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /View My Tickets/i }),
    ).toBeVisible();
  });

  test("quick actions open new tabs to the correct pages", async ({ page }) => {
    await page.route(API_ARTICLES, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      }),
    );

    await page.goto(HELP_URL);

    const [aiPopup] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("button", { name: /Ask AI Assistant/i }).click(),
    ]);
    await aiPopup.waitForLoadState("domcontentloaded");
    expect(new URL(aiPopup.url()).pathname).toBe("/help/ai-chat");

    const [ticketPopup] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("button", { name: /Create Support Ticket/i }).click(),
    ]);
    await ticketPopup.waitForLoadState("domcontentloaded");
    expect(new URL(ticketPopup.url()).pathname).toBe("/help/support-ticket");
  });

  test("renders the Interactive Tutorials grid with expected items and metadata", async ({
    page,
  }) => {
    await page.route(API_ARTICLES, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      }),
    );

    await page.goto(HELP_URL);

    await expect(
      page.getByRole("heading", { name: /Interactive Tutorials/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Getting Started with Fixzit FM/i }),
    ).toBeVisible();
    await expect(page.getByText(/15 min/i)).toBeVisible();

    const startButtonsCount = await page
      .getByRole("button", { name: "Start Tutorial" })
      .count();
    expect(startButtonsCount).toBeGreaterThanOrEqual(5);

    // Check difficulty labels are visible
    await expect(page.getByText("Beginner").first()).toBeVisible();
    await expect(page.getByText("Intermediate").first()).toBeVisible();
  });

  test("articles: renders fetched items with computed fields and correct links", async ({
    page,
  }) => {
    const updatedAt = "2024-01-15T12:00:00.000Z";
    await page.route(API_ARTICLES, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              slug: "work-orders-101",
              title: "Work Orders 101",
              category: "Work Orders",
              updatedAt,
            },
            { slug: "general-overview", title: "General Overview" }, // no category/updatedAt -> fallback behavior
          ],
        }),
      }),
    );

    await page.goto(HELP_URL);

    await expect(
      page.getByRole("heading", { name: "Work Orders 101" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "General Overview" }),
    ).toBeVisible();

    // Category fallback to "General" should be visible for the second article
    await expect(page.getByText("General")).toBeVisible();

    // Updated date is formatted as yyyy-mm-dd
    await expect(page.getByText(/Updated 2024-01-15/)).toBeVisible();

    // "Read More" for the first card should point to /help/work-orders-101
    const readMoreLink = page.locator("a", { hasText: "Read More" }).first();
    await expect(readMoreLink).toHaveAttribute(
      "href",
      /\/help\/work-orders-101$/,
    );
  });

  test("articles: shows empty state when API returns no items", async ({
    page,
  }) => {
    await page.route(API_ARTICLES, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      }),
    );

    await page.goto(HELP_URL);
    await expect(page.getByText("No articles found.")).toBeVisible();
  });

  test("articles: handles network failure gracefully", async ({ page }) => {
    await page.route(API_ARTICLES, (route) => route.abort("failed"));
    await page.goto(HELP_URL);
    await expect(page.getByText("No articles found.")).toBeVisible();
  });

  test("articles: not shown while loading, then empty state after resolve", async ({
    page,
  }) => {
    await page.route(API_ARTICLES, async (route) => {
      await new Promise((r) => setTimeout(r, 250));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      });
    });

    await page.goto(HELP_URL);

    // While loading: no "Read More" links present
    await expect(page.getByRole("link", { name: /Read More/i })).toHaveCount(0);

    // After resolution: empty state appears
    await expect(page.getByText("No articles found.")).toBeVisible();
  });

  test("System Overview section renders key headings", async ({ page }) => {
    await page.route(API_ARTICLES, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      }),
    );

    await page.goto(HELP_URL);

    await expect(
      page.getByRole("heading", { name: /System Overview/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Properties/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Work Orders/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /Vendors/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Finance/i })).toBeVisible();
  });
});
