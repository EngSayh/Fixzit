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
  experience: 0.3,
  culture: 0.05,
  education: 0.05
};

const KNOWN_SKILLS = [
  'javascript', 'typescript', 'react', 'next.js', 'node', 'mongo',
  'mongodb', 'sql', 'leadership', 'communication', 'project management',
  'customer service', 'sales', 'marketing', 'design', 'finance',
  'hr', 'facilities', 'hvac', 'maintenance', 'procurement', 'vendor management'
];

export function scoreApplication(
  input: ScoreApplicationInput,
  weights: ScoringWeights = {}
): number {
  const normalizedWeights = normaliseWeights({ ...DEFAULT_WEIGHTS, ...weights });
  const requiredSkills = (input.requiredSkills || []).map(normalizeToken);
  const candidateSkills = (input.skills || []).map(normalizeToken).filter(Boolean);

  const skillScore = computeSkillScore(candidateSkills, requiredSkills);
  const experienceScore = computeExperienceScore(input.experience, input.minExperience);

  // Culture and education are placeholders for now but allow weighting flexibility.
  const cultureScore = 0.5; // neutral baseline while no explicit signals exist
  const educationScore = 0.5;

  const weighted =
    skillScore * normalizedWeights.skills +
    experienceScore * normalizedWeights.experience +
    cultureScore * normalizedWeights.culture +
    educationScore * normalizedWeights.education;

  return Math.round(Math.max(0, Math.min(1, weighted)) * 100);
}

function normaliseWeights(weights: Required<ScoringWeights>): Required<ScoringWeights> {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;
  return {
    skills: weights.skills / total,
    experience: weights.experience / total,
    culture: weights.culture / total,
    education: weights.education / total
  };
}

function computeSkillScore(candidateSkills: string[], requiredSkills: string[]): number {
  if (!requiredSkills.length) {
    // When job does not define explicit required skills we assume neutral but
    // still reward known skills that appear.
    const matchCount = candidateSkills.filter(skill => KNOWN_SKILLS.includes(skill)).length;
    return clamp(matchCount / Math.max(candidateSkills.length, 1));
  }

  if (!candidateSkills.length) return 0;

  const matches = requiredSkills.filter(req => candidateSkills.includes(req));
  const coverage = matches.length / requiredSkills.length;
  return clamp(coverage);
}

function computeExperienceScore(experience?: number, minExperience?: number): number {
  const expYears = typeof experience === 'number' && !Number.isNaN(experience) ? Math.max(experience, 0) : 0;
  const required = typeof minExperience === 'number' && !Number.isNaN(minExperience) ? Math.max(minExperience, 0) : 0;

  if (required === 0) {
    return clamp(expYears / (expYears + 5)); // diminishing returns curve
  }

  if (expYears >= required) {
    // Reward additional years but cap to avoid dominance
    return clamp(1 - Math.exp(-(expYears - required + 1)));
  }

  return clamp(expYears / required);
}

function normalizeToken(value: string): string {
  return (value || '').toLowerCase().trim();
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function extractSkillsFromText(text: string): string[] {
  if (!text) return [];
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const skills = new Set<string>();
  for (const token of tokens) {
    if (KNOWN_SKILLS.includes(token)) {
      skills.add(token);
    }
  }
  return Array.from(skills);
}

export function calculateExperienceFromText(text: string): number {
  if (!text) return 0;
  const patterns = [
    /(\d{1,2})\s*\+?\s*(?:years|yrs|y)\s+of\s+experience/gi,
    /(\d{1,2})\s*\+?\s*(?:years|yrs|y)/gi,
    /experience\s*[:\-]?\s*(\d{1,2})/gi
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}
