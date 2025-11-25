export interface ScoreApplicationInput {
  skills: string[];
  requiredSkills?: string[];
  experience?: number;
  minExperience?: number;
}

export interface ScoringWeights {
  skills?: number;
  experience?: number;
  culture?: number;
  education?: number;
}

const DEFAULT_WEIGHTS: Required<ScoringWeights> = {
  skills: 0.6,
  experience: 0.4,
  culture: 0.0,
  education: 0.0,
};

// FIX: Known technology skills for precise extraction (whitelist approach)
// This prevents false positives like "Elm" and "Rust" while supporting c++, c#, etc.
const KNOWN_SKILLS = new Set([
  "javascript",
  "typescript",
  "react",
  "node",
  "node.js",
  "html",
  "css",
  "java",
  "sql",
  "agile",
  "c#",
  "c++",
  "golang",
  "docker",
  "kubernetes",
  "python",
  "aws",
  "angular",
  "vue",
  "nextjs",
  "next.js",
  "mongodb",
  "postgresql",
  "mysql",
  "redis",
  "graphql",
  "rest",
  "git",
  "jenkins",
  "cicd",
  "ci/cd",
  "devops",
  "linux",
  "windows",
  "azure",
  "gcp",
  "terraform",
  "ansible",
  "nginx",
  "apache",
  "net",
  ".net",
  "core",
  "aws-s3",
  "s3", // .NET, ASP.NET Core, AWS S3
]);

export function scoreApplication(
  input: ScoreApplicationInput,
  weights: ScoringWeights = {},
): number {
  const normalizedWeights = normaliseWeights({
    ...DEFAULT_WEIGHTS,
    ...weights,
  });
  const requiredSkills = (input.requiredSkills || []).map(normalizeToken);
  const candidateSkills = (input.skills || [])
    .map(normalizeToken)
    .filter(Boolean);

  const skillScore = computeSkillScore(candidateSkills, requiredSkills);
  const experienceScore = computeExperienceScore(
    input.experience,
    input.minExperience,
  );

  // Culture and education are placeholders for now but allow weighting flexibility.
  // Use 1.0 (perfect match) when weights are 0 to avoid penalizing scores
  const cultureScore = normalizedWeights.culture > 0 ? 0.5 : 1.0;
  const educationScore = normalizedWeights.education > 0 ? 0.5 : 1.0;

  const weighted =
    skillScore * normalizedWeights.skills +
    experienceScore * normalizedWeights.experience +
    cultureScore * normalizedWeights.culture +
    educationScore * normalizedWeights.education;

  return Math.round(Math.max(0, Math.min(1, weighted)) * 100);
}

function normaliseWeights(
  weights: Required<ScoringWeights>,
): Required<ScoringWeights> {
  const total =
    Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;
  return {
    skills: weights.skills / total,
    experience: weights.experience / total,
    culture: weights.culture / total,
    education: weights.education / total,
  };
}

function computeSkillScore(
  candidateSkills: string[],
  requiredSkills: string[],
): number {
  // When job does not define explicit required skills, treat as full match (1.0)
  if (!requiredSkills.length) {
    return 1.0;
  }

  if (!candidateSkills.length) return 0;

  const matches = requiredSkills.filter((req) => candidateSkills.includes(req));
  const coverage = matches.length / requiredSkills.length;
  return clamp(coverage);
}

function computeExperienceScore(
  experience?: number,
  minExperience?: number,
): number {
  const expYears =
    typeof experience === "number" && !Number.isNaN(experience)
      ? Math.max(experience, 0)
      : 0;
  const required =
    typeof minExperience === "number" && !Number.isNaN(minExperience)
      ? Math.max(minExperience, 0)
      : 0;

  // When no minimum experience is required, treat as full match (1.0)
  if (required === 0) {
    return 1.0;
  }

  // Simple linear scoring: candidate experience / required experience, capped at 1.0
  return clamp(expYears / required);
}

function normalizeToken(value: string): string {
  return (value || "").toLowerCase().trim();
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function extractSkillsFromText(text: string): string[] {
  if (!text) return [];

  // FIX: Updated regex to allow "c++", "next.js", "aws-s3", ".net", "node.js"
  // It now treats letters, numbers, and the symbols +, #, . as part of a single word.
  const tokens = text.toLowerCase().match(/[\w.#+-]+/g) || []; // \w (alphanumeric) + #, ., +, -

  const skills = new Set<string>();

  for (let token of tokens) {
    // Clean up: remove leading/trailing periods and hyphens
    token = token.replace(/^[.-]+/, "").replace(/[.-]+$/, "");

    // Filter: must be a known skill (for precision)
    if (KNOWN_SKILLS.has(token)) {
      skills.add(token);
    }
  }

  return Array.from(skills).slice(0, 20); // Limit to 20 skills to prevent spam
}

export function calculateExperienceFromText(text: string): number {
  if (!text) return 0;
  const patterns = [
    /(\d{1,2})\s*\+?\s*(?:years|yrs|y)\s+of\s+experience/gi,
    /(\d{1,2})\s*\+?\s*(?:years|yrs|y)/gi,
    /(\d{1,2})\+/gi, // Match "12+" format
    /experience\s*[:-]?\s*(\d{1,2})/gi,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!Number.isNaN(parsed)) {
        // Cap experience at 40 years to prevent unrealistic values
        return Math.min(parsed, 40);
      }
    }
  }

  return 0;
}
