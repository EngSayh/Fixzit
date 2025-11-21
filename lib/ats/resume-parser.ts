/**
 * Resume Parser - Extract structured data from PDF resumes
 * Phase 2 implementation - Basic text extraction and pattern matching
 */

import { logger } from '@/lib/logger';

interface ParsedResume {
  skills: string[];
  experience: {
    years: number;
    positions: Array<{
      title: string;
      company: string;
      duration?: string;
    }>;
  };
  education: Array<{
    degree: string;
    institution: string;
    year?: string;
  }>;
  contact?: {
    email?: string;
    phone?: string;
  };
  rawText?: string;
}

/**
 * Parse resume PDF buffer and extract structured information
 * Note: Requires pdf-parse package - install with: pnpm add pdf-parse
 */
export async function parseResumePDF(pdfBuffer: Buffer): Promise<ParsedResume> {
  // Import pdf-parse dynamically to handle missing dependency gracefully
  try {
    const pdfParse = await import('pdf-parse');
    // @ts-expect-error - pdf-parse has ESM/CJS export issues
    const parse = pdfParse.default || pdfParse;
    const data = await parse(pdfBuffer);
    const parsed = parsePlainText(data.text);
    return { ...parsed, rawText: data.text };
  } catch (_error) {
    logger.warn('pdf-parse not installed or failed, using fallback parser', { component: 'ATS', action: 'parseResume', error: _error });
    return parsePlainText('');
  }
}

/**
 * Parse plain text resume content
 */
export function parsePlainText(text: string): ParsedResume {
  const normalizedText = text.toLowerCase();
  
  return {
    skills: extractSkills(text),
    experience: extractExperience(text, normalizedText),
    education: extractEducation(text, normalizedText),
    contact: extractContact(text),
    rawText: text
  };
}

/**
 * Extract skills from resume text using keyword matching
 */
function extractSkills(text: string): string[] {
  const skills: Set<string> = new Set();
  
  // Common technical skills library
  const skillKeywords = [
    // Programming Languages
    'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'ruby', 'php', 'swift', 'kotlin', 'go', 'rust',
    // Web Technologies
    'react', 'angular', 'vue', 'node.js', 'express', 'next.js', 'html', 'css', 'sass', 'tailwind',
    // Backend & Databases
    'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'graphql', 'rest api', 'microservices',
    // DevOps & Cloud
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci/cd', 'jenkins', 'github actions', 'terraform',
    // Mobile
    'react native', 'flutter', 'ios', 'android', 'mobile development',
    // Other Tech
    'machine learning', 'ai', 'data science', 'blockchain', 'testing', 'agile', 'scrum', 'git',
    // Soft Skills
    'leadership', 'communication', 'teamwork', 'problem solving', 'project management', 'analytical'
  ];

  const normalizedText = text.toLowerCase();
  
  for (const keyword of skillKeywords) {
    // Match whole words or phrases
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(normalizedText)) {
      // Preserve original casing from skill library
      skills.add(keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    }
  }
  
  return Array.from(skills);
}

/**
 * Extract work experience from resume text
 */
function extractExperience(text: string, normalizedText: string): { years: number; positions: Array<{ title: string; company: string; duration?: string }> } {
  const positions: Array<{ title: string; company: string; duration?: string }> = [];
  
  // Look for experience section
  const experienceSection = extractSection(text, ['experience', 'work history', 'employment', 'professional experience']);
  
  // Extract years of experience
  const yearsMatch = normalizedText.match(/(\d+)\+?\s*(years?|yrs?)\s*(of\s*)?(experience|exp)/i);
  const extractedYears = yearsMatch ? parseInt(yearsMatch[1]) : 0;
  
  // Try to extract job titles (common patterns)
  const jobTitlePatterns = [
    /(?:senior|junior|lead|principal)?\s*(?:software|web|mobile|full[\s-]?stack|front[\s-]?end|back[\s-]?end)?\s*(?:engineer|developer|architect|designer|manager|analyst)/gi,
    /(?:project|product|program)\s*manager/gi,
    /(?:data|business)\s*(?:analyst|scientist)/gi,
    /(?:ui|ux)\s*designer/gi
  ];
  
  const titles = new Set<string>();
  for (const pattern of jobTitlePatterns) {
    const matches = experienceSection.match(pattern);
    if (matches) {
      matches.forEach(match => titles.add(match.trim()));
    }
  }
  
  // Extract company names (pattern: "at CompanyName" or "- CompanyName")
  const companyPattern = /(?:at|@|—|-)\s+([A-Z][A-Za-z0-9\s&.,]+?)(?:\s+[-–—]|\s+\(|\s*\n|$)/g;
  const companies: string[] = [];
  let companyMatch;
  while ((companyMatch = companyPattern.exec(experienceSection)) !== null) {
    const company = companyMatch[1].trim();
    if (company.length > 2 && company.length < 50) {
      companies.push(company);
    }
  }
  
  // Combine titles and companies
  const titleArray = Array.from(titles);
  
  for (let i = 0; i < Math.max(titleArray.length, companies.length); i++) {
    if (titleArray[i] || companies[i]) {
      positions.push({
        title: titleArray[i] || 'Position',
        company: companies[i] || 'Company',
        duration: undefined
      });
    }
  }
  
  // Calculate years from date ranges if not explicitly stated
  const dateRanges = experienceSection.match(/\d{4}\s*[-–—]\s*(?:\d{4}|present|current)/gi);
  if (!extractedYears && dateRanges) {
    let totalYears = 0;
    dateRanges.forEach(range => {
      const parts = range.match(/(\d{4})\s*[-–—]\s*(\d{4}|present|current)/i);
      if (parts) {
        const startYear = parseInt(parts[1]);
        const endYear = parts[2].match(/\d{4}/) ? parseInt(parts[2]) : new Date().getFullYear();
        totalYears += (endYear - startYear);
      }
    });
    return { years: totalYears, positions };
  }
  
  return {
    years: extractedYears,
    positions: positions.slice(0, 10) // Limit to 10 positions
  };
}

/**
 * Extract education from resume text
 */
function extractEducation(text: string, _normalizedText: string): Array<{ degree: string; institution: string; year?: string }> {
  const education: Array<{ degree: string; institution: string; year?: string }> = [];
  
  // Look for education section
  const educationSection = extractSection(text, ['education', 'academic background', 'qualifications', 'academic history']);
  
  // Degree patterns
  const degreePatterns = [
    /(?:bachelor|b\.?s\.?|b\.?a\.?|ba|bs)\s*(?:of|in|degree)?\s*([a-z\s]+)/gi,
    /(?:master|m\.?s\.?|m\.?a\.?|ma|ms|mba)\s*(?:of|in|degree)?\s*([a-z\s]+)/gi,
    /(?:phd|ph\.?d\.?|doctorate)\s*(?:of|in)?\s*([a-z\s]+)/gi,
    /(?:associate|diploma|certificate)\s*(?:of|in)?\s*([a-z\s]+)/gi
  ];
  
  const degrees = new Set<string>();
  for (const pattern of degreePatterns) {
    const matches = educationSection.match(pattern);
    if (matches) {
      matches.forEach(match => degrees.add(match.trim()));
    }
  }
  
  // University/Institution patterns
  const institutionPattern = /(?:university|college|institute|school)\s+(?:of\s+)?([A-Z][A-Za-z\s&]+)/gi;
  const institutions: string[] = [];
  let instMatch;
  while ((instMatch = institutionPattern.exec(educationSection)) !== null) {
    const inst = instMatch[0].trim();
    if (inst.length > 5 && inst.length < 80) {
      institutions.push(inst);
    }
  }
  
  // Graduation years
  const yearPattern = /(?:graduated|class of|'|\b)(\d{4})\b/gi;
  const years: string[] = [];
  let yearMatch;
  while ((yearMatch = yearPattern.exec(educationSection)) !== null) {
    const year = yearMatch[1];
    const yearNum = parseInt(year);
    if (yearNum >= 1960 && yearNum <= new Date().getFullYear() + 5) {
      years.push(year);
    }
  }
  
  // Combine degrees, institutions, and years
  const degreeArray = Array.from(degrees);
  const maxEducation = Math.max(degreeArray.length, institutions.length);
  
  for (let i = 0; i < maxEducation; i++) {
    education.push({
      degree: degreeArray[i] || 'Degree',
      institution: institutions[i] || 'Institution',
      year: years[i]
    });
  }
  
  return education.slice(0, 5); // Limit to 5 education entries
}

/**
 * Extract contact information
 */
function extractContact(text: string): { email?: string; phone?: string } {
  const contact: { email?: string; phone?: string } = {};
  
  // Email pattern
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    contact.email = emailMatch[0];
  }
  
  // Phone pattern (international and local)
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    contact.phone = phoneMatch[0];
  }
  
  return contact;
}

/**
 * Extract section from resume text based on headers
 */
function extractSection(text: string, headers: string[]): string {
  const normalizedText = text.toLowerCase();
  let sectionStart = -1;
  let headerFound = '';
  
  // Find section start
  for (const header of headers) {
    const headerPattern = new RegExp(`\\b${header}\\b`, 'i');
    const match = normalizedText.search(headerPattern);
    if (match !== -1 && (sectionStart === -1 || match < sectionStart)) {
      sectionStart = match;
      headerFound = header;
    }
  }
  
  if (sectionStart === -1) {
    return text; // Section not found, return full text
  }
  
  // Find next major section (common headers)
  const nextSectionHeaders = ['experience', 'education', 'skills', 'projects', 'certifications', 'awards', 'references', 'interests'];
  let sectionEnd = text.length;
  
  for (const nextHeader of nextSectionHeaders) {
    if (nextHeader === headerFound) continue;
    const nextPattern = new RegExp(`\\n\\s*${nextHeader}\\s*\\n`, 'i');
    const match = normalizedText.substring(sectionStart + headerFound.length).search(nextPattern);
    if (match !== -1) {
      const absoluteMatch = sectionStart + headerFound.length + match;
      if (absoluteMatch < sectionEnd) {
        sectionEnd = absoluteMatch;
      }
    }
  }
  
  return text.substring(sectionStart, sectionEnd);
}

/**
 * Calculate application score based on parsed resume and job requirements
 */
export function calculateApplicationScore(
  parsedResume: ParsedResume,
  jobRequirements: {
    requiredSkills: string[];
    minYears: number;
    preferredDegree?: string;
  },
  weights: {
    skills: number;
    experience: number;
    education: number;
    culture: number;
  } = { skills: 0.6, experience: 0.3, education: 0.05, culture: 0.05 }
): number {
  // Skills score
  let skillScore = 0;
  if (jobRequirements.requiredSkills.length > 0) {
    const resumeSkills = parsedResume.skills.map(s => s.toLowerCase());
    const requiredSkills = jobRequirements.requiredSkills.map(s => s.toLowerCase());
    const matchedSkills = requiredSkills.filter(req => 
      resumeSkills.some(res => res.includes(req) || req.includes(res))
    );
    skillScore = matchedSkills.length / requiredSkills.length;
  } else {
    skillScore = parsedResume.skills.length > 0 ? 0.8 : 0.5;
  }
  
  // Experience score
  let experienceScore = 0;
  if (jobRequirements.minYears > 0) {
    const yearsRatio = parsedResume.experience.years / jobRequirements.minYears;
    experienceScore = Math.min(yearsRatio, 1.2) / 1.2; // Cap at 120% to reward extra experience
  } else {
    experienceScore = parsedResume.experience.years > 0 ? 0.8 : 0.5;
  }
  
  // Education score
  const educationScore = parsedResume.education.length > 0 ? 0.8 : 0.5;
  
  // Culture/other score (placeholder - could be enhanced with assessment data)
  const cultureScore = 0.7;
  
  // Weighted total
  const totalScore = 
    skillScore * weights.skills +
    experienceScore * weights.experience +
    educationScore * weights.education +
    cultureScore * weights.culture;
  
  return Math.round(totalScore * 100); // Return as percentage
}

export type { ParsedResume };
