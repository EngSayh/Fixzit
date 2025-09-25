import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (process.env.ATS_ENABLED !== 'true') {
      return NextResponse.json(
        { success: false, error: 'ATS job application endpoint not available in this deployment' },
        { status: 501 }
      );
    }

    const { db } = await import('@/src/lib/mongo');
    await (db as any)();

    const JobMod = await import('@/src/server/models/Job').catch(() => null);
    const CandidateMod = await import('@/src/server/models/Candidate').catch(() => null);
    const ApplicationMod = await import('@/src/server/models/Application').catch(() => null);
    const AtsSettingsMod = await import('@/src/server/models/AtsSettings').catch(() => null);
    const scoringMod = await import('@/src/lib/ats/scoring').catch(() => null);

    const Job = JobMod && (JobMod as any).Job;
    const Candidate = CandidateMod && (CandidateMod as any).Candidate;
    const Application = ApplicationMod && (ApplicationMod as any).Application;
    const AtsSettings = AtsSettingsMod && (AtsSettingsMod as any).AtsSettings;
    const scoreApplication = scoringMod && (scoringMod as any).scoreApplication;
    const extractSkillsFromText = scoringMod && (scoringMod as any).extractSkillsFromText;
    const calculateExperienceFromText = scoringMod && (scoringMod as any).calculateExperienceFromText;

    if (!Job || !Candidate || !Application || !AtsSettings || !scoreApplication) {
      return NextResponse.json(
        { success: false, error: 'ATS dependencies are not available in this deployment' },
        { status: 501 }
      );
    }

    const formData = await req.formData();

    let firstName = formData.get('firstName') as string | null;
    let lastName = formData.get('lastName') as string | null;
    const fullName = formData.get('fullName') as string | null;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const location = formData.get('location') as string;
    const coverLetter = formData.get('coverLetter') as string;
    const skills = formData.get('skills') as string;
    const experience = formData.get('experience') as string;
    const linkedin = formData.get('linkedin') as string;
    const resumeFile = formData.get('resume') as File;

    if ((!firstName || !lastName) && fullName) {
      const parts = fullName.trim().split(/\s+/);
      const f = parts.shift() || '';
      const l = parts.join(' ') || 'NA';
      firstName = firstName || f;
      lastName = lastName || l;
    }

    if (!firstName || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'Required fields missing' },
        { status: 400 }
      );
    }

    const job = await (Job as any).findById(params.id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }
    if (job.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Job is not accepting applications' },
        { status: 400 }
      );
    }

    let resumeUrl = '';
    let resumeText = '';
    if (resumeFile) {
      try {
        // Basic validation (MIME/size) before accepting the file
        const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxBytes = 5 * 1024 * 1024; // 5MB
        const mime = (resumeFile as any).type || '';
        const size = (resumeFile as any).size || 0;
        if (!allowed.includes(mime) || size > maxBytes) {
          return NextResponse.json({ success: false, error: 'Unsupported file type or size' }, { status: 400 });
        }
        // TODO: Replace with tenant-scoped, pre-signed object storage (e.g., S3) per governance
        const fsMod = await import('fs');
        const fs = fsMod.promises;
        const pathMod = await import('path');
        const path = pathMod.default || (pathMod as any);
        const bytes = await (resumeFile as any).arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), 'uploads', 'resumes'); // non-public path
        await fs.mkdir(uploadDir, { recursive: true });
        const safeName = (resumeFile as any).name.replace(/[^\w.\-]+/g, '_');
        const fileName = `${Date.now()}-${safeName}`;
        const filePath = path.join(uploadDir, fileName);
        await fs.writeFile(filePath, buffer);
        // Store only a non-public reference; retrieval must be authorized via a separate signed URL endpoint
        resumeUrl = `/api/files/resumes/${fileName}`;
      } catch (err) {
        console.error('Resume save failed:', err);
      }
      resumeText = `${firstName || ''} ${lastName || ''} ${email} ${phone} ${skills || ''} ${coverLetter || ''}`.trim();
    }

    const candidateSkills = skills ? 
      (skills as string).split(',').map(s => s.trim()).filter(Boolean) : 
      extractSkillsFromText(resumeText + ' ' + coverLetter);

    const yearsOfExperience = experience ? 
      parseInt(experience as string) : 
      calculateExperienceFromText(resumeText + ' ' + coverLetter);

    const atsSettings = await (AtsSettings as any).findOrCreateForOrg(job.orgId);

    let candidate = await (Candidate as any).findByEmail(job.orgId, email);
    if (!candidate) {
      candidate = await (Candidate as any).create({
        orgId: job.orgId,
        firstName: firstName!,
        lastName: lastName || 'NA',
        email,
        phone,
        location,
        linkedin,
        skills: candidateSkills,
        experience: yearsOfExperience,
        resumeUrl,
        resumeText,
        source: 'careers',
        consents: {
          privacy: true,
          contact: true,
          dataRetention: true
        }
      });
    } else {
      candidate.skills = [...new Set([...(candidate.skills || []), ...candidateSkills])];
      if (resumeUrl) candidate.resumeUrl = resumeUrl;
      if (resumeText) candidate.resumeText = resumeText;
      if (linkedin) candidate.linkedin = linkedin;
      await candidate.save();
    }

    const existingApplication = await (Application as any).findOne({
      orgId: job.orgId,
      jobId: job._id,
      candidateId: candidate._id
    });
    if (existingApplication) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'You have already applied for this position',
          applicationId: existingApplication._id
        },
        { status: 400 }
      );
    }

    const score = scoreApplication({
      skills: candidateSkills,
      requiredSkills: job.skills,
      experience: yearsOfExperience,
      minExperience: job.screeningRules?.minYears
    }, (atsSettings as any)?.scoringWeights || undefined);
    
    // Check knockout rules
    const knockoutCheck = atsSettings.shouldAutoReject({
      experience: yearsOfExperience,
      skills: candidateSkills
    });

    const application = await (Application as any).create({
      orgId: job.orgId,
      jobId: job._id,
      candidateId: candidate._id,
      stage: knockoutCheck.reject ? 'rejected' : 'applied',
      score,
      source: 'careers',
      candidateSnapshot: {
        fullName: `${firstName} ${lastName || ''}`.trim(),
        email,
        phone,
        location,
        skills: candidateSkills,
        experience: yearsOfExperience,
        resumeUrl
      },
      coverLetter,
      history: [{
        action: 'applied',
        by: 'candidate',
        at: new Date(),
        details: knockoutCheck.reject ? knockoutCheck.reason : undefined
      }]
    });

    await (Job as any).findByIdAndUpdate(job._id, { $inc: { applicationCount: 1 } });

    return NextResponse.json({ 
      success: true,
      data: {
        applicationId: application._id,
        status: application.stage,
        score,
        message: knockoutCheck.reject ? 
          'Your application has been received but does not meet the minimum requirements.' :
          'Your application has been successfully submitted!'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Job application error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}


