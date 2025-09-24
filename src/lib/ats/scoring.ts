interface ScoringInput {
  skills: string[];
  requiredSkills: string[];
  experience: number;
  minExperience?: number;
  education?: string;
  certifications?: string[];
  answers?: Record<string, any>;
}

interface ScoringWeights {
  skills: number;
  experience: number;
  education: number;
  certifications: number;
  answers: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  skills: 0.4,
  experience: 0.2,
  education: 0.15,
  certifications: 0.15,
  answers: 0.1
};

export function scoreApplication(
  input: ScoringInput,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  let totalScore = 0;
  
  // Skills matching (40% default)
  if (input.requiredSkills.length > 0) {
    const candidateSkills = input.skills.map(s => s.toLowerCase().trim());
    const matchedSkills = input.requiredSkills.filter(skill => 
      candidateSkills.some(cs => 
        cs.includes(skill.toLowerCase()) || 
        skill.toLowerCase().includes(cs)
      )
    );
    const skillScore = (matchedSkills.length / input.requiredSkills.length) * 100;
    totalScore += skillScore * weights.skills;
  } else {
    // If no required skills, give full score for having any skills
    totalScore += (input.skills.length > 0 ? 100 : 0) * weights.skills;
  }
  
  // Experience scoring (20% default)
  if (input.minExperience !== undefined && input.minExperience > 0) {
    const experienceRatio = Math.min(input.experience / input.minExperience, 2); // Cap at 2x
    const experienceScore = experienceRatio * 50; // 50 points for meeting minimum, up to 100 for 2x
    totalScore += experienceScore * weights.experience;
  } else {
    // If no minimum experience, score based on absolute years (0-10+ scale)
    const experienceScore = Math.min(input.experience * 10, 100);
    totalScore += experienceScore * weights.experience;
  }
  
  // Education scoring (15% default)
  if (input.education) {
    const educationScores: Record<string, number> = {
      'phd': 100,
      'doctorate': 100,
      'masters': 85,
      'master': 85,
      'bachelors': 70,
      'bachelor': 70,
      'diploma': 50,
      'certificate': 40,
      'high school': 30,
      'secondary': 30
    };
    
    const educationLower = input.education.toLowerCase();
    let educationScore = 30; // Default score
    
    for (const [key, score] of Object.entries(educationScores)) {
      if (educationLower.includes(key)) {
        educationScore = Math.max(educationScore, score);
      }
    }
    
    totalScore += educationScore * weights.education;
  }
  
  // Certifications scoring (15% default)
  if (input.certifications && input.certifications.length > 0) {
    // Score based on number of certifications (0-5+ scale)
    const certScore = Math.min(input.certifications.length * 20, 100);
    totalScore += certScore * weights.certifications;
  }
  
  // Custom answers scoring (10% default)
  if (input.answers && Object.keys(input.answers).length > 0) {
    let answerScore = 0;
    let answerCount = 0;
    
    Object.values(input.answers).forEach(answer => {
      if (answer && typeof answer === 'object' && 'score' in answer) {
        answerScore += answer.score;
        answerCount++;
      } else if (answer && answer.toString().length > 10) {
        // Give points for providing substantial answers
        answerScore += 70;
        answerCount++;
      }
    });
    
    if (answerCount > 0) {
      totalScore += (answerScore / answerCount) * weights.answers;
    }
  }
  
  // Ensure score is between 0 and 100
  return Math.round(Math.min(Math.max(totalScore, 0), 100));
}

export function categorizeScore(score: number): {
  category: 'excellent' | 'good' | 'fair' | 'poor';
  recommendation: string;
  color: string;
} {
  if (score >= 85) {
    return {
      category: 'excellent',
      recommendation: 'Strong candidate - proceed to interview',
      color: 'green'
    };
  } else if (score >= 70) {
    return {
      category: 'good',
      recommendation: 'Good candidate - consider for interview',
      color: 'blue'
    };
  } else if (score >= 50) {
    return {
      category: 'fair',
      recommendation: 'Average candidate - review application carefully',
      color: 'yellow'
    };
  } else {
    return {
      category: 'poor',
      recommendation: 'Below requirements - consider rejection',
      color: 'red'
    };
  }
}

export function extractSkillsFromText(text: string, knownSkills: string[] = []): string[] {
  if (!text) return [];
  
  const extractedSkills = new Set<string>();
  const textLower = text.toLowerCase();
  
  // Common technical skills
  const commonSkills = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby',
    'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask',
    'sql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git',
    'machine learning', 'data science', 'ai', 'deep learning',
    'project management', 'agile', 'scrum', 'leadership', 'communication',
    'microsoft office', 'excel', 'powerpoint', 'word',
    'arabic', 'english', 'french', 'spanish', 'german',
    'sales', 'marketing', 'finance', 'accounting', 'hr',
    'customer service', 'problem solving', 'analytical'
  ];
  
  // Check for known skills
  [...commonSkills, ...knownSkills].forEach(skill => {
    if (textLower.includes(skill.toLowerCase())) {
      extractedSkills.add(skill);
    }
  });
  
  // Extract skills from common patterns
  const patterns = [
    /proficient in ([^,.\n]+)/gi,
    /experienced with ([^,.\n]+)/gi,
    /skills?:?\s*([^.\n]+)/gi,
    /knowledge of ([^,.\n]+)/gi,
    /familiar with ([^,.\n]+)/gi
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const skills = match[1].split(/,|and|&/).map(s => s.trim());
      skills.forEach(skill => {
        if (skill.length > 2 && skill.length < 50) {
          extractedSkills.add(skill);
        }
      });
    }
  });
  
  return Array.from(extractedSkills);
}

export function calculateExperienceFromText(text: string): number {
  if (!text) return 0;
  
  const patterns = [
    /(\d+)\+?\s*years?\s*(?:of\s*)?experience/i,
    /experience[:\s]+(\d+)\+?\s*years?/i,
    /(\d+)\s*years?\s*in/i,
    /for\s*(\d+)\s*years?/i
  ];
  
  let maxYears = 0;
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches && matches[1]) {
      const years = parseInt(matches[1]);
      if (!isNaN(years)) {
        maxYears = Math.max(maxYears, years);
      }
    }
  });
  
  return maxYears;
}
