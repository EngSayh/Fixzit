/**
 * Framework: Playwright Test
 * Purpose: Unit-like static validation of the Help Article page server component as per the PR diff.
 */
import { test, expect } from "@playwright/test";
import fs from "fs";
import fg from "fast-glob";

async function findHelpArticlePageFile(): Promise<string | null> {
  const patterns = [
    "app/help/**/page.tsx",
    "app/**/help/**/page.tsx",
    "src/app/help/**/page.tsx",
    "src/app/**/help/**/page.tsx",
  ];
  const matches = await fg(patterns, {
    ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**"],
    dot: true,
    onlyFiles: true,
    unique: true,
    absolute: false,
  });

  // If multiple matches, prefer ones containing HelpArticlePage
  for (const m of matches) {
    try {
      const code = fs.readFileSync(m, "utf8");
      if (
        /export\s+default\s+async\s+function\s+HelpArticlePage\b/.test(code)
      ) {
        return m;
      }
    } catch {
      // ignore read errors and continue
    }
  }
  // Fallback to first match if any
  if (matches.length > 0) return matches[0];
  return null;
}

test.describe("HelpArticlePage (code validation)", () => {
  let pagePath: string;
  let code: string;

  test.beforeAll(async () => {
    const p = await findHelpArticlePageFile();
    expect(
      p,
      "Could not locate the Help Article page file. Expected it under app/help/[slug]/page.tsx or similar.",
    ).not.toBeNull();
    pagePath = p as string;
    code = fs.readFileSync(pagePath, "utf8");
  });

  test("exports revalidate = 60", async () => {
    expect(code).toMatch(/export\s+const\s+revalidate\s*=\s*60\b/);
  });

  test("imports getDatabase and queries PUBLISHED article by slug from 'helparticles'", async () => {
    expect(code).toMatch(
      /import\s*\{\s*getDatabase\s*\}\s*from\s*["']@\/lib\/mongodb["']/,
    );
    expect(code).toMatch(
      /collection\s*<\s*Article\s*>\s*\(\s*["']helparticles["']\s*\)/,
    );

    // findOne includes slug and status: 'PUBLISHED'
    expect(code).toMatch(
      /findOne\s*\(\s*\{\s*[\s\S]*?slug\s*:\s*params\.slug[\s\S]*?\}\s*as\s*any\s*\)/,
    );
    expect(code).toMatch(/status\s*:\s*['"]PUBLISHED['"]/);
  });

  test("renders fallback UI when article is not available", async () => {
    expect(code).toContain("Article not available.");
  });

  test("breadcrumb and category fallback", async () => {
    // Help Center link
    expect(code).toMatch(
      /<Link[^>]*href=["']\/help["'][^>]*>[\s\S]*Help Center[\s\S]*<\/Link>/,
    );
    // Category fallback to General
    expect(code).toMatch(/\{\s*a\.category\s*\|\|\s*['"]General['"]\s*\}/);
  });

  test("renders content via dangerouslySetInnerHTML with await renderMarkdown(a.content)", async () => {
    expect(code).toMatch(
      /dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:\s*await\s+renderMarkdown\(\s*a\.content\s*\)\s*\}\}/,
    );
  });

  test("shows 'Last updated' label and has navigation links", async () => {
    expect(code).toContain("Last updated");
    // All articles link back to /help
    expect(code).toMatch(
      /<Link[^>]*href=["']\/help["'][^>]*>[\s\S]*All articles[\s\S]*<\/Link>/,
    );
    // Contact Support link
    expect(code).toMatch(
      /<Link[^>]*href=["']\/support\/my-tickets["'][^>]*>[\s\S]*Contact Support[\s\S]*<\/Link>/,
    );
  });

  test("renderMarkdown function transforms newlines into paragraphs and <br/> as designed", async () => {
    // Extract the return expression inside renderMarkdown to evaluate behavior without importing the module
    const fnMatch = code.match(
      /async\s+function\s+renderMarkdown\s*\(\s*md\s*:\s*string\s*\)\s*\{\s*return\s+([\s\S]*?)\s*;\s*\}/,
    );
    expect(
      fnMatch,
      "renderMarkdown function not found in page file.",
    ).not.toBeNull();
    const returnExpr = (fnMatch as RegExpMatchArray)[1]; // e.g., md.split(/\n{2,}/).map(...).join("")

    // Build an evaluator function: (md) => <returnExpr>
    const mdToHtml = new Function("md", `return (${returnExpr});`) as (
      md: string,
    ) => string;

    // Happy path: two paragraphs, single newline becomes <br/>
    const input = "Line A\nLine B\n\nNext paragraph.";
    const output = mdToHtml(input);
    expect(output).toBe("<p>Line A<br/>Line B</p><p>Next paragraph.</p>");

    // Edge: multiple blank lines treated as paragraph boundaries
    expect(mdToHtml("X\n\n\nY")).toBe("<p>X</p><p>Y</p>");

    // Edge: trailing single newline becomes <br/>
    expect(mdToHtml("Z\n")).toBe("<p>Z<br/></p>");

    // Edge: single paragraph, no newlines
    expect(mdToHtml("Solo")).toBe("<p>Solo</p>");
  });
});
