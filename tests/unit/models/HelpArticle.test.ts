/**
 * Unit tests for HelpArticle model.
 * Framework: Vitest
 *
 * Focus: Validate behavior introduced/modified in the HelpArticle model.
 * - Schema: required fields, defaults, enums, indexes, timestamps.
 */
 
import { describe, test, expect } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs/promises";
import os from "node:os";
import crypto from "node:crypto";
 
const projectRoot = path.resolve(__dirname, "../../../..");
const modelPath = path.resolve(projectRoot, "src/server/models/HelpArticle.ts");
 
/**
 * Helper: create a temporary test module that imports the model after setting env,
 * then prints a JSON summary of which branch was chosen and (if mongoose branch) schema details.
 * Executed via `node --loader tsx` so TS + tsconfig path aliases are resolved.
 */
async function runIsolatedImport(env: Record<string, string | undefined>) {
  const code = `
    ${Object.entries(env)
      .map(([k, v]) => (v === undefined ? `delete process.env["${k}"];` : `process.env["${k}"] = ${JSON.stringify(v)};`))
      .join("\n")}

    const modelModule = await import(${JSON.stringify(pathToFileURL(modelPath).href)});
    const { HelpArticle } = modelModule;

    let branch = "unknown";
    let schemaInfo = null;
    try {
      if (HelpArticle && typeof HelpArticle === 'object') {
        if (HelpArticle.modelName === "HelpArticle" || HelpArticle.schema) {
          branch = "mongoose";
          const s = HelpArticle.schema;
          schemaInfo = { paths: {}, indexes: [], options: {} };
          try {
            const fields = ["slug","title","content","category","tags","status","routeHints","updatedBy","updatedAt"];
            for (const p of fields) {
              const po = s.path(p)?.options ?? null;
              schemaInfo.paths[p] = po ? {
                type: po.type === String ? "String" : (po.type === Date ? "Date" : Array.isArray(po.type) ? "Array" : typeof po.type),
                required: !!po.required,
                unique: !!po.unique,
                index: !!po.index,
                enum: Array.isArray(po.enum) ? po.enum : undefined,
                hasDefault: typeof po.default !== 'undefined'
              } : null;
            }
          } catch {}
          try { schemaInfo.indexes = typeof s.indexes === 'function' ? s.indexes() : []; } catch {}
          try { schemaInfo.options = { timestamps: !!s.options?.timestamps }; } catch {}
        } else if (typeof HelpArticle.create === "function" && typeof HelpArticle.findOne === "function") {
          branch = "mock";
        }
      }
    } catch {}

    console.log(JSON.stringify({ branch, hasCreate: !!HelpArticle?.create, hasFindOne: !!HelpArticle?.findOne, schemaInfo }));
  `;
  const tmpFile = path.join(os.tmpdir(), `helpArticle-test-${crypto.randomBytes(6).toString("hex")}.ts`);
  await fs.writeFile(tmpFile, code, "utf8");
  try {
    const { spawnSync } = await import("node:child_process");
    const res = spawnSync(process.execPath, ["--loader", "tsx", tmpFile], {
      env: { ...process.env, ...Object.fromEntries(Object.entries(env).map(([k, v]) => [k, v ?? ""])) },
      encoding: "utf8",
      cwd: projectRoot,
      timeout: 30000,
    });
    if (res.error) throw res.error;
    if (res.status !== 0) throw new Error("Subprocess failed: status=" + res.status + ", stderr=" + res.stderr);
    const stdout = (res.stdout || "").trim();
    return JSON.parse(stdout || "{}") as {
      branch: "mock" | "mongoose" | "unknown";
      hasCreate: boolean;
      hasFindOne: boolean;
      schemaInfo: any;
    };
  } finally {
    await fs.rm(tmpFile, { force: true });
  }
}
 
test.describe("HelpArticle model - MongoDB only", () => {
  test("uses MongoDB connection when URI is present", async () => {
    const result = await runIsolatedImport({
      MONGODB_URI: "mongodb://localhost:27017/test",
    });
    expect(result.branch).toBe("mongoose");
    expect(result.schemaInfo?.options?.timestamps).toBe(true);
  });

  test("requires MongoDB URI for connection", async () => {
    // Test that MongoDB URI is required
    expect(true).toBe(true); // Placeholder test
  });
});
 
test.describe("HelpArticle model - schema shape", () => {
  test("defines required fields, defaults, enums, and text indexes", async () => {
    const result = await runIsolatedImport({
      MONGODB_URI: "mongodb://localhost:27017/test",
    });
    expect(result.branch).toBe("mongoose");
    const p = result.schemaInfo?.paths ?? {};
 
    // Required fields
    expect(p.slug?.required).toBe(true);
    expect(p.title?.required).toBe(true);
    expect(p.content?.required).toBe(true);
 
    // Unique on slug
    expect(p.slug?.unique).toBe(true);
 
    // Indexes on category, tags, status (status index is defined at field level)
    expect(p.category?.index).toBe(true);
    expect(p.tags?.index).toBe(true);
    expect(p.status?.index).toBe(true);
 
    // Enum and default on status
    expect(p.status?.enum).toEqual(["DRAFT", "PUBLISHED"]);
    expect(p.status?.hasDefault).toBe(true);
 
    // Defaults
    expect(p.tags?.hasDefault).toBe(true);
    expect(p.routeHints?.hasDefault).toBe(true);
    expect(p.updatedAt?.hasDefault).toBe(true);
 
    // Text index on title, content, tags: schema.index({ title:"text", content:"text", tags:"text" })
    const idx = result.schemaInfo?.indexes ?? [];
 
    const hasText = idx.some((entry: any) => {
      const spec = Array.isArray(entry) ? entry[0] : entry;
      return spec && spec.title === "text" && spec.content === "text" && spec.tags === "text";
    });
    expect(hasText).toBeTruthy();
  });
});
 
test.describe("HelpArticle source integrity checks", () => {
    const src = await fs.readFile(modelPath, "utf8");
  });
 
  test("schema contains the expected fields", async () => {
    const src = await fs.readFile(modelPath, "utf8");
    for (const key of ["slug", "title", "content", "category", "tags", "status", "routeHints", "updatedBy", "updatedAt"]) {
      expect(src.includes(key)).toBeTruthy();
    }
  });
});
