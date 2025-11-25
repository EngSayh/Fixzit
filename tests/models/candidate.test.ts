import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import mongoose from "mongoose";

let Candidate: typeof import("@/server/models/Candidate").Candidate;

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

beforeAll(async () => {
  // Use real mongoose model (disable jsdom mongoose mock)
  vi.unmock("mongoose");
  const mod = await import("@/server/models/Candidate");
  Candidate = mod.Candidate;
});

describe("Candidate model behaviors", () => {
  it("lowercases email and applies defaults during validation", async () => {
    const candidate = new Candidate({
      orgId: new mongoose.Types.ObjectId(),
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ADA@Example.com",
      createdBy: new mongoose.Types.ObjectId(),
    });

    await candidate.validate();

    expect(candidate.emailLower).toBe("ada@example.com");
    expect(candidate.skills).toEqual([]);
    expect(candidate.experience).toBe(0);
    expect(candidate.consents).toMatchObject({
      privacy: true,
      contact: true,
      dataRetention: true,
    });
  });

  it("findByEmail delegates to findOne with lowercase email and tenant scope", async () => {
    const fakeDoc = {
      email: "ada@example.com",
      emailLower: "ada@example.com",
    } as any;
    const spy = vi.spyOn(Candidate, "findOne").mockResolvedValue(fakeDoc);

    const result = await Candidate.findByEmail("tenant-123", "Ada@Example.com");

    expect(spy).toHaveBeenCalledWith({
      orgId: "tenant-123",
      emailLower: "ada@example.com",
    });
    expect(result).toBe(fakeDoc);
  });

  it("returns null when findOne yields no result", async () => {
    const spy = vi.spyOn(Candidate, "findOne").mockResolvedValue(null);

    const result = await Candidate.findByEmail(
      "tenant-123",
      "missing@example.com",
    );

    expect(spy).toHaveBeenCalledWith({
      orgId: "tenant-123",
      emailLower: "missing@example.com",
    });
    expect(result).toBeNull();
  });
});
