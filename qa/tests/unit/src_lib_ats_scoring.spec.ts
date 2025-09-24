/**
 * Tests for src/lib/ats/scoring.ts
 *
 * Framework: Jest/Vitest (BDD style: describe/it/expect).
 * - If using Jest: ensure ts-jest or Babel TS is configured.
 * - If using Vitest: should work as-is.
 */

import { describe, it, expect } from 'vitest'; // Vitest poly import; if using Jest, this can be removed
// Try the most likely import path; adjust if needed per project structure.
let scoringMod: any = {};
let extractSkillsFromText: (text: string) => string[];
let calculateExperienceFromText: (text: string) => number;
let scoreApplication: (input: { skills: string[]; requiredSkills?: string[]; experience: number; minExperience?: number }, weights?: { skills?: number; experience?: number }) => number;

try {
  // Common path
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  scoringMod = require('../../../src/lib/ats/scoring');
} catch {
  try {
    // Alternate path where source may be at src/ats/scoring.ts
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    scoringMod = require('../../../src/ats/scoring');
  } catch {
    try {
      // If tests run from compiled dist
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      scoringMod = require('../../../dist/lib/ats/scoring');
    } catch {
      // Last resort: relative alias maybe index export
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        scoringMod = require('../../../src/lib/ats');
      } catch {
        // Leave empty; specific tests will fail with clear message
      }
    }
  }
}

extractSkillsFromText = scoringMod.extractSkillsFromText;
calculateExperienceFromText = scoringMod.calculateExperienceFromText;
scoreApplication = scoringMod.scoreApplication;

const ensureExports = () => {
  expect(typeof extractSkillsFromText).toBe('function');
  expect(typeof calculateExperienceFromText).toBe('function');
  expect(typeof scoreApplication).toBe('function');
};

describe('src/lib/ats/scoring', () => {
  it('should export expected functions', () => {
    ensureExports();
  });

  describe('extractSkillsFromText', () => {
    it('returns empty array for empty or falsy input', () => {
      ensureExports();
      expect(extractSkillsFromText('')).toEqual([]);
      // @ts-expect-error testing runtime fallback behavior with undefined
      expect(extractSkillsFromText(undefined)).toEqual([]);
      // @ts-expect-error testing runtime fallback behavior with null
      expect(extractSkillsFromText(null)).toEqual([]);
    });

    it('detects known skills case-insensitively and normalizes to lowercase', () => {
      ensureExports();
      const text = 'Experienced with React, TypeScript, AWS and Docker';
      const skills = extractSkillsFromText(text);
      // Order is not guaranteed; use toEqual after sort
      expect(skills.sort()).toEqual(['react', 'typescript', 'aws', 'docker'].sort());
      // Ensure no duplicates
      const unique = new Set(skills);
      expect(unique.size).toBe(skills.length);
    });

    it('ignores unknown words and short tokens, respects pattern including + # . -', () => {
      ensureExports();
      const text = 'I love C#, C++, and GoLang. Also used Node.js and SQL+';
      const skills = extractSkillsFromText(text);
      // Known list: ['react','node','typescript','javascript','mongo','sql','aws','docker','kubernetes','python','java','c#','golang']
      // From text, expected recognized: c#, golang, node (from node.js), sql (from sql+)
      expect(skills).toEqual(expect.arrayContaining(['c#', 'golang', 'node', 'sql']));
      // Ensure it does not include unknowns like 'c++'
      expect(skills).not.toContain('c++');
    });

    it('handles repeated mentions of the same skill without duplicates', () => {
      ensureExports();
      const text = 'Node node NODE javascript JavaScript JAVA SCRIPT';
      const skills = extractSkillsFromText(text);
      expect(skills.sort()).toEqual(['node', 'javascript'].sort());
    });

    it('does not require skills to be contiguous words; matches anywhere in text tokens', () => {
      ensureExports();
      const text = 'Proficient: kubernetes, python; some experience in mongo and AWS';
      const skills = extractSkillsFromText(text);
      expect(skills.sort()).toEqual(['kubernetes', 'python', 'mongo', 'aws'].sort());
    });
  });

  describe('calculateExperienceFromText', () => {
    it('returns 0 when no experience pattern is found', () => {
      ensureExports();
      expect(calculateExperienceFromText('No explicit years mentioned')).toBe(0);
    });

    it('parses "X years", "X year", "X yrs", "X y", case-insensitively', () => {
      ensureExports();
      expect(calculateExperienceFromText('8 years of experience')).toBe(8);
      expect(calculateExperienceFromText('1 year exp')).toBe(1);
      expect(calculateExperienceFromText('10 yrs working with Python')).toBe(10);
      expect(calculateExperienceFromText('3 y in devops')).toBe(3);
      expect(calculateExperienceFromText('5 YEARS total')).toBe(5);
    });

    it('parses "X+" as a shorthand for at least X years', () => {
      ensureExports();
      expect(calculateExperienceFromText('8+ in backend engineering')).toBe(8);
      expect(calculateExperienceFromText('12+ years doing things')).toBe(12);
    });

    it('caps the experience at 50', () => {
      ensureExports();
      expect(calculateExperienceFromText('99 years in tech')).toBe(50);
      expect(calculateExperienceFromText('51 yrs something')).toBe(50);
      expect(calculateExperienceFromText('50+ y')).toBe(50);
    });

    it('uses the first matching occurrence if multiple exist', () => {
      ensureExports();
      expect(calculateExperienceFromText('2 years here, 7 years there')).toBe(2);
    });

    it('handles non-numeric or malformed text gracefully', () => {
      ensureExports();
      expect(calculateExperienceFromText('years 10')).toBe(0);
      expect(calculateExperienceFromText('ten years')).toBe(0);
      expect(calculateExperienceFromText('')).toBe(0);
    });
  });

  describe('scoreApplication', () => {
    it('defaults to weights skills=0.6 and experience=0.4 when not provided', () => {
      ensureExports();
      const score = scoreApplication(
        { skills: ['react', 'node'], requiredSkills: ['react', 'typescript'], experience: 2, minExperience: 4 }
      );
      // matched = 1/2 = 0.5; expOk = 2/4 = 0.5; score = round((0.5*0.6 + 0.5*0.4)*100) = round(0.5*100)=50
      expect(score).toBe(50);
    });

    it('awards full skills match when no requiredSkills are provided', () => {
      ensureExports();
      const score = scoreApplication(
        { skills: ['something'], experience: 0 },
        { skills: 1, experience: 0 }
      );
      // matched = 1 (no req), expOk irrelevant due to weight 0
      expect(score).toBe(100);
    });

    it('computes partial skills match correctly and is case-insensitive', () => {
      ensureExports();
      const score = scoreApplication(
        { skills: ['React', 'Node'], requiredSkills: ['react', 'typescript', 'node'], experience: 0, minExperience: 1 },
        { skills: 1, experience: 0 }
      );
      // matched = 2/3 ≈ 0.666..., weight skills=1 => round(0.666...*100)=67
      expect(score).toBe(67);
    });

    it('handles experience scoring with minExperience; caps at 1', () => {
      ensureExports();
      // experience less than minExperience
      const s1 = scoreApplication(
        { skills: [], experience: 2, minExperience: 4 },
        { skills: 0, experience: 1 }
      );
      // expOk=0.5 => score=50
      expect(s1).toBe(50);

      // experience equal to minExperience
      const s2 = scoreApplication(
        { skills: [], experience: 4, minExperience: 4 },
        { skills: 0, experience: 1 }
      );
      expect(s2).toBe(100);

      // experience greater than minExperience (capped at 1)
      const s3 = scoreApplication(
        { skills: [], experience: 10, minExperience: 4 },
        { skills: 0, experience: 1 }
      );
      expect(s3).toBe(100);
    });

    it('when minExperience not provided, experience factor defaults to 1', () => {
      ensureExports();
      const s = scoreApplication(
        { skills: [], requiredSkills: ['a'], experience: 0 },
        { skills: 1, experience: 0 }
      );
      // Only skills weight counts; matched=0/1=0 => 0
      expect(s).toBe(0);

      const s2 = scoreApplication(
        { skills: ['a'], requiredSkills: ['a'], experience: 0 },
        { skills: 1, experience: 0 }
      );
      expect(s2).toBe(100);
    });

    it('combines skills and experience according to weights and rounds to nearest integer', () => {
      ensureExports();
      const score = scoreApplication(
        {
          skills: ['react'],
          requiredSkills: ['react', 'node', 'typescript'],
          experience: 3,
          minExperience: 10
        },
        { skills: 0.25, experience: 0.75 }
      );
      // matched = 1/3 ≈ 0.3333
      // expOk = 3/10 = 0.3
      // total = (0.3333*0.25 + 0.3*0.75) = (0.08333 + 0.225) = 0.30833
      // score = round(30.833) = 31
      expect(score).toBe(31);
    });

    it('treats provided skill list case-insensitively for matching', () => {
      ensureExports();
      const score = scoreApplication(
        { skills: ['ReAcT', 'NODE'], requiredSkills: ['react', 'node'], experience: 0, minExperience: 1 },
        { skills: 1, experience: 0 }
      );
      expect(score).toBe(100);
    });

    it('handles empty requiredSkills array as full match and empty skills array with explicit requirements', () => {
      ensureExports();
      // Empty req => full match
      const s1 = scoreApplication(
        { skills: [], requiredSkills: [], experience: 0, minExperience: 1 },
        { skills: 1, experience: 0 }
      );
      expect(s1).toBe(100);

      // Required present but none matched
      const s2 = scoreApplication(
        { skills: [], requiredSkills: ['x', 'y'], experience: 10, minExperience: 10 },
        { skills: 1, experience: 0 }
      );
      expect(s2).toBe(0);
    });
  });
});