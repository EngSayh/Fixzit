/**
  Testing framework: Playwright Test (@playwright/test)
  Purpose: Validate package.json structure, scripts, and critical configuration.
*/
import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";

const pkgPath = resolve(process.cwd(), "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

test.describe("package.json configuration integrity", () => {
  test("should define basic metadata (name, version in semver format)", () => {
    expect(pkg.name).toBe("fixzit-frontend");
    expect(typeof pkg.version).toBe("string");
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("should include expected npm scripts with exact commands", () => {
    const expectedScripts: Record<string, string> = {
      dev: `next dev`,
      build: `next build`,
      start: `next start -p 3000`,
      lint: `next lint`,
      typecheck: `tsc -p .`,
      "qa:verify": `node scripts/qa/halt-fix-verify.mjs`,
      verify: `node qa/scripts/verify.mjs`,
      "verify:fast": `node qa/scripts/verify.mjs --fast`,
      "qa:seed": `node qa/scripts/seed.mjs`,
      "qa:db": `node qa/scripts/dbConnectivity.mjs`,
      "qa:scan:placeholders": `node qa/scripts/scanPlaceholders.mjs`,
      "qa:scan:duplicates": `node qa/scripts/scanDuplicates.mjs`,
      "qa:e2e": `playwright test`,
      "verify:prep": `node -e "require('fs').mkdirSync('_artifacts',{recursive:true})"`,
      "verify:routes": `tsx scripts/verify-routes.ts`,
      "verify:api": `tsx scripts/verify-api.ts`,
      "verify:mongo": `tsx scripts/mongo-check.ts`,
      "verify:all": `npm run verify:prep && npm run build && concurrently -k -s first "npm run start" "wait-on http://localhost:3000 && npm run verify:routes && npm run verify:api && npm run verify:mongo"`,
      doctor: `npm run lint && npm run typecheck && npm run build && npm run verify:all`,
      test: `playwright test`,
      "test:headed": `playwright test --headed`,
      "test:debug": `playwright test --debug`,
      "test:ui": `playwright test --ui`,
      "test:install": `playwright install`,

      "artifacts:init": `mkdir -p _artifacts`,
      "reports:clean": `node -e "require('fs').rmSync('_artifacts', {recursive:true, force:true}); require('fs').mkdirSync('_artifacts', {recursive:true});"`,
      "pack:reports": `npm run artifacts:init && tar -czf _artifacts/reports-$(date +%Y%m%d-%H%M%S).tar.gz _artifacts || true`,
      "clean:root": `tsx scripts/janitor.ts --apply`,
    };

    expect(pkg.scripts).toBeTruthy();
    for (const [name, expected] of Object.entries(expectedScripts)) {
      expect(pkg.scripts?.[name], `scripts["${name}"] should be defined`).toBe(
        expected,
      );
    }
  });

  test("script values are non-empty and trimmed", () => {
    const entries = Object.entries(pkg.scripts || {}) as [string, string][];
    expect(entries.length).toBeGreaterThan(0);
    for (const [, value] of entries) {
      expect(typeof value).toBe("string");
      expect(value).toBe(value.trim());
      expect(value.length).toBeGreaterThan(0);
    }
  });

  test("test runner is Playwright", () => {
    expect(pkg.scripts?.test).toBe("playwright test");
    expect(
      Boolean(pkg.devDependencies && pkg.devDependencies["@playwright/test"]),
    ).toBeTruthy();
  });

  test("start script binds to port 3000", () => {
    expect(pkg.scripts?.start).toContain("-p 3000");
  });

  test("verify:all orchestrates server start and verifications", () => {
    const s = pkg.scripts?.["verify:all"] as string;
    expect(typeof s).toBe("string");
    expect(s).toContain("concurrently -k -s first");
    expect(s).toContain("npm run start");
    expect(s).toContain("wait-on http://localhost:3000");
    expect(s).toContain("npm run verify:routes");
    expect(s).toContain("npm run verify:api");
    expect(s).toContain("npm run verify:mongo");
  });

  test("overrides and devDependencies pin critical packages", () => {
    expect(pkg.overrides?.["postcss-selector-parser"]).toBe("6.0.13");
    expect(pkg.devDependencies?.["postcss-selector-parser"]).toBe("6.0.13");
  });

  test("essential runtime dependencies are present", () => {
    const essential = [
      "next",
      "react",
      "react-dom",
      "typescript",

      "mongodb",
      "mongoose",
      "axios",
      "swr",
      "zod",
      "jose",
      "jsonwebtoken",
      "lru-cache",
      "nanoid",
      "qrcode",
      "tailwind-merge",
      "tailwindcss-animate",
      "@radix-ui/react-dialog",
    ];
    for (const dep of essential) {
      expect(
        Boolean(pkg.dependencies && pkg.dependencies[dep]),
        `missing dependency "${dep}"`,
      ).toBeTruthy();
      expect(typeof pkg.dependencies?.[dep]).toBe("string");
    }
  });

  test("essential dev dependencies are present", () => {
    const devEssential = [
      "@playwright/test",
      "postcss",
      "autoprefixer",
      "tailwindcss",
      "tsx",
      "wait-on",
      "concurrently",
      "fast-glob",
      "start-server-and-test",
    ];
    for (const dep of devEssential) {
      expect(
        Boolean(pkg.devDependencies && pkg.devDependencies[dep]),
        `missing devDependency "${dep}"`,
      ).toBeTruthy();
      expect(typeof pkg.devDependencies?.[dep]).toBe("string");
    }
  });

  test("dependency versions resemble semver ranges or pins; overrides are pinned", () => {
    const isRange = (s: unknown) =>
      typeof s === "string" && /^[\^~]?\d+\.\d+\.\d+/.test(s);
    const isPin = (s: unknown) =>
      typeof s === "string" && /^\d+\.\d+\.\d+$/.test(s);

    for (const [name, ver] of Object.entries(pkg.dependencies || {})) {
      expect(
        isRange(ver),
        `invalid dependency version for ${name}: ${String(ver)}`,
      ).toBeTruthy();
    }
    for (const [name, ver] of Object.entries(pkg.devDependencies || {})) {
      expect(
        isRange(ver),
        `invalid devDependency version for ${name}: ${String(ver)}`,
      ).toBeTruthy();
    }
    for (const [name, ver] of Object.entries(pkg.overrides || {})) {
      expect(
        isPin(ver),
        `override "${name}" should be pinned, got ${String(ver)}`,
      ).toBeTruthy();
    }
  });
});
