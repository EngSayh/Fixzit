import { IJob } from '@/src/server/models/Job';
import { ICandidate } from '@/src/server/models/Candidate';
import { IAtsSettings } from '@/src/server/models/AtsSettings';

export interface ApplicationScore {
  overall: number;
  breakdown: {
    skillMatch: number;
    experience: number;
    education: number;
    keywords: number;
  };
  details: {
    matchedSkills: string[];
    experienceYears: number;
    educationScore: number;
    keywordMatches: string[];
  };
}

/**
 * Score an application based on job requirements and candidate profile
 */
export function scoreApplication(
  job: IJob,
  candidate: ICandidate,
  settings: IAtsSettings
): ApplicationScore {
  const skillScore = calculateSkillMatch(job, candidate);
  const experienceScore = calculateExperienceScore(job, candidate);
  const educationScore = calculateEducationScore(job, candidate);
  const keywordScore = calculateKeywordScore(job, candidate);

  const overall = Math.round(
    (skillScore.score * settings.scoring.skillMatchWeight / 100) +
    (experienceScore.score * settings.scoring.experienceWeight / 100) +
    (educationScore.score * settings.scoring.educationWeight / 100) +
    (keywordScore.score * settings.scoring.keywordWeight / 100)
  );

  return {
    overall: Math.min(100, Math.max(0, overall)),
    breakdown: {
      skillMatch: skillScore.score,
      experience: experienceScore.score,
      education: educationScore.score,
      keywords: keywordScore.score
    },
    details: {
      matchedSkills: skillScore.matched,
      experienceYears: experienceScore.years,
      educationScore: educationScore.score,
      keywordMatches: keywordScore.matched
    }
  };
}

/**
 * Calculate skill match score
 */
function calculateSkillMatch(job: IJob, candidate: ICandidate): {
  score: number;
  matched: string[];
} {
  const requiredSkills = job.skills.required.map(s => s.toLowerCase());
  const preferredSkills = job.skills.preferred.map(s => s.toLowerCase());
  const candidateSkills = candidate.skills.map(s => s.toLowerCase());

  const matchedRequired = requiredSkills.filter(skill => 
    candidateSkills.some(cs => cs.includes(skill) || skill.includes(cs))
  );

  const matchedPreferred = preferredSkills.filter(skill => 
    candidateSkills.some(cs => cs.includes(skill) || skill.includes(cs))
  );

  // Required skills are worth more than preferred
  const requiredWeight = 0.7;
  const preferredWeight = 0.3;

  const requiredScore = requiredSkills.length > 0 
    ? (matchedRequired.length / requiredSkills.length) * 100 * requiredWeight
    : 0;

  const preferredScore = preferredSkills.length > 0 
    ? (matchedPreferred.length / preferredSkills.length) * 100 * preferredWeight
    : 0;

  return {
    score: Math.round(requiredScore + preferredScore),
    matched: [...matchedRequired, ...matchedPreferred]
  };
}

/**
 * Calculate experience score
 */
function calculateExperienceScore(job: IJob, candidate: ICandidate): {
  score: number;
  years: number;
} {
  const candidateYears = candidate.experience.years;
  
  // Extract experience requirements from job description
  const requiredYears = extractExperienceRequirement(job.description);
  
  if (requiredYears === 0) {
    return { score: 80, years: candidateYears }; // Default score if no requirement
  }

  // Score based on how well candidate meets requirement
  let score: number;
  if (candidateYears >= requiredYears) {
    // Meets or exceeds requirement
    score = 100;
    // Bonus for significantly more experience, but cap at 100
    if (candidateYears > requiredYears * 1.5) {
      score = 100;
    }
  } else if (candidateYears >= requiredYears * 0.8) {
    // Close to requirement (80-99%)
    score = 80 + (candidateYears / requiredYears) * 20;
  } else if (candidateYears >= requiredYears * 0.5) {
    // Somewhat below requirement (50-79%)
    score = 40 + (candidateYears / requiredYears) * 40;
  } else {
    // Significantly below requirement
    score = (candidateYears / requiredYears) * 40;
  }

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    years: candidateYears
  };
}

/**
 * Calculate education score
 */
function calculateEducationScore(job: IJob, candidate: ICandidate): {
  score: number;
} {
  if (candidate.education.length === 0) {
    return { score: 30 }; // Base score for no education info
  }

  // Simple scoring based on highest degree
  const degrees = candidate.education.map(edu => edu.degree.toLowerCase());
  
  let maxScore = 0;
  for (const degree of degrees) {
    let score = 50; // Base score
    
    if (degree.includes('phd') || degree.includes('doctorate')) {
      score = 100;
    } else if (degree.includes('master') || degree.includes('mba')) {
      score = 90;
    } else if (degree.includes('bachelor') || degree.includes('bs') || degree.includes('ba')) {
      score = 80;
    } else if (degree.includes('associate') || degree.includes('diploma')) {
      score = 70;
    } else if (degree.includes('certificate')) {
      score = 60;
    }
    
    maxScore = Math.max(maxScore, score);
  }

  return { score: maxScore };
}

/**
 * Calculate keyword score from job description
 */
function calculateKeywordScore(job: IJob, candidate: ICandidate): {
  score: number;
  matched: string[];
} {
  const jobText = `${job.description} ${job.requirements.join(' ')} ${job.qualifications.join(' ')}`.toLowerCase();
  const candidateText = `${candidate.experience.description} ${candidate.skills.join(' ')}`.toLowerCase();

  // Extract important keywords (could be enhanced with NLP)
  const keywords = extractKeywords(jobText);
  
  const matched = keywords.filter(keyword => 
    candidateText.includes(keyword.toLowerCase())
  );

  const score = keywords.length > 0 
    ? Math.round((matched.length / keywords.length) * 100)
    : 50; // Default score if no keywords found

  return {
    score: Math.min(100, score),
    matched
  };
}

/**
 * Extract experience requirement from job description
 */
function extractExperienceRequirement(description: string): number {
  const lowerDesc = description.toLowerCase();
  
  // Look for patterns like "3+ years", "minimum 5 years", "2-4 years"
  const patterns = [
    /minimum\s+(\d+)\s+years?/g,
    /at least\s+(\d+)\s+years?/g,
    /(\d+)\+\s+years?/g,
    /(\d+)-\d+\s+years?/g,
    /(\d+)\s+years?\s+of\s+experience/g
  ];

  let maxYears = 0;
  
  for (const pattern of patterns) {
    const matches = [...lowerDesc.matchAll(pattern)];
    for (const match of matches) {
      const years = parseInt(match[1]);
      if (years > maxYears) {
        maxYears = years;
      }
    }
  }

  return maxYears;
}

/**
 * Extract keywords from text (simplified approach)
 */
function extractKeywords(text: string): string[] {
  // Remove common words and extract meaningful terms
  const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'cannot'];
  
  const words = text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !commonWords.includes(word.toLowerCase()) &&
      !/^\d+$/.test(word)
    );

  // Get unique words with frequency > 1
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    const lower = word.toLowerCase();
    wordCount[lower] = (wordCount[lower] || 0) + 1;
  });

  return Object.entries(wordCount)
    .filter(([, count]) => count > 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20) // Top 20 keywords
    .map(([word]) => word);
}

/**
 * Extract skills from text using keyword matching
 */
export function extractSkillsFromText(text: string): string[] {
  const techSkills = [
    'javascript', 'typescript', 'react', 'vue', 'angular', 'node.js', 'express',
    'python', 'django', 'flask', 'java', 'spring', 'c#', 'asp.net', 'php',
    'laravel', 'symfony', 'ruby', 'rails', 'go', 'rust', 'kotlin', 'swift',
    'html', 'css', 'sass', 'tailwind', 'bootstrap', 'mysql', 'postgresql',
    'mongodb', 'redis', 'elasticsearch', 'docker', 'kubernetes', 'aws', 'azure',
    'gcp', 'git', 'jenkins', 'ci/cd', 'devops', 'microservices', 'api', 'rest',
    'graphql', 'machine learning', 'ai', 'data science', 'analytics'
  ];

  const softSkills = [
    'leadership', 'communication', 'teamwork', 'problem solving', 'analytical',
    'project management', 'agile', 'scrum', 'mentoring', 'coaching', 'negotiation',
    'presentation', 'customer service', 'sales', 'marketing', 'strategy'
  ];

  const allSkills = [...techSkills, ...softSkills];
  const lowerText = text.toLowerCase();

  return allSkills.filter(skill => 
    lowerText.includes(skill.toLowerCase())
  );
}

/**
 * Calculate experience years from text
 */
export function calculateExperienceFromText(text: string): number {
  const lowerText = text.toLowerCase();
  
  const patterns = [
    /(\d+)\+?\s*years?/g,
    /(\d+)-\d+\s*years?/g,
    /over\s*(\d+)\s*years?/g,
    /more than\s*(\d+)\s*years?/g,
    /(\d+)\s*years?\s*of\s*experience/g
  ];

  let maxYears = 0;
  
  for (const pattern of patterns) {
    const matches = [...lowerText.matchAll(pattern)];
    for (const match of matches) {
      const years = parseInt(match[1]);
      if (years > maxYears) {
        maxYears = years;
      }
    }
  }

  return maxYears;
}