export function extractSkillsFromText(text: string): string[] {
  const base = (text || '').toLowerCase();
  const known = ['react','next.js','typescript','node','mongodb','sql','python','aws','docker'];
  return Array.from(new Set(known.filter(k => base.includes(k.split('.')[0]))));
}

export function calculateExperienceFromText(text: string): number {
  const match = /([0-9]{1,2})\s*(\+)?\s*(years|yrs)/i.exec(text || '');
  return match ? Math.min(40, parseInt(match[1] || '0', 10)) : 0;
}

export function scoreApplication(input: {
  skills: string[];
  requiredSkills?: string[];
  experience?: number;
  minExperience?: number;
}, weights: { skills: number; experience: number } = { skills: 0.6, experience: 0.4 }): number {
  const required = (input.requiredSkills || []).map(s => s.toLowerCase());
  const have = (input.skills || []).map(s => s.toLowerCase());
  const skillHits = required.length ? required.filter(s => have.includes(s)).length / required.length : 1;
  const expOk = Math.max(0, Math.min(1, ((input.experience || 0) - (input.minExperience || 0)) / Math.max(1, (input.minExperience || 1))));
  const score = weights.skills * skillHits + weights.experience * expOk;
  return Math.round(score * 100);
}

