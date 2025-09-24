export function extractSkillsFromText(text: string): string[] {
  if (!text) return [];
  const candidates = Array.from(new Set(text.toLowerCase().match(/[a-z][a-z0-9+.#-]{2,}/g) || []));
  const common = ['and','or','the','with','for','from','this','that','email','phone'];
  return candidates.filter(w => !common.includes(w)).slice(0, 20);
}

export function calculateExperienceFromText(text: string): number {
  if (!text) return 0;
  const m = text.match(/(\d{1,2})\s*(\+|\b)\s*(years?|yrs?)/i);
  return m ? Math.min(40, parseInt(m[1], 10)) : 0;
}

export function scoreApplication(
  input: { skills: string[]; requiredSkills?: string[]; experience: number; minExperience?: number },
  weights?: { skills?: number; experience?: number }
) {
  const wSkills = Math.max(0, Math.min(1, weights?.skills ?? 0.6));
  const wExp = Math.max(0, Math.min(1, weights?.experience ?? 0.4));
  const req = input.requiredSkills || [];
  const have = new Set((input.skills || []).map(s => s.toLowerCase()));
  const matched = req.length ? req.filter(s => have.has(s.toLowerCase())).length / req.length : 1;
  const expOk = input.minExperience ? Math.min(1, input.experience / input.minExperience) : 1;
  const score = Math.round((matched * wSkills + expOk * wExp) * 100);
  return score;
}

