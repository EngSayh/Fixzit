// Mock ATS scoring utilities
export interface CandidateScore {
  totalScore: number;
  criteria: {
    experience: number;
    education: number;
    skills: number;
    cultural: number;
  };
  recommendation: 'hire' | 'interview' | 'reject';
}

export interface ScoringCriteria {
  experienceWeight: number;
  educationWeight: number;
  skillsWeight: number;
  culturalWeight: number;
  minimumScore: number;
}

// Mock implementation
export class AtsScoring {
  static async scoreCandidate(
    candidateId: string, 
    jobId: string, 
    criteria?: ScoringCriteria
  ): Promise<CandidateScore> {
    // Mock scoring logic
    const defaultCriteria: ScoringCriteria = {
      experienceWeight: 0.4,
      educationWeight: 0.2,
      skillsWeight: 0.3,
      culturalWeight: 0.1,
      minimumScore: 70
    };

    const useCriteria = criteria || defaultCriteria;
    
    // Mock scores (in real implementation, this would analyze resume, etc.)
    const experienceScore = Math.random() * 100;
    const educationScore = Math.random() * 100;
    const skillsScore = Math.random() * 100;
    const culturalScore = Math.random() * 100;

    const totalScore = 
      experienceScore * useCriteria.experienceWeight +
      educationScore * useCriteria.educationWeight +
      skillsScore * useCriteria.skillsWeight +
      culturalScore * useCriteria.culturalWeight;

    let recommendation: 'hire' | 'interview' | 'reject';
    if (totalScore >= 85) {
      recommendation = 'hire';
    } else if (totalScore >= useCriteria.minimumScore) {
      recommendation = 'interview';
    } else {
      recommendation = 'reject';
    }

    return {
      totalScore: Math.round(totalScore),
      criteria: {
        experience: Math.round(experienceScore),
        education: Math.round(educationScore),
        skills: Math.round(skillsScore),
        cultural: Math.round(culturalScore)
      },
      recommendation
    };
  }

  static async batchScore(
    candidateIds: string[], 
    jobId: string,
    criteria?: ScoringCriteria
  ): Promise<Record<string, CandidateScore>> {
    const results: Record<string, CandidateScore> = {};
    
    for (const candidateId of candidateIds) {
      results[candidateId] = await this.scoreCandidate(candidateId, jobId, criteria);
    }
    
    return results;
  }
}

/**
 * Extract skills from text (resume, job description, etc.)
 */
export function extractSkillsFromText(text: string): string[] {
  // Mock implementation - in reality would use NLP
  const commonSkills = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python',
    'Java', 'SQL', 'Git', 'AWS', 'Docker', 'Kubernetes',
    'HTML', 'CSS', 'MongoDB', 'PostgreSQL', 'Redis'
  ];

  const foundSkills = commonSkills.filter(skill => 
    text.toLowerCase().includes(skill.toLowerCase())
  );

  return foundSkills;
}

/**
 * Calculate years of experience from text
 */
export function calculateExperienceFromText(text: string): number {
  // Mock implementation - in reality would use NLP to parse experience
  const experienceRegex = /(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?experience/gi;
  const matches = text.match(experienceRegex);
  
  if (matches && matches.length > 0) {
    const numbers = matches.map(match => {
      const num = match.match(/\d+/);
      return num ? parseInt(num[0]) : 0;
    });
    return Math.max(...numbers);
  }
  
  // Fallback - estimate based on text length and complexity
  return Math.min(Math.floor(text.length / 500), 10);
}

/**
 * Score an application based on various criteria
 */
export async function scoreApplication(
  applicationId: string,
  criteria?: ScoringCriteria
): Promise<CandidateScore> {
  // Mock implementation - delegate to existing scoring
  return AtsScoring.scoreCandidate(applicationId, 'job-1', criteria);
}