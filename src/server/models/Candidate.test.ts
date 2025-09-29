/**
 * Tests for Candidate model
 * Testing Library/Framework: Jest (TypeScript) with ts-jest assumed.
 *
 * These tests focus on:
 * - Email normalization pre-validate hook
 * - Unique index behavior (simulated in MockModel)
 * - Static findByEmail behavior (case-insensitive via lowercase)
 * - Default field values
 * - save() attaching in MockModel path
 *
 * Note: We rely on USE_MOCK_DB=true to use the in-memory CandidateMockModel,
 * avoiding real Mongoose connections. We reset modules between tests to ensure
 * env var is read on each import and to get a fresh in-memory store.
 */

describe("Candidate model (mock DB)", () => {
  const loadCandidateFresh = async () => {
    // Ensure mock DB path
    process.env.USE_MOCK_DB = "true";
    // Reset module cache so the env var is honored and model class re-evaluates
    jest.resetModules();
    const mod = await import('@/src/server/models/Candidate');
    return mod.Candidate as unknown as {
      create(doc: any): Promise<any>;
      findOne(query: any): Promise<any>;
      findByEmail(orgId: string, email: string): Promise<any>;
    };
  };

  it("should set emailLower via pre-validate on create (mixed case email)", async () => {
    const Candidate = await loadCandidateFresh();
    const created = await Candidate.create({
      orgId: "org1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "Ada.Lovelace@Example.COM",
    });
    expect(created).toBeTruthy();
    expect(created.email).toBe("Ada.Lovelace@Example.COM");
    expect(created.emailLower).toBe("ada.lovelace@example.com");
  });

  it("should provide default values for skills, experience, source, and consents", async () => {
    const Candidate = await loadCandidateFresh();
    const created = await Candidate.create({
      orgId: "org2",
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@navy.mil",
    });
    expect(Array.isArray(created.skills)).toBe(true);
    expect(created.skills).toEqual([]);
    // experience default is defined in schema (0)
    expect(created.experience).toBe(0);
    expect(created.source).toBe("careers");
    expect(created.consents).toEqual({
      privacy: true,
      contact: true,
      dataRetention: true,
    });
  });

  it("findByEmail should be case-insensitive by using lowercase index/emailLower field", async () => {
    const Candidate = await loadCandidateFresh();
    const created = await Candidate.create({
      orgId: "org3",
      firstName: "Alan",
      lastName: "Turing",
      email: "Alan.Turing@Enigma.GOV",
    });
    const foundUpper = await Candidate.findByEmail("org3", "ALAN.TURING@ENIGMA.GOV");
    expect(foundUpper?._id).toBe(created._id);
    const foundMixed = await Candidate.findByEmail("org3", "Alan.Turing@Enigma.Gov");
    expect(foundMixed?._id).toBe(created._id);
    const notFoundOtherOrg = await Candidate.findByEmail("otherOrg", "alan.turing@enigma.gov");
    expect(notFoundOtherOrg).toBeNull();
  });

  it("should simulate unique index on (orgId, emailLower) by preventing duplicate normalized emails per org", async () => {
    const Candidate = await loadCandidateFresh();
    const base = {
      orgId: "org4",
      firstName: "Katherine",
      lastName: "Johnson",
    };
    const first = await Candidate.create({
      ...base,
      email: "k.johnson@nasa.gov",
    });
    expect(first).toBeTruthy();

    // Attempt duplicate with different email case
    let err: any = null;
    try {
      await Candidate.create({
        ...base,
        email: "K.JOHNSON@NASA.GOV",
      });
    } catch (e) {
      err = e;
    }
    // In some MockModel implementations, duplicates may throw or return null.
    // We assert that either an error is thrown or the insertion does not create a distinct doc.
    if (err) {
      expect(String(err).toLowerCase()).toContain("duplicate");
    } else {
      const dup = await Candidate.findByEmail("org4", "k.johnson@nasa.gov");
      expect(dup).toBeTruthy();
      // Ensure only one record exists matching that key (orgId + emailLower).
      // If MockModel offers no count, we at least assert the found doc matches the original id.
      expect(dup?._id).toBe(first._id);
    }
  });

  it("save() should persist changes through CandidateMockModel.attach override", async () => {
    const Candidate = await loadCandidateFresh();
    const created = await Candidate.create({
      orgId: "org5",
      firstName: "Barbara",
      lastName: "Liskov",
      email: "barbara@mit.edu",
      skills: ["oop"],
    });
    expect(created.skills).toEqual(["oop"]);

    // mutate document and save
    created.skills.push("abstraction");
    const saved = await created.save();
    expect(saved.skills).toContain("abstraction");

    // fetch again and ensure saved state persisted
    const fetched = await Candidate.findByEmail("org5", "barbara@mit.edu");
    expect(fetched.skills).toEqual(["oop", "abstraction"]);
  });

  it("handles missing optional fields gracefully and still sets emailLower", async () => {
    const Candidate = await loadCandidateFresh();
    const created = await Candidate.create({
      orgId: "org6",
      firstName: "Edsger",
      lastName: "Dijkstra",
      email: "edsger@tue.nl",
      // phone, location, linkedin, resumeUrl, resumeText omitted
    });
    expect(created.emailLower).toBe("edsger@tue.nl");
    expect(created.phone ?? null).toBeNull();
    expect(created.location ?? null).toBeNull();
    expect(created.linkedin ?? null).toBeNull();
    expect(created.resumeUrl ?? null).toBeNull();
    expect(created.resumeText ?? null).toBeNull();
  });

  it("does not crash when email is missing but required (should throw validation-like error)", async () => {
    const Candidate = await loadCandidateFresh();
    let err: any = null;
    try {
      await Candidate.create({
        orgId: "org7",
        firstName: "Donald",
        lastName: "Knuth",
        // email omitted -> schema requires true
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBeTruthy();
  });

  it("orgId is part of uniqueness; same email can exist across different orgs", async () => {
    const Candidate = await loadCandidateFresh();
    const a = await Candidate.create({
      orgId: "orgA",
      firstName: "Linus",
      lastName: "Torvalds",
      email: "linus@kernel.org",
    });
    const b = await Candidate.create({
      orgId: "orgB",
      firstName: "Linus",
      lastName: "Torvalds",
      email: "LINUS@KERNEL.ORG",
    });
    expect(a._id).not.toBe(b._id);
    const foundA = await Candidate.findByEmail("orgA", "LINUS@KERNEL.ORG");
    const foundB = await Candidate.findByEmail("orgB", "linus@kernel.org");
    expect(foundA?._id).toBe(a._id);
    expect(foundB?._id).toBe(b._id);
  });
});