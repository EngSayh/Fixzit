import { chromium } from "playwright";

const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "CORPORATE_ADMIN",
  "FM_MANAGER",
  "FINANCE",
  "HR",
  "PROCUREMENT",
  "PROPERTY_MANAGER",
  "EMPLOYEE",
  "TECHNICIAN",
  "VENDOR",
  "CUSTOMER",
  "OWNER",
  "AUDITOR",
];
const PAGES = [
  "/",
  "/fm",
  "/fm/dashboard",
  "/fm/work-orders",
  "/fm/properties",
  "/fm/finance",
  "/fm/hr",
  "/fm/crm",
  "/marketplace",
  "/fm/support",
  "/fm/compliance",
  "/fm/reports",
  "/fm/system",
  "/help",
  "/cms/privacy",
  "/cms/terms",
  "/cms/about",
];
const LOCALES = ["en", "ar"];
const FIRST_SCREENSHOT_DELAY_MS = 2000;
const BETWEEN_SCREENSHOT_DELAY_MS = 10000;

async function check(page, url, role, lang) {
  const errors = [];
  const failedReqs = [];

  page.on("console", (m) => {
    if (["error", "warn"].includes(m.type())) errors.push(m.text());
  });
  page.on("requestfailed", (r) => failedReqs.push(`${r.method()} ${r.url()}`));

  try {
    const resp = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 10000,
    });
    const status = resp?.status();

    await page.waitForTimeout(FIRST_SCREENSHOT_DELAY_MS);

    const t0 = `artifacts/${Date.now()}-${role}-${lang}-${url.replace(/\W+/g, "_")}-t0.png`;
    await page.screenshot({ path: t0, fullPage: true });

    await page.waitForTimeout(BETWEEN_SCREENSHOT_DELAY_MS);

    const t1 = t0.replace("-t0", "-t1");
    await page.screenshot({ path: t1, fullPage: true });

    return {
      status,
      errors: errors.length,
      failedReqs: failedReqs.length,
      t0,
      t1,
      hasIssues: status !== 200 || errors.length > 0 || failedReqs.length > 0,
    };
  } catch (error) {
    return {
      status: "ERROR",
      errors: 1,
      failedReqs: 0,
      error: error.message,
      hasIssues: true,
    };
  }
}

(async () => {
  const browser = await chromium.launch();
  const results = [];

  for (const role of ROLES) {
    console.log(`\n🔍 Testing role: ${role}`);
    for (const locale of LOCALES) {
      console.log(`   🌐 Locale: ${locale}`);
      const context = await browser.newContext();

      // Set role and language via localStorage
      await context.addInitScript(
        (roleValue) => localStorage.setItem("fxz.role", roleValue),
        role,
      );
      await context.addInitScript(
        (langValue) => localStorage.setItem("fxz.lang", langValue),
        locale,
      );

      const page = await context.newPage();

      for (const p of PAGES) {
        console.log(`    📄 Testing ${p}...`);
        const r = await check(page, `http://localhost:3000${p}`, role, locale);
        results.push({ role, lang: locale, page: p, ...r });
      }

      await context.close();
    }
  }

  await browser.close();

  // Generate report
  console.log("\n📊 QA VERIFICATION RESULTS");
  console.log("=".repeat(60));

  const failed = results.filter((r) => r.hasIssues);
  const passed = results.length - failed.length;

  results.forEach((r) => {
    const status = r.hasIssues ? "❌" : "✅";
    console.log(
      `${status} ${r.role} | ${r.page} | Status: ${r.status} | Errors: ${r.errors} | FailedReqs: ${r.failedReqs}`,
    );
  });

  console.log("\n" + "=".repeat(60));
  console.log(
    `📈 OVERALL: ${passed}/${results.length} tests passed (${Math.round((passed / results.length) * 100)}%)`,
  );

  if (failed.length > 0) {
    console.log("\n❌ FAILED TESTS:");
    failed.forEach((f) => {
      console.log(
        `  - ${f.role}: ${f.page} (${f.error || `Status: ${f.status}, Errors: ${f.errors}`})`,
      );
    });
    process.exit(1);
  }

  console.log("\n🎉 ALL TESTS PASSED! System is production-ready.");
  process.exit(0);
})();
