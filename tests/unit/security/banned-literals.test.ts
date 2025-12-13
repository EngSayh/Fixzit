import fg from "fast-glob";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const bannedTokens = ["EngSayh@1985", "EngSayh"];

const includeGlobs = [
  "app/**/*.{ts,tsx,js}",
  "components/**/*.{ts,tsx,js}",
  "services/**/*.{ts,tsx,js}",
  "lib/**/*.{ts,tsx,js}",
  "server/**/*.{ts,tsx,js}",
  "modules/**/*.{ts,tsx,js}",
  "pages/**/*.{ts,tsx,js}",
  "scripts/**/*.{ts,tsx,js}",
  "jobs/**/*.{ts,tsx,js}",
  "config/**/*.{ts,tsx,js}",
  "domain/**/*.{ts,tsx,js}",
  "middleware.ts",
  "auth.ts",
  "auth.config.ts",
];

const ignoreGlobs = [
  "**/node_modules/**",
  "**/.next/**",
  "docs/**",
  "qa/**",
  "tests/**",
  "public/**",
  "_artifacts/**",
];

describe("Banned credential literals", () => {
  it("does not contain banned literals in code", async () => {
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
});
