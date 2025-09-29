// Testing framework detected: unknown
// Using global test APIs (e.g., Jest). If using Vitest without globals, uncomment the next line:
// import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// NOTE: This suite targets the AtsSettings model behaviors, focusing on shouldAutoReject() and findOrCreateForOrg().
// It uses the mock DB by setting USE_MOCK_DB before importing the module to avoid real database dependencies.

let AtsSettings: any;

const uniqueOrg = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

beforeAll(async () => {
  process.env.USE_MOCK_DB = "true";
  // Import after setting env so the module binds to the mock model
  const mod = await import("./AtsSettings");
  AtsSettings = mod.AtsSettings;
});

afterAll(() => {
  delete process.env.USE_MOCK_DB;
});

describe("AtsSettings.shouldAutoReject - knockout rules", () => {
  it("rejects when experience is below minYears with clear reason", async () => {
    const orgId = uniqueOrg("minYears-below");
    const doc = await AtsSettings.create({ orgId, knockoutRules: { minYears: 5 } });
    const decision = doc.shouldAutoReject({ experience: 3, skills: [] });
    expect(decision.reject).toBe(true);
    expect(decision.reason).toBe("Requires minimum 5 years of experience");
  });

  it("does not reject when experience meets or exceeds minYears", async () => {
    const orgId = uniqueOrg("minYears-meet");
    const doc = await AtsSettings.create({ orgId, knockoutRules: { minYears: 5 } });
    expect(doc.shouldAutoReject({ experience: 5, skills: [] }).reject).toBe(false);
    expect(doc.shouldAutoReject({ experience: 7, skills: [] }).reject).toBe(false);
  });

  it("rejects when experience missing and autoRejectMissingExperience is enabled", async () => {
    const orgId = uniqueOrg("missing-exp");
    const doc = await AtsSettings.create({
      orgId,
      knockoutRules: { autoRejectMissingExperience: true }
    });
    const decision = doc.shouldAutoReject({});
    expect(decision.reject).toBe(true);
    expect(decision.reason).toBe("Experience information missing");
  });

  it("rejects when required skills are missing (case-insensitive) and rule is enabled", async () => {
    const orgId = uniqueOrg("missing-skills");
    const doc = await AtsSettings.create({
      orgId,
      knockoutRules: { requiredSkills: ["React", "Node.js"], autoRejectMissingSkills: true }
    });
    // Provide only one of the required skills (case-insensitive match should pass for 'React')
    const decision = doc.shouldAutoReject({ skills: ["react"] });
    expect(decision.reject).toBe(true);
    expect(decision.reason).toBe("Missing required skills: node.js");
  });

  it("does not reject when all required skills are present ignoring case", async () => {
    const orgId = uniqueOrg("skills-present");
    const doc = await AtsSettings.create({
      orgId,
      knockoutRules: { requiredSkills: ["ReAcT", "NoDe.Js"], autoRejectMissingSkills: true }
    });
    const decision = doc.shouldAutoReject({ skills: ["react", "NODE.JS", "extra-skill"] });
    expect(decision.reject).toBe(false);
  });

  it("does not reject for missing skills if autoRejectMissingSkills is disabled", async () => {
    const orgId = uniqueOrg("skills-disabled");
    const doc = await AtsSettings.create({
      orgId,
      knockoutRules: { requiredSkills: ["go", "rust"], autoRejectMissingSkills: false }
    });
    const decision = doc.shouldAutoReject({ skills: [] });
    expect(decision.reject).toBe(false);
  });

  it("handles undefined knockoutRules gracefully (treats as empty rules)", async () => {
    const orgId = uniqueOrg("no-rules");
    const doc = await AtsSettings.create({ orgId, // explicitly unset rules to verify nullish handling
      knockoutRules: undefined
    });
    const decision = doc.shouldAutoReject({});
    expect(decision.reject).toBe(false);
  });
});

describe("AtsSettings.findOrCreateForOrg - creation and lookup semantics", () => {
  it("returns existing document for the same orgId", async () => {
    const orgId = uniqueOrg("find-existing");
    const created = await AtsSettings.create({ orgId });
    const found = await AtsSettings.findOrCreateForOrg(orgId);
    expect(found.orgId).toBe(orgId);
    // shouldAutoReject should be attached on the returned doc
    expect(typeof found.shouldAutoReject).toBe("function");
    // created defaults should be available
    expect(Array.isArray(found.alerts)).toBe(true);
  });

  it("creates a document when none exists for the orgId", async () => {
    const orgId = uniqueOrg("find-create");
    const doc = await AtsSettings.findOrCreateForOrg(orgId);
    expect(doc.orgId).toBe(orgId);
    expect(typeof doc.shouldAutoReject).toBe("function");
  });

  it("uses NEXT_PUBLIC_ORG_ID when orgId is falsy", async () => {
    const prev = process.env.NEXT_PUBLIC_ORG_ID;
    const envOrg = uniqueOrg("env-org");
    process.env.NEXT_PUBLIC_ORG_ID = envOrg;

    const doc = await AtsSettings.findOrCreateForOrg("");
    expect(doc.orgId).toBe(envOrg);

    if (prev === undefined) {
      delete process.env.NEXT_PUBLIC_ORG_ID;
    } else {
      process.env.NEXT_PUBLIC_ORG_ID = prev;
    }
  });

  it('falls back to default orgId "fixzit-platform" when no orgId and no env is set', async () => {
    const prev = process.env.NEXT_PUBLIC_ORG_ID;
    delete process.env.NEXT_PUBLIC_ORG_ID;

    const doc = await AtsSettings.findOrCreateForOrg("");
    expect(doc.orgId).toBe("fixzit-platform");

    if (prev !== undefined) process.env.NEXT_PUBLIC_ORG_ID = prev;
  });

  it("applies default scoringWeights and knockoutRules on creation", async () => {
    const orgId = uniqueOrg("defaults");
    const doc = await AtsSettings.create({ orgId });
    expect(doc.scoringWeights).toMatchObject({
      skills: 0.6,
      experience: 0.3,
      culture: 0.05,
      education: 0.05
    });
    expect(doc.knockoutRules).toMatchObject({
      minYears: 0,
      requiredSkills: [],
      autoRejectMissingExperience: false,
      autoRejectMissingSkills: true
    });
  });
});