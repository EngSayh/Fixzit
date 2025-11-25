#!/usr/bin/env tsx
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import fg from "fast-glob";

type DocInput = {
  slug: string;
  title: string;
  content: string;
  tenantId?: string | null;
  roles?: string[];
  locale?: "en" | "ar";
  tags?: string[];
  source?: string;
  checksum?: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function collectDocs(globs: string[]): Promise<DocInput[]> {
  const files = await fg(globs, {
    ignore: ["**/node_modules/**", "**/.next/**", "**/.git/**"],
    onlyFiles: true,
  });
  const docs: DocInput[] = [];
  for (const file of files) {
    const absolute = path.resolve(file);
    const stat = await fs.stat(absolute);
    if (!stat.isFile()) continue;
    const raw = await fs.readFile(absolute, "utf8");
    const rel = path.relative(process.cwd(), absolute);
    const title = path
      .basename(rel)
      .replace(path.extname(rel), "")
      .replace(/[-_]/g, " ");
    const checksum = crypto.createHash("sha1").update(raw).digest("hex");
    docs.push({
      slug: slugify(rel),
      title: title.charAt(0).toUpperCase() + title.slice(1),
      content: raw,
      tenantId: process.env.COPILOT_TENANT_ID || null,
      roles: process.env.COPILOT_ROLES
        ? process.env.COPILOT_ROLES.split(",")
            .map((role) => role.trim())
            .filter(Boolean)
        : undefined,
      locale: (process.env.COPILOT_LOCALE as "en" | "ar") || "en",
      tags: rel.split(path.sep).slice(0, -1),
      source: rel,
      checksum,
    });
  }
  return docs;
}

async function pushDocs(docs: DocInput[]) {
  if (!docs.length) {
    console.log("No documents found for ingestion.");
    return;
  }
  const endpoint =
    process.env.COPILOT_INDEX_ENDPOINT ||
    "http://localhost:3000/api/copilot/knowledge";
  const secret = process.env.COPILOT_WEBHOOK_SECRET;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "x-webhook-secret": secret } : {}),
    },
    body: JSON.stringify({ docs }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ingestion failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  console.log(
    `Indexed ${json.count ?? docs.length} documents into Copilot knowledge base.`,
  );
}

async function main() {
  const globs = process.argv.slice(2);
  if (globs.length === 0) {
    console.error('Usage: tsx scripts/copilot-index.ts "docs/**/*.md"');
    process.exit(1);
  }
  const docs = await collectDocs(globs);
  await pushDocs(docs);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
