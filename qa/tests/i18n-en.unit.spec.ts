/**
 * Unit tests for English i18n dictionary using Playwright Test.
 * Framework: @playwright/test (describe/test/expect).
 * These tests run in Node context and do not require a browser.
 */

import { test, expect } from "@playwright/test";
import en from "../../i18n/dictionaries/en";

const enAny = en as any; // Suppress type errors for outdated test structure
type Dict = Record<string, any>;
type Leaf = string | number | boolean | null | undefined;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function walkLeaves(
  obj: Dict,
  onLeaf: (path: string[], value: unknown) => void,
  path: string[] = [],
) {
  Object.entries(obj).forEach(([k, v]) => {
    const next = [...path, k];
    if (isPlainObject(v)) {
      walkLeaves(v as Dict, onLeaf, next);
    } else {
      onLeaf(next, v);
    }
  });
}

test.describe("i18n: English dictionary (en)", () => {
  test("exports an object with expected top-level namespaces", () => {
    expect(en).toBeTruthy();
    expect(typeof en).toBe("object");

    const namespaces = Object.keys(en);
    expect(namespaces).toEqual(
      expect.arrayContaining([
        "common",
        "header",
        "nav",
        "dashboard",
        "workOrders",
        "finance",
        "maintenance",
        "orders",
        "landing",
        "footer",
        "settings",
      ]),
    );
  });

  test("contains required common strings with exact values", () => {
    expect(en.common.appName).toBe("Fixzit Enterprise");
    expect(en.common.brand).toBe("FIXZIT ENTERPRISE");

    expect(en.common.actions.save).toBe("Save");
    expect(en.common.actions.cancel).toBe("Cancel");
    expect(en.common.actions.close).toBe("Close");
    expect(en.common.search).toBe("Search");
    expect(en.common.searchPlaceholder).toBe(
      "Search Work Orders, Properties, Tenants…",
    );
    expect(en.common.language).toBe("Language");
    expect(en.common.signIn).toBe("Sign in");
    expect(en.common.signOut).toBe("Sign out");
    expect(en.common.unread).toBe("unread");
    expect(en.common.noNotifications).toBe("No new notifications");
    expect(en.common.loading).toBe("Loading...");
    expect(en.common.allCaughtUp).toBe("You're all caught up!");
    expect(en.common.viewAll).toBe("View all notifications");
  });

  test("has header entries properly defined", () => {
    expect(en.header.myWork).toBe("My Work");
    expect(en.header.inbox).toBe("Inbox");
    expect(en.header.notifications).toBe("Notifications");
  });

  test("has nav entries properly defined", () => {
    expect(en.nav.dashboard).toBe("Dashboard");
    expect(en.nav["work-orders"]).toBe("Work Orders");
    expect(en.nav.properties).toBe("Properties");
    expect(en.nav.assets).toBe("Assets");
    expect(en.nav.tenants).toBe("Tenants");
    expect(en.nav.vendors).toBe("Vendors");
    expect(en.nav.projects).toBe("Projects");
    expect(en.nav.rfqs).toBe("RFQs & Bids");
    expect(en.nav.invoices).toBe("Invoices");
    expect(en.nav.finance).toBe("Finance");
    expect(en.nav.hr).toBe("Human Resources");
    expect(en.nav.crm).toBe("CRM");
    expect(en.nav.marketplace).toBe("Marketplace");
    expect(en.nav.support).toBe("Support");
    expect(en.nav.compliance).toBe("Compliance");
    expect(en.nav.reports).toBe("Reports");
    expect(en.nav.system).toBe("System Management");
    expect(en.nav.maintenance).toBe("Maintenance");
    expect(en.nav.orders).toBe("Orders");
    expect(en.nav.profile).toBe("Profile");
    expect(en.nav.settings).toBe("Settings");
    expect(en.nav.notifications).toBe("Notifications");
  });

  test("validates dashboard/workOrders/finance core labels", () => {
    expect(en.dashboard.title).toBe("Dashboard");
    expect(en.dashboard.kpis).toBe("KPIs & Metrics");
    expect(en.dashboard.quickActions).toBe("Quick Actions");

    expect(enAny.workOrders.title).toBe("Work Orders");
    expect(enAny.workOrders.create).toBe("Create Work Order");
    expect(enAny.workOrders.fields.title).toBe("Title");
    expect(enAny.workOrders.fields.priority).toBe("Priority");
    expect(enAny.workOrders.fields.property).toBe("Property");

    expect(enAny.finance.title).toBe("Finance");
    expect(enAny.finance.invoices).toBe("Invoices");
    expect(enAny.finance.payments).toBe("Payments");
  });

  test("validates maintenance and orders sections", () => {
    expect(en.maintenance.description).toBe(
      "Manage equipment maintenance schedules and tasks",
    );
    expect(en.maintenance.tasks).toBe("Maintenance Tasks");
    expect(en.maintenance.asset).toBe("Asset");
    expect(en.maintenance.due).toBe("Due");
    expect(en.maintenance.assigned).toBe("Assigned to");

    expect(en.orders.pageDescription).toBe(
      "Manage purchase orders and service orders",
    );
    expect(en.orders.purchaseOrders).toBe("Purchase Orders");
    expect(en.orders.serviceOrders).toBe("Service Orders");
  });

  test("contains valid landing and footer content", () => {
    expect(en.landing.title).toBe("Fixzit Enterprise Platform");
    expect(en.landing.subtitle).toBe(
      "Unified Facility Management + Marketplace Solution for modern property operations",
    );
    expect(en.landing.hero.cta1).toBe("Access Fixzit FM");
    expect(en.landing.hero.cta2).toBe("Fixzit Souq");
    expect(en.landing.hero.cta3).toBe("Aqar Real Estate");
    // TYPESCRIPT FIX: Correct property name is 'titleLanding' not 'title'
    expect(en.landing.features.titleLanding).toBe(
      "Complete Facility Management Solution",
    );

    expect(en.footer.backHome).toBe("Back to Home");
    expect(en.footer.brand).toBe("Fixzit");
    expect(en.footer.description).toBe(
      "Facility management + marketplaces in one platform.",
    );
    expect(en.footer.company).toBe("Company");
    expect(en.footer.about).toBe("About");
    expect(en.footer.careers).toBe("Careers");
    expect(en.footer.legal).toBe("Legal");
    expect(en.footer.privacy).toBe("Privacy");
    expect(en.footer.terms).toBe("Terms");
    expect(en.footer.support).toBe("Support");
    expect(en.footer.help).toBe("Help Center");
    expect(en.footer.ticket).toBe("Open a ticket");
    expect(en.footer.copyright).toBe("Fixzit. All rights reserved.");
  });

  test("validates settings structure and representative values", () => {
    expect(enAny.settings.subtitle).toBe(
      "Manage your account settings and preferences",
    );

    expect(enAny.settings.tabs.profile).toBe("Profile");
    expect(enAny.settings.tabs.security).toBe("Security");
    expect(enAny.settings.tabs.notifications).toBe("Notifications");
    expect(enAny.settings.tabs.preferences).toBe("Preferences");

    expect(enAny.settings.profile.title).toBe("Profile Information");
    expect(enAny.settings.profile.firstName).toBe("First Name");
    expect(enAny.settings.profile.lastName).toBe("Last Name");
    expect(enAny.settings.profile.email).toBe("Email");
    expect(enAny.settings.profile.phone).toBe("Phone");
    expect(enAny.settings.profile.department).toBe("Department");
    expect(enAny.settings.profile.save).toBe("Save Changes");

    expect(enAny.settings.security.title).toBe("Security Settings");
    expect(enAny.settings.security.currentPassword).toBe("Current Password");
    expect(enAny.settings.security.newPassword).toBe("New Password");
    expect(enAny.settings.security.confirmPassword).toBe("Confirm Password");
    expect(enAny.settings.security.twoFactor).toBe("Two-Factor Authentication");
    expect(enAny.settings.security.twoFactorDesc).toBe(
      "Add an extra layer of security to your account",
    );
    expect(enAny.settings.security.updatePassword).toBe("Update Password");

    expect(enAny.settings.notifications.title).toBe("Notification Preferences");
    expect(enAny.settings.notifications.email).toBe("Email");
    expect(enAny.settings.notifications.sms).toBe("SMS");
    expect(enAny.settings.notifications.push).toBe("Push Notifications");
    expect(enAny.settings.notifications.workOrders).toBe("Work Orders");
    expect(enAny.settings.notifications.maintenance).toBe("Maintenance");
    expect(enAny.settings.notifications.reports).toBe("Reports");
    expect(enAny.settings.notifications.save).toBe("Save Preferences");

    expect(enAny.settings.preferences.title).toBe("App Preferences");
    expect(enAny.settings.preferences.language).toBe("Language");
    expect(enAny.settings.preferences.timezone).toBe("Timezone");
    expect(enAny.settings.preferences.theme).toBe("Theme");
    expect(enAny.settings.preferences.english).toBe("English");
    expect(enAny.settings.preferences.arabic).toBe("Arabic");
    expect(enAny.settings.preferences.riyadh).toBe("Asia/Riyadh (GMT+3)");
    expect(enAny.settings.preferences.utc).toBe("UTC");
    expect(enAny.settings.preferences.light).toBe("Light");
    expect(enAny.settings.preferences.dark).toBe("Dark");
    expect(enAny.settings.preferences.system).toBe("System");
    expect(enAny.settings.preferences.save).toBe("Save Preferences");
  });

  test("all leaf values are non-empty strings with no leading/trailing spaces and no TODO/TBD placeholders", () => {
    const emptyPaths: string[] = [];
    const whitespacePaths: string[] = [];
    const placeholderPaths: string[] = [];

    walkLeaves(en as Dict, (path, value) => {
      if (typeof value === "string") {
        if (value.trim() === "") emptyPaths.push(path.join("."));
        if (value !== value.trim()) whitespacePaths.push(path.join("."));
        const lower = value.toLowerCase();
        if (lower.includes("todo") || lower.includes("tbd")) {
          placeholderPaths.push(path.join("."));
        }
      } else {
        // Record non-string leaves in dedicated test below
      }
    });

    expect(emptyPaths).toEqual([]);
    expect(whitespacePaths).toEqual([]);
    expect(placeholderPaths).toEqual([]);
  });

  test("no non-string leaves are present (all leaf nodes should be strings)", () => {
    const nonStringLeaves: Array<{ path: string; value: unknown }> = [];
    walkLeaves(en as Dict, (path, value) => {
      if (typeof value !== "string") {
        nonStringLeaves.push({ path: path.join("."), value });
      }
    });
    expect(nonStringLeaves).toEqual([]);
  });
});
