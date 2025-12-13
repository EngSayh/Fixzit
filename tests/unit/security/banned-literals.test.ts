import fg from "fast-glob";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const bannedTokens = ["EngSayh", "EngSayh@1985", "EngSayh%401985"];
const bannedDocTokens = ["EngSayh@1985", "EngSayh%401985"];

const includeGlobs = [
  "app/**/*.{ts,tsx,js}",
  "services/**/*.{ts,tsx,js}",
  "lib/**/*.{ts,tsx,js}",
  "server/**/*.{ts,tsx,js}",
  "modules/**/*.{ts,tsx,js}",
  "scripts/**/*.{ts,tsx,js}",
  "config/**/*.{ts,tsx,js}",
  "jobs/**/*.{ts,tsx,js}",
  "pages/**/*.{ts,tsx,js}",
  "middleware.ts",
  "auth.ts",
  "auth.config.ts",
];

const ignoreGlobs = [
  "**/node_modules/**",
  "docs/**",
  "_artifacts/**",
  "public/**",
  "qa/**",
  "tests/**",
];

describe("Banned literals", () => {
  it("does not allow hardcoded credential literals in code", async () => {
    const files = await fg(includeGlobs, { ignore: ignoreGlobs, dot: true });
    const hits: string[] = [];

    await Promise.all(
      files.map(async (file) => {
        const content = await readFile(file, "utf8");
        for (const token of bannedTokens) {
          if (content.includes(token)) {
            hits.push(`${file} -> ${token}`);
          }
        }
      }),
    );

    expect(hits).toEqual([]);
  });

  it("does not allow banned credentials in documentation", async () => {
    const docFiles = await fg(["docs/**/*.{md,mdx}"], {
      ignore: ["**/node_modules/**", "_artifacts/**"],
      dot: true,
    });
    const hits: string[] = [];

    await Promise.all(
      docFiles.map(async (file) => {
        const content = await readFile(file, "utf8");
        for (const token of bannedDocTokens) {
          if (content.includes(token)) {
            hits.push(`${file} -> ${token}`);
          }
        }
      }),
    );

    expect(hits).toEqual([]);
  });
});
