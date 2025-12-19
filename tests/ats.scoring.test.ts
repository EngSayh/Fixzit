// Import actual implementation from lib/ats/scoring (TypeScript/ESM)
import {
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});

  extractSkillsFromText,
  calculateExperienceFromText,
  scoreApplication,
} from "@/lib/ats/scoring";

describe("extractSkillsFromText", () => {
  it("returns empty array for empty or falsy input", () => {
    expect(extractSkillsFromText("")).toEqual([]);
    // @ts-expect-error - Testing runtime behavior with invalid types
    expect(extractSkillsFromText(undefined)).toEqual([]);
    // @ts-expect-error - Testing runtime behavior with invalid types
    expect(extractSkillsFromText(null)).toEqual([]);
  });

  it("extracts lowercase unique tokens and removes common stopwords", () => {
    const text = "JavaScript and TypeScript with Node.js and React";
    const skills = extractSkillsFromText(text);
    expect(skills).toContain("javascript");
    expect(skills).toContain("typescript");
    expect(skills).toContain("node.js");
    expect(skills).toContain("react");
    expect(skills).not.toContain("and"); // stopword
    expect(skills).not.toContain("with"); // stopword
    // uniqueness
    const dupes = extractSkillsFromText("React react REACT");
    expect(dupes).toEqual(["react"]);
  });

  it("tokenizes alphanumeric and allowed symbols (+ . # -)", () => {
    const text = "c++ c# next.js aws-s3 .net core";
    const out = extractSkillsFromText(text);
    expect(out).toEqual(
      expect.arrayContaining(["c++", "c#", "next.js", "aws-s3", "net", "core"]),
    );
  });

  it("limits to 20 items maximum", () => {
    const many = Array.from({ length: 50 }, (_, i) => `skill${i}`).join(" ");
    const out = extractSkillsFromText(many);
    expect(out.length).toBeLessThanOrEqual(20);
  });

  it("filters typical non-skill words like email and phone", () => {
    const text = "Contact via email or phone for this role";
    const out = extractSkillsFromText(text);
    expect(out).toEqual([]); // all are common words
  });
});

describe("calculateExperienceFromText", () => {
  it("returns 0 for empty or non-matching text", () => {
    expect(calculateExperienceFromText("")).toBe(0);
    expect(calculateExperienceFromText("experience required")).toBe(0);
  });

  it('extracts years from patterns like "3 years", "5 yrs", "10 yr"', () => {
    expect(calculateExperienceFromText("3 years experience")).toBe(3);
    expect(calculateExperienceFromText("minimum 5 yrs")).toBe(5);
    expect(calculateExperienceFromText("10 yr required")).toBe(10);
  });

  it('handles plus sign formats like "7+ years"', () => {
    expect(calculateExperienceFromText("7+ years in the field")).toBe(7);
  });

  it("caps experience at 40", () => {
    expect(calculateExperienceFromText("45 years overall")).toBe(40);
    expect(calculateExperienceFromText("40 years overall")).toBe(40);
  });

  it("is case-insensitive and ignores extra spaces", () => {
    expect(calculateExperienceFromText("  12   Years ")).toBe(12);
    expect(calculateExperienceFromText("8 YRS")).toBe(8);
  });

  it("returns the first matched numeric years when multiple are present", () => {
    const txt = "2 years with X, 6 years with Y";
    expect(calculateExperienceFromText(txt)).toBe(2);
  });
});

describe("scoreApplication", () => {
  it("scores 100 when no requirements and any experience (defaults)", () => {
    const score = scoreApplication({ skills: [], experience: 0 });
    expect(score).toBe(100);
  });

  it("handles matching required skills with default weights", () => {
    const score = scoreApplication({
      skills: ["React", "Node", "GraphQL"],
      requiredSkills: ["react", "graphql"],
      experience: 3,
      minExperience: 2,
    });
    // matched = 2/2 = 1, expOk = min(1, 3/2) = 1, score = (1*0.6 + 1*0.4)*100 = 100
    expect(score).toBe(100);
  });

  it("handles partial skill match with sufficient experience", () => {
    const score = scoreApplication({
      skills: ["react"],
      requiredSkills: ["react", "node"],
      experience: 5,
      minExperience: 5,
    });
    // matched = 1/2=0.5, expOk=1, score = (0.5*0.6 + 1*0.4)*100 = (0.3 + 0.4)*100 = 70
    expect(score).toBe(70);
  });

  it("handles no skill match but full experience", () => {
    const score = scoreApplication({
      skills: ["python"],
      requiredSkills: ["react", "node"],
      experience: 10,
      minExperience: 10,
    });
    // matched=0, expOk=1 => 40
    expect(score).toBe(40);
  });

  it("handles full skill match but insufficient experience", () => {
    const score = scoreApplication({
      skills: ["React", "Node"],
      requiredSkills: ["react", "node"],
      experience: 1,
      minExperience: 4,
    });
    // matched=1, expOk=0.25 => (1*0.6 + 0.25*0.4) = 0.6 + 0.1 = 0.7 => 70
    expect(score).toBe(70);
  });

  it("respects custom weights within [0,1] bounds", () => {
    const score = scoreApplication(
      {
        skills: ["react"],
        requiredSkills: ["react", "node"],
        experience: 1,
        minExperience: 10,
      },
      { skills: 0.2, experience: 0.8 },
    );
    // matched=0.5, expOk=0.1 => (0.5*0.2 + 0.1*0.8) = 0.1 + 0.08 = 0.18 => 18
    expect(score).toBe(18);
  });

  it("clamps weights outside [0,1]", () => {
    const score = scoreApplication(
      {
        skills: ["react"],
        requiredSkills: ["react", "node"],
        experience: 2,
        minExperience: 4,
      },
      { skills: 2, experience: -1 }, // should clamp to 1 and 0
    );
    // wSkills=1, wExp=0 => score uses only matched=0.5 => 50
    expect(score).toBe(50);
  });

  it("treats missing requiredSkills as fully matched", () => {
    const score = scoreApplication({
      skills: [],
      experience: 0,
      minExperience: 10,
    });
    // matched defaults to 1 when req list is empty; expOk=0 => (1*0.6 + 0*0.4) * 100 = 60
    expect(score).toBe(60);
  });

  it("is case-insensitive for skill matching", () => {
    const score = scoreApplication({
      skills: ["ReAcT", "Node"],
      requiredSkills: ["react", "NODE"],
      experience: 0,
      minExperience: 10,
    });
    // matched=1 (2/2), expOk=0 => 60
    expect(score).toBe(60);
  });

  it("handles empty skills array gracefully", () => {
    const score = scoreApplication({
      skills: [],
      requiredSkills: ["react"],
      experience: 10,
      minExperience: 20,
    });
    // matched=0, expOk=0.5 => (0*0.6 + 0.5*0.4)*100 = 20
    expect(score).toBe(20);
  });
});
