export function extractSkillsFromText(text: string): string[] {
  if (!text) return [];
  return Array.from(new Set(text.split(/[,\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean))).slice(0, 50);
}

export function calculateExperienceFromText(text: string): number {
  const m = text.match(/(\d{1,2})\s*(?:\+\s*)?(?:years|yrs|year)/i);
  return m ? Math.min(50, parseInt(m[1], 10)) : 0;
}

export function scoreApplication(
  candidate: { skills: string[]; requiredSkills?: string[]; experience: number; minExperience?: number },
  weights?: { skills?: number; experience?: number }
): number {
  const required = (candidate.requiredSkills || []).map(s => s.toLowerCase());
  const have = new Set((candidate.skills || []).map(s => s.toLowerCase()));
  const skillMatches = required.length ? required.filter(s => have.has(s)).length / required.length : 1;
  const expScore = candidate.minExperience ? Math.min(1, candidate.experience / candidate.minExperience) : 1;
  const wSkills = weights?.skills ?? 0.7;
  const wExp = weights?.experience ?? 0.3;
  return Math.round((skillMatches * wSkills + expScore * wExp) * 100);
}

