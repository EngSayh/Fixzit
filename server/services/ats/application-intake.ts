import path from 'path';
import { promises as fs } from 'fs';
import { Types } from 'mongoose';
import { Candidate } from '@/server/models/Candidate';
import { Application } from '@/server/models/Application';
import { AtsSettings } from '@/server/models/AtsSettings';
import { Job } from '@/server/models/Job';
import { parseResumePDF } from '@/lib/ats/resume-parser';
import { scoreApplication, extractSkillsFromText, calculateExperienceFromText } from '@/lib/ats/scoring';
import { logger } from '@/lib/logger';

export interface ResumeFileInput {
  buffer: Buffer;
  filename: string;
  mimeType?: string;
  size?: number;
}

export interface ApplicationFields {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  coverLetter?: string;
  skills?: string[];
  experience?: number;
  linkedin?: string;
  consent?: boolean;
}

const ALLOWED_RESUME_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_RESUME_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface ApplicationSubmissionParams {
  job: any;
  fields: ApplicationFields;
  resumeFile?: ResumeFileInput;
  source: string;
}

export class ApplicationSubmissionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function submitApplicationFromForm(
  params: ApplicationSubmissionParams
): Promise<{ applicationId: string; stage: string; score: number }> {
  const { job, resumeFile, source } = params;
  const orgId = normalizeOrgId(job?.orgId);

  if (!job?._id || !orgId) {
    throw new ApplicationSubmissionError('Job not found', 404);
  }

  if (source === 'careers') {
    if (job.status !== 'published') {
      throw new ApplicationSubmissionError('Job is not accepting applications at this time', 400);
    }
    if (job.visibility === 'internal') {
      throw new ApplicationSubmissionError('This job is not open to public applications', 403);
    }
  }

  const { fields } = params;
  const resumeDetails = await extractResumeDetails(resumeFile);
  const email = (fields.email || resumeDetails.contactEmail || '').trim();
  if (!email) {
    throw new ApplicationSubmissionError('Email address is required', 400);
  }

  let firstName = (fields.firstName || '').trim();
  let lastName = (fields.lastName || '').trim();
  const derivedFullName = (fields.fullName || '').trim();

  if (!firstName || !lastName) {
    const parts = (derivedFullName || email).split(/\s+/).filter(Boolean);
    if (!firstName && parts.length) {
      firstName = parts.shift() || 'Candidate';
    }
    if (!lastName) {
      lastName = parts.join(' ') || 'Applicant';
    }
  }

  if (!firstName) firstName = 'Candidate';
  if (!lastName) lastName = 'Applicant';

  const phone = (fields.phone || resumeDetails.contactPhone || '').trim();
  const location = (fields.location || '').trim();
  const linkedin = (fields.linkedin || '').trim();
  const coverLetter = (fields.coverLetter || '').trim();

  const skillsFromForm = Array.isArray(fields.skills) ? fields.skills : [];
  const mergedSkills = new Set<string>();
  skillsFromForm.forEach((skill) => {
    if (skill) mergedSkills.add(skill.trim());
  });
  resumeDetails.skills.forEach((skill) => mergedSkills.add(skill));
  extractSkillsFromText(`${resumeDetails.rawText} ${coverLetter}`).forEach((skill) => mergedSkills.add(skill));

  const experienceYears =
    typeof fields.experience === 'number'
      ? fields.experience
      : resumeDetails.experienceYears > 0
        ? resumeDetails.experienceYears
        : calculateExperienceFromText(`${resumeDetails.rawText} ${coverLetter}`);

  let candidate = await Candidate.findByEmail(orgId, email);

  if (!candidate) {
    candidate = await (Candidate as any).create({
      orgId,
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      location: location || undefined,
      linkedin: linkedin || undefined,
      skills: Array.from(mergedSkills),
      experience: experienceYears,
      resumeUrl: resumeDetails.resumeUrl,
      resumeText: resumeDetails.rawText,
      source,
      consents: {
        privacy: fields.consent ?? true,
        contact: true,
        dataRetention: true,
      },
    });
  } else {
    const merged = new Set([...candidate.skills, ...mergedSkills]);
    candidate.firstName = firstName || candidate.firstName;
    candidate.lastName = lastName || candidate.lastName;
    candidate.phone = phone || candidate.phone;
    candidate.location = location || candidate.location;
    candidate.linkedin = linkedin || candidate.linkedin;
    candidate.experience = Number.isFinite(experienceYears) ? experienceYears : candidate.experience;
    candidate.skills = Array.from(merged);
    if (resumeDetails.resumeUrl) {
      candidate.resumeUrl = resumeDetails.resumeUrl;
    }
    if (resumeDetails.rawText) {
      candidate.resumeText = resumeDetails.rawText;
    }
    await candidate.save();
  }

  if (!candidate) {
    throw new ApplicationSubmissionError('Unable to create candidate profile', 500);
  }

  const existingApplication = await Application.findOne({
    orgId,
    jobId: job._id,
    candidateId: candidate._id,
  });

  if (existingApplication) {
    throw new ApplicationSubmissionError('You have already applied for this position', 400);
  }

  const atsSettings = await AtsSettings.findOrCreateForOrg(orgId);
  const jobSkills: string[] = Array.isArray(job.skills) ? job.skills : [];
  const requiredSkills = jobSkills.length ? jobSkills : Array.isArray(job.requirements) ? job.requirements : [];
  const score = scoreApplication(
    {
      skills: Array.from(mergedSkills),
      requiredSkills,
      experience: experienceYears,
      minExperience: job.screeningRules?.minYears,
    },
    atsSettings.scoringWeights || undefined
  );

  const knockoutCheck = atsSettings.shouldAutoReject({
    experience: experienceYears,
    skills: Array.from(mergedSkills),
  });

  let stage: string = 'applied';
  if (knockoutCheck.reject) {
    stage = 'rejected';
  } else if (score >= 70) {
    stage = 'screening';
  }

  const application = await (Application as any).create({
    orgId,
    jobId: job._id,
    candidateId: candidate._id,
    stage,
    score,
    source,
    coverLetter,
    candidateSnapshot: {
      fullName: `${candidate.firstName} ${candidate.lastName}`.trim(),
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      skills: candidate.skills,
      experience: candidate.experience,
      resumeUrl: candidate.resumeUrl,
    },
    history: [
      {
        action: 'applied',
        by: 'candidate',
        at: new Date(),
        details: knockoutCheck.reason,
      },
    ],
  });

  await Job.findByIdAndUpdate(job._id, { $inc: { applicationCount: 1 } }).catch((error) => {
    logger.warn('Failed to increment application count', { error });
  });

  return {
    applicationId: application._id.toString(),
    stage: application.stage,
    score: application.score,
  };
}

async function extractResumeDetails(resumeFile?: ResumeFileInput): Promise<{
  resumeUrl?: string;
  skills: string[];
  contactEmail?: string;
  contactPhone?: string;
  experienceYears: number;
  rawText: string;
}> {
  if (!resumeFile?.buffer || resumeFile.buffer.length === 0) {
    return { skills: [], experienceYears: 0, rawText: '' };
  }

  ensureValidResumeFile(resumeFile);

  let resumeUrl: string | undefined;
  try {
    resumeUrl = await persistResumeFile(resumeFile);
  } catch (error) {
    logger.error('Failed to persist resume file', error as Error);
  }

  try {
    const parsed = await parseResumePDF(resumeFile.buffer);
    return {
      resumeUrl,
      skills: parsed.skills || [],
      contactEmail: parsed.contact?.email,
      contactPhone: parsed.contact?.phone,
      experienceYears: parsed.experience?.years ?? 0,
      rawText: parsed.rawText || '',
    };
  } catch (error) {
    logger.error('Resume parsing failed', error as Error);
    return { resumeUrl, skills: [], experienceYears: 0, rawText: '' };
  }
}

async function persistResumeFile(file: ResumeFileInput): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes');
  await fs.mkdir(uploadDir, { recursive: true });
  const safeName = file.filename.replace(/[^a-zA-Z0-9.\-]+/g, '_');
  const fileName = `${Date.now()}-${safeName}`;
  const filePath = path.join(uploadDir, fileName);
  await fs.writeFile(filePath, file.buffer);
  // TODO: replace with pre-signed S3 upload flow once storage service is ready
  return `/uploads/resumes/${fileName}`;
}

function normalizeOrgId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Types.ObjectId) return value.toHexString();
  if (typeof value === 'object' && '_id' in (value as Types.ObjectId)) {
    try {
      return new Types.ObjectId((value as any)._id).toHexString();
    } catch {
      return null;
    }
  }
  return null;
}

function ensureValidResumeFile(file: ResumeFileInput) {
  if (file.size && file.size > MAX_RESUME_FILE_SIZE) {
    throw new ApplicationSubmissionError('Resume file exceeds 10MB limit', 400);
  }

  const mime = file.mimeType?.toLowerCase();
  if (mime && !ALLOWED_RESUME_MIME_TYPES.includes(mime)) {
    throw new ApplicationSubmissionError('Resume must be a PDF or Word document', 400);
  }
}
