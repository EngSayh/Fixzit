export interface ScoringCriteria {
  experience: number;
  skills: number;
  education: number;
  keywords: number;
  location: number;
}

export interface CandidateData {
  experience: number;
  skills: string[];
  education: string[];
  keywords: string[];
  location: string;
}

export interface JobRequirements {
  requiredExperience: number;
  requiredSkills: string[];
  preferredEducation: string[];
  keywords: string[];
  location: string;
}

export function calculateScore(
  candidate: CandidateData,
  job: JobRequirements,
  criteria: ScoringCriteria
): number {
  let totalScore = 0;

  // Experience scoring (0-100)
  const experienceScore = Math.min((candidate.experience / job.requiredExperience) * 100, 100);
  totalScore += (experienceScore * criteria.experience) / 100;

  // Skills scoring (0-100)
  const matchingSkills = candidate.skills.filter(skill => 
    job.requiredSkills.some(reqSkill => 
      skill.toLowerCase().includes(reqSkill.toLowerCase()) ||
      reqSkill.toLowerCase().includes(skill.toLowerCase())
    )
  ).length;
  const skillsScore = (matchingSkills / job.requiredSkills.length) * 100;
  totalScore += (skillsScore * criteria.skills) / 100;

  // Education scoring (0-100)
  const educationScore = candidate.education.some(edu => 
    job.preferredEducation.some(prefEdu => 
      edu.toLowerCase().includes(prefEdu.toLowerCase())
    )
  ) ? 100 : 0;
  totalScore += (educationScore * criteria.education) / 100;

  // Keywords scoring (0-100)
  const matchingKeywords = candidate.keywords.filter(keyword => 
    job.keywords.some(jobKeyword => 
      keyword.toLowerCase().includes(jobKeyword.toLowerCase())
    )
  ).length;
  const keywordsScore = (matchingKeywords / job.keywords.length) * 100;
  totalScore += (keywordsScore * criteria.keywords) / 100;

  // Location scoring (0-100)
  const locationScore = candidate.location.toLowerCase() === job.location.toLowerCase() ? 100 : 0;
  totalScore += (locationScore * criteria.location) / 100;

  return Math.round(totalScore);
}

export function getScoreGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C+';
  if (score >= 40) return 'C';
  return 'D';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

export function extractSkillsFromText(text: string): string[] {
  const commonSkills = [
    'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Python',
    'Java', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'SQL', 'MongoDB', 'PostgreSQL',
    'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'Linux', 'Windows',
    'Project Management', 'Agile', 'Scrum', 'Leadership', 'Communication',
    'Problem Solving', 'Analytical', 'Creative', 'Teamwork', 'Time Management'
  ];
  
  const foundSkills: string[] = [];
  const lowerText = text.toLowerCase();
  
  commonSkills.forEach(skill => {
    if (lowerText.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  });
  
  return foundSkills;
}

export function calculateExperienceFromText(text: string): number {
  const experienceRegex = /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?experience/gi;
  const matches = text.match(experienceRegex);
  
  if (matches) {
    const years = matches.map(match => {
      const num = match.match(/\d+/);
      return num ? parseInt(num[0]) : 0;
    });
    return Math.max(...years);
  }
  
  return 0;
}

export function scoreApplication(application: any, job: any, criteria: ScoringCriteria): number {
  const candidate = {
    experience: calculateExperienceFromText(application.resume || ''),
    skills: extractSkillsFromText(application.resume || ''),
    education: extractSkillsFromText(application.coverLetter || ''),
    keywords: extractSkillsFromText(application.coverLetter || ''),
    location: application.location || ''
  };
  
  const jobRequirements = {
    requiredExperience: job.experience || 0,
    requiredSkills: job.skills || [],
    preferredEducation: job.education || [],
    keywords: job.keywords || [],
    location: job.location || ''
  };
  
  return calculateScore(candidate, jobRequirements, criteria);
}