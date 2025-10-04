/* 
  Tests for CmsPage model.
  Assumed framework: Jest (TypeScript). 
  If repository uses a different test runner (e.g., Vitest/Mocha), adjust imports and globals accordingly.
*/
import { Schema, model, models, connection, connect, disconnect } from "mongoose";

// The source under test (mirroring provided snippet)

// However, primary focus is on schema behavior: required fields, defaults, enums, indexes.

describe("CmsPage model schema", () => {
  const importCmsPageModule = async () => {
    jest.resetModules();
    return await import("@/models/CmsPage");
  };

    beforeAll(() => {
      jest.resetModules();
      // We avoid introducing new deps; we only ensure constructor signature compatibility.
          collection: string;
          static data: any[] = [];
          constructor(collection: string) {
            this.collection = collection;
          }
          static async create(doc: any) {
            const copy = { ...doc, _id: copyObjectIdLike(), createdAt: new Date(), updatedAt: new Date() };
            this.data.push(copy);
            return copy;
          }
          static async findOne(query: any) {
            return this.data.find((d) => matchesQuery(d, query)) || null;
          }
          static async deleteMany() {
            this.data = [];
          }
        }
        function copyObjectIdLike() {
          // Simple 24 hex chars string
          return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
        }
        function matchesQuery(doc: any, q: any) {
          return Object.entries(q).every(([k, v]) => doc[k] === v);
        }
      }, { virtual: true });
    });

    afterAll(() => {
      jest.dontMock("@/lib/mongo");
    });

      const mod: any = await importCmsPageModule();
      expect(mod).toHaveProperty("CmsPage");
      // We can't directly assert private fields but can check that static methods exist (create/findOne) per our mock shape
      expect(typeof mod.CmsPage.create).toBe("function");
      expect(typeof mod.CmsPage.findOne).toBe("function");
    });

      const mod: any = await importCmsPageModule();
      // Clear
      await mod.CmsPage.deleteMany?.();
      const doc = await mod.CmsPage.create({
        slug: "welcome",
        title: "Welcome",
        content: "# Hello",
        status: "PUBLISHED",
      });
      expect(doc).toMatchObject({
        slug: "welcome",
        title: "Welcome",
        content: "# Hello",
        status: "PUBLISHED",
      });
      const found = await mod.CmsPage.findOne({ slug: "welcome" });
      expect(found).toBeTruthy();
      expect(found.slug).toBe("welcome");
    });
  });

    // Try to run schema validation logic without hitting a real database.
    // We'll avoid saving to Mongo; instead, use new Model(doc).validate() to test schema rules.
    let CmsPage: any;

    beforeAll(async () => {
      jest.resetModules();
      // We need the actual module under test. If it references models.CmsPage || model(...),
      // new-ing the model should be fine without a DB connection for validation purposes.
      const mod: any = await importCmsPageModule();
      CmsPage = mod.CmsPage;

      // Optionally connect to an in-memory or actual Mongo if required by implementation.
      // We try to validate without connection. If a connection error emerges, we fallback to a local connection string if provided by env.
      try {
        // Probe: try simple validate to see if connection is strictly required.
        const probe = new CmsPage({ slug: "probe", title: "t", content: "c" });
        await probe.validate(); // should succeed without DB since it's purely schema validation
      } catch (e) {
        // As a fallback, attempt a connection if necessary (only if Mongoose demands it)
        const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/test";
        try {
          await connect(uri, { dbName: "test" } as any);
        } catch {
          // If failing to connect, keep tests that only use validate()
        }
      }
    });

    afterAll(async () => {
      try {
        if (connection?.readyState) {
          await disconnect();
        }
      } catch { /* noop */ }
      jest.dontMock("@/lib/mongo");
    });

    test("requires slug, title, and content", async () => {
      const m = new CmsPage({});
      await expect(m.validate()).rejects.toThrow();
      const missingSlug = new CmsPage({ title: "T", content: "C" });
      await expect(missingSlug.validate()).rejects.toThrow(/slug/i);

      const missingTitle = new CmsPage({ slug: "a", content: "C" });
      await expect(missingTitle.validate()).rejects.toThrow(/title/i);

      const missingContent = new CmsPage({ slug: "a", title: "T" });
      await expect(missingContent.validate()).rejects.toThrow(/content/i);

      const valid = new CmsPage({ slug: "ok", title: "T", content: "C" });
      await expect(valid.validate()).resolves.toBeUndefined();
    });

    test("status defaults to PUBLISHED and enforces enum", async () => {
      const m = new CmsPage({ slug: "s1", title: "T", content: "C" });
      await m.validate();
      expect(m.status).toBe("PUBLISHED");

      const invalid = new CmsPage({ slug: "s2", title: "T", content: "C", status: "INVALID" });
      await expect(invalid.validate()).rejects.toThrow(/is not a valid enum value|enum/i);

      const draft = new CmsPage({ slug: "s3", title: "T", content: "C", status: "DRAFT" });
      await expect(draft.validate()).resolves.toBeUndefined();
      expect(draft.status).toBe("DRAFT");
    });

    test("tenantId is optional and can be omitted for global pages", async () => {
      const globalPage = new CmsPage({ slug: "global", title: "T", content: "C" });
      await expect(globalPage.validate()).resolves.toBeUndefined();
      expect(globalPage.tenantId).toBeUndefined();

      const tenantPage = new CmsPage({ slug: "tenant", title: "T", content: "C", tenantId: "tenant-123" });
      await expect(tenantPage.validate()).resolves.toBeUndefined();
      expect(tenantPage.tenantId).toBe("tenant-123");
    });

    test("updatedAt has a default Date and updatedBy is optional", async () => {
      const m = new CmsPage({ slug: "upd", title: "T", content: "C" });
      await m.validate();
      expect(m.updatedAt instanceof Date).toBe(true);
      expect(m.updatedBy).toBeUndefined();

      const withUpdater = new CmsPage({ slug: "upd2", title: "T", content: "C", updatedBy: "user-1" });
      await expect(withUpdater.validate()).resolves.toBeUndefined();
      expect(withUpdater.updatedBy).toBe("user-1");
    });

    test("timestamps option adds createdAt and updatedAt fields", async () => {
      const m = new CmsPage({ slug: "ts", title: "T", content: "C" });
      await m.validate();
      // When not saved, Mongoose with timestamps still sets paths at doc init/validate?
      // We only assert that paths exist in schema and are of type Date when present on instantiated doc.
      expect("createdAt" in m).toBe(true);
      expect("updatedAt" in m).toBe(true);
    });

    test("slug has unique and index constraints at schema level (structural check)", () => {
      // Structural assertions on schema paths
      const schema: Schema = (CmsPage as any).schema;
      const slugPath = schema.path("slug") as any;
      expect(slugPath?.options?.unique).toBe(true);
      expect(slugPath?.options?.index).toBe(true);
      expect(slugPath?.options?.required).toBe(true);

      const statusPath = schema.path("status") as any;
      expect(statusPath?.options?.enum).toEqual(["DRAFT", "PUBLISHED"]);
      expect(statusPath?.options?.default).toBe("PUBLISHED");
      expect(statusPath?.options?.index).toBe(true);
    });
  });
});

