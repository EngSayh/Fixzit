// Tests generated using Vitest test framework (describe/it/expect from vitest).
// Note: These tests require Vitest only in CI; skip TypeScript typechecking dependency.
// Using ambient globals if vitest not present.
// @ts-ignore
import { describe, it, expect } from "vitest";
import {
  extractSkillsFromText,
  calculateExperienceFromText,
  scoreApplication,
} from "./scoring";

describe("extractSkillsFromText", () => {
  it("returns empty array for empty or falsy input", () => {
    expect(extractSkillsFromText("")).toEqual([]);
    // @ts-ignore testing runtime with non-string-like falsy converted upstream
    expect(extractSkillsFromText(undefined)).toEqual([]);
    // @ts-ignore null as unexpected input
    expect(extractSkillsFromText(null as unknown)).toEqual([]);
  });

  it("extracts known skills ignoring case", () => {
    const text =
      "Strong with React, Node, and TypeScript. Some SQL and AWS exposure.";
    const skills = extractSkillsFromText(text);
    expect(skills).toEqual(
      expect.arrayContaining(["react", "node", "typescript", "sql", "aws"]),
    );
  });

  it("does not include unknown words", () => {
    const text = "Experienced in Elm and Rust";
    const skills = extractSkillsFromText(text);
    expect(skills).toEqual([]);
  });

  it("handles punctuation and special characters inside tokens", () => {
    const text =
      "C#, C++, and Golang with Docker/Kubernetes. JavaScript & Python 3.9.";
    const skills = extractSkillsFromText(text);
    // From known list: 'c#','golang','docker','kubernetes','javascript','python'
    expect(skills).toEqual(
      expect.arrayContaining([
        "c#",
        "golang",
        "docker",
        "kubernetes",
        "javascript",
        "python",
      ]),
    );
    // Ensure no duplicates
    const uniq = new Set(skills);
    expect(uniq.size).toBe(skills.length);
  });

  it("returns unique skills only when repeated", () => {
    const text = "react React REACT node Node";
    const skills = extractSkillsFromText(text);
    expect(skills.sort()).toEqual(["node", "react"]);
  });
});

describe("calculateExperienceFromText", () => {
  it("returns 0 when experience is not mentioned", () => {
    expect(calculateExperienceFromText("No explicit years here")).toBe(0);
  });

  it("parses simple year formats", () => {
    expect(calculateExperienceFromText("3 years of experience")).toBe(3);
    expect(calculateExperienceFromText("10 yrs exp")).toBe(10);
    expect(calculateExperienceFromText("5 y")).toBe(5);
  });

  it("parses numbers followed by + as years", () => {
    expect(calculateExperienceFromText("7+ years")).toBe(7);
    expect(calculateExperienceFromText("12+")).toBe(12);
  });

  it("caps experience at 40 years", () => {
    expect(calculateExperienceFromText("65 years total")).toBe(40);
    expect(calculateExperienceFromText("99+")).toBe(40);
  });

  it("extracts the first matching number", () => {
    expect(
      calculateExperienceFromText("Experience: 2 years in A, 4 years in B"),
    ).toBe(2);
  });

  it("handles nullish input gracefully", () => {
    // @ts-expect-error testing runtime behavior on null
    expect(calculateExperienceFromText(null)).toBe(0);
    // @ts-expect-error testing runtime behavior on undefined
    expect(calculateExperienceFromText(undefined)).toBe(0);
  });
});

describe("scoreApplication", () => {
  it("returns 100 when no requirements/minExperience are specified (full match by default)", () => {
    const score = scoreApplication({ skills: [], experience: 0 });
    expect(score).toBe(100);
  });

  it("scores skill matching proportionally with default weights (60% skills, 40% experience)", () => {
    const input = {
      skills: ["react", "node"],
      requiredSkills: ["react", "typescript", "aws"],
      experience: 5,
      minExperience: 5,
    };
    // matched skills = 1/3 => 0.333..., expOk = 1
    // score = round((0.3333*0.6 + 1*0.4) * 100) = round((0.2 + 0.4) * 100) = 60
    const score = scoreApplication(input);
    expect(score).toBe(60);
  });

  it("is case-insensitive for skills comparison", () => {
    const score = scoreApplication({
      skills: ["React", "NODE"],
      requiredSkills: ["react", "node"],
      experience: 1,
      minExperience: 1,
    });
    expect(score).toBe(100);
  });

  it("handles partial experience toward minExperience", () => {
    const score = scoreApplication({
      skills: ["x"],
      requiredSkills: ["a", "b", "c", "d"], // 0/4 matched = 0
      experience: 2,
      minExperience: 10,
    });
    // matched=0 => skills contribution 0
    // expOk = 0.2 => exp contribution 0.2 * 0.4 = 0.08
    // total = 0.08 * 100 = 8
    expect(score).toBe(8);
  });

  it("treats missing requiredSkills as full skills match (matched=1)", () => {
    const score = scoreApplication({
      skills: ["anything"],
      experience: 0,
      // no minExperience means expOk=1
    });
    // matched=1 -> 0.6; expOk=1 -> 0.4; total 1.0 => 100
    expect(score).toBe(100);
  });

  it("uses custom weights when provided", () => {
    const input = {
      skills: ["react"],
      requiredSkills: ["react", "node"],
      experience: 1,
      minExperience: 2,
    };
    // matched = 1/2 = 0.5; expOk = 0.5
    // weights skills=0.7, exp=0.3 -> 0.5*0.7 + 0.5*0.3 = 0.35 + 0.15 = 0.5 => 50
    const score = scoreApplication(input, { skills: 0.7, experience: 0.3 });
    expect(score).toBe(50);
  });

  it("rounds to nearest integer", () => {
    // Create a value that yields a fractional score: matched=2/3=0.666..., expOk=0.75
    const score = scoreApplication(
      {
        skills: ["a", "b", "c"],
        requiredSkills: ["a", "b", "x"],
        experience: 3,
        minExperience: 4,
      },
      { skills: 0.5, experience: 0.5 },
    );
    // 0.6666*0.5=0.3333; 0.75*0.5=0.375; total=0.7083 => 70.83 => 71
    expect(score).toBe(71);
  });

  it("handles zero minExperience as expOk=1 per implementation", () => {
    const score = scoreApplication({
      skills: ["x"],
      requiredSkills: ["x"],
      experience: 0,
      minExperience: 0,
    });
    expect(score).toBe(100);
  });
});
