// Test framework: Vitest (auto-detected). If your project uses Jest instead,
// replace the import below with Jest globals or @jest/globals.
import { describe, it, expect } from "vitest";
import { extractSkillsFromText, calculateExperienceFromText, scoreApplication } from "./scoring";


// -----------------------------------------------------------------------------
// Additional comprehensive tests for src/lib/ats/scoring.ts
// Focus: happy paths, edge cases, failure conditions, rounding, clamping, casing
// -----------------------------------------------------------------------------

describe("extractSkillsFromText", () => {
  it("returns empty array for falsy input", () => {
    expect(extractSkillsFromText("")).toEqual([]);
    expect((extractSkillsFromText as any)(undefined)).toEqual([]);
    expect((extractSkillsFromText as any)(null)).toEqual([]);
  });

  it("extracts unique, lowercased tokens and filters common words", () => {
    const text = "React AND Node.js with Python and THE email phone react";
    expect(extractSkillsFromText(text)).toEqual(["react", "node.js", "python"]);
  });

  it("supports + . # - characters within tokens and rejects too-short tokens", () => {
    const text = "C++ C# next-gen Node.js";
    const result = extractSkillsFromText(text);
    expect(result).toContain("c++");
    expect(result).toContain("next-gen");
    expect(result).toContain("node.js");
    expect(result).not.toContain("c#"); // too short to match the pattern
  });

  it("limits the number of results to 20 and preserves first-encountered order", () => {
    const words = Array.from({ length: 25 }, (_, i) => `skill${String(i).padStart(2, "0")}`).join(" ");
    const result = extractSkillsFromText(words);
    expect(result).toHaveLength(20);
    expect(result[0]).toBe("skill00");
    expect(result[19]).toBe("skill19");
    expect(result).not.toContain("skill20");
    expect(result).not.toContain("skill24");
  });

  it('does not match very short tokens like "c", "ai", or "go"', () => {
    const text = "C AI ML Go";
    expect(extractSkillsFromText(text)).toEqual([]);
  });
});

describe("calculateExperienceFromText", () => {
  it("returns 0 for falsy or non-matching input", () => {
    expect(calculateExperienceFromText("")).toBe(0);
    expect((calculateExperienceFromText as any)(undefined)).toBe(0);
    expect(calculateExperienceFromText("no relevant years found")).toBe(0);
    expect(calculateExperienceFromText("3-year experience")).toBe(0); // hyphenated not matched by the regex
  });

  it("matches common valid patterns", () => {
    expect(calculateExperienceFromText("5 years")).toBe(5);
    expect(calculateExperienceFromText("7+ years")).toBe(7);
    expect(calculateExperienceFromText("12yrs experience")).toBe(12);
    expect(calculateExperienceFromText("10 yr")).toBe(10);
    expect(calculateExperienceFromText("9 YRS")).toBe(9);
    expect(calculateExperienceFromText("5+years of experience")).toBe(5);
  });

  it("caps values at 40 for large numbers", () => {
    expect(calculateExperienceFromText("50 years")).toBe(40);
    expect(calculateExperienceFromText("99+ yrs")).toBe(40);
  });

  it("takes the first match when multiple are present", () => {
    expect(calculateExperienceFromText("3 years and 5 years")).toBe(3);
  });

  it('ignores values with three digits like "100 years"', () => {
    expect(calculateExperienceFromText("100 years")).toBe(0);
  });
});

describe("scoreApplication", () => {
  it("returns 100 for perfect match with sufficient experience (default weights)", () => {
    const score = scoreApplication({
      skills: ["react", "node", "docker"],
      requiredSkills: ["react", "node", "docker"],
      experience: 5,
      minExperience: 3,
    });
    expect(score).toBe(100);
  });

  it("computes weighted score for partial skill match and under experience (default weights)", () => {
    // matched = 2/3 ≈ 0.6667, expOk = 4/5 = 0.8
    // score = round((0.6667*0.6 + 0.8*0.4)*100) = round((0.4 + 0.32)*100) = 72
    const score = scoreApplication({
      skills: ["React", "Node.js", "GraphQL"],
      requiredSkills: ["react", "node.js", "docker"],
      experience: 4,
      minExperience: 5,
    });
    expect(score).toBe(72);
  });

  it("when no requiredSkills provided, matched defaults to 1", () => {
    const score = scoreApplication({
      skills: ["something"],
      experience: 0,
    });
    expect(score).toBe(100); // matched=1, expOk=1 with no minExperience, default weights sum to 1
  });

  it("matches skills case-insensitively", () => {
    // matched = 1/2 = 0.5, expOk=1
    // score = round((0.5*0.6 + 1*0.4)*100) = 70
    const score = scoreApplication({
      skills: ["PYTHON"],
      requiredSkills: ["python", "go"],
      experience: 1,
    });
    expect(score).toBe(70);
  });

  it("treats minExperience=0 as non-gating (truthy check behavior)", () => {
    // matched = 1/2 = 0.5, expOk=1 because minExperience is falsy (0)
    // score = 70 with defaults
    const score = scoreApplication({
      skills: ["a"],
      requiredSkills: ["a", "b"],
      experience: 0,
      minExperience: 0,
    });
    expect(score).toBe(70);
  });

  it("weights are clamped individually between 0 and 1", () => {
    // weights.skills -> clamp(2) = 1, weights.experience -> clamp(-0.5) = 0
    // matched=1, expOk=0 -> score = round((1*1 + 0*0)*100) = 100
    const score = scoreApplication(
      {
        skills: ["x"],
        requiredSkills: ["x"],
        experience: 0,
        minExperience: 10,
      },
      { skills: 2, experience: -0.5 }
    );
    expect(score).toBe(100);
  });

  it("score can exceed 100 if weights sum to more than 1 (by design of current implementation)", () => {
    // matched=1, expOk=1, weights 0.9 + 0.9 = 1.8 -> score = 180
    const score = scoreApplication(
      {
        skills: ["a"],
        requiredSkills: ["a"],
        experience: 10,
        minExperience: 5,
      },
      { skills: 0.9, experience: 0.9 }
    );
    expect(score).toBe(180);
  });

  it("does not mutate input arrays", () => {
    const skills = ["React"];
    const required = ["React"];
    const snapshotSkills = [...skills];
    const snapshotRequired = [...required];

    const score = scoreApplication(
      { skills, requiredSkills: required, experience: 5, minExperience: 1 }
    );
    expect(typeof score).toBe("number");
    expect(skills).toEqual(snapshotSkills);
    expect(required).toEqual(snapshotRequired);
  });

  it("rounds halves up to the nearest integer", () => {
    // matched=1/4=0.25, expOk=1, weights=0.5/0.5 -> raw = (0.125 + 0.5)*100 = 62.5 -> 63
    const score = scoreApplication(
      {
        skills: ["a"],
        requiredSkills: ["a", "b", "c", "d"],
        experience: 10,
        minExperience: 1,
      },
      { skills: 0.5, experience: 0.5 }
    );
    expect(score).toBe(63);
  });
});