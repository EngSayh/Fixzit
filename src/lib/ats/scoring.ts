type Weights = { skills: number; years: number; answers: number };

export function scoreApplication(
  { skills = [], requiredSkills = [], experience = 0, minYears = 0 }: { skills?: string[]; requiredSkills?: string[]; experience?: number; minYears?: number },
  weights: Weights = { skills: 0.6, years: 0.2, answers: 0.2 }
) {
  const skillSet = new Set((skills || []).map(s => s.toLowerCase()));
  const required = (requiredSkills || []).map(s => s.toLowerCase());
  const matches = required.filter(r => skillSet.has(r)).length;
  const skillsScore = required.length ? matches / required.length : 1;
  const yearsScore = Math.min(1, Math.max(0, (experience || 0) / Math.max(1, minYears || 5)));
  const answersScore = 1; // placeholder until structured answers are scored
  const total = (skillsScore * weights.skills) + (yearsScore * weights.years) + (answersScore * weights.answers);
  return Math.round(Math.min(1, Math.max(0, total)) * 100);
}

export function extractSkillsFromText(text: string): string[] {
  if (!text) return [];
  const known = ['procurement','negotiation','vendor','excel','hvac','plumbing','electrical','management','javascript','react'];
  const lower = text.toLowerCase();
  return Array.from(new Set(known.filter(k => lower.includes(k))));
}

export function calculateExperienceFromText(text: string): number {
  if (!text) return 0;
  const m = text.match(/(\d+)\+?\s*(years|yrs)/i);
  return m ? parseInt(m[1], 10) : 0;
}

