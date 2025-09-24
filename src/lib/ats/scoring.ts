export function extractSkillsFromText(text: string): string[] {
  if (!text) return [];
  const words: string[] = (text.toLowerCase().match(/[a-z0-9+#\.\-]{2,}/g) as string[]) || [];
  const known = ['react','node','typescript','javascript','mongo','sql','aws','docker','kubernetes','python','java','c#','golang'];
  const set = new Set<string>();
  for (const k of known) if (words.includes(k)) set.add(k);
  return Array.from(set);
}

export function calculateExperienceFromText(text: string): number {
  const src = text || "";
  const m = src.match(/\b(\d{1,2})\s*(?:(?:years?|yrs?|y)\b|\+(?=\s|$))/i);
  return m ? Math.min(50, parseInt(m[1], 10)) : 0;
}

export function scoreApplication(
  input: { skills: string[]; requiredSkills?: string[]; experience: number; minExperience?: number },
  weights?: { skills?: number; experience?: number }
): number {
  const wSkills = weights?.skills ?? 0.6;
  const wExp = weights?.experience ?? 0.4;
  const req = input.requiredSkills ?? [];
  const have = new Set(input.skills.map(s => s.toLowerCase()));
  const matched = req.length ? req.filter(r => have.has(r.toLowerCase())).length / req.length : 1;
  const expOk = input.minExperience ? Math.min(1, input.experience / input.minExperience) : 1;
  return Math.round((matched * wSkills + expOk * wExp) * 100);
}

