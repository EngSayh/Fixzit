import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import { connectMongo } from '@/src/lib/mongo';
=======
import { connectDb } from '@/src/lib/mongo';
>>>>>>> acecb620d9e960f6cc5af0795616effb28211e7b
import { Job } from '@/src/server/models/Job';
import { Candidate } from '@/src/server/models/Candidate';
import { Application } from '@/src/server/models/Application';
import { AtsSettings } from '@/src/server/models/AtsSettings';
import { scoreApplication, extractSkillsFromText, calculateExperienceFromText } from '@/src/lib/ats/scoring';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
<<<<<<< HEAD
    // Check if ATS module is enabled
    if (process.env.ATS_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'ATS job application endpoint not available in this deployment' }, { status: 501 });
    }

    await connectMongo();
=======
    await connectDb();
>>>>>>> acecb620d9e960f6cc5af0795616effb28211e7b
    
    const formData = await req.formData();
    
    // Extract form fields
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
    
    // Derive first/last from fullName if not provided
    if ((!firstName || !lastName) && fullName) {
      const parts = fullName.trim().split(/\s+/);
      const f = parts.shift() || '';
      const l = parts.join(' ') || 'NA';
      firstName = firstName || f;
      lastName = lastName || l;
    }

    // Validate required fields (ensure at least firstName/email/phone)
    if (!firstName || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'Required fields missing' },
        { status: 400 }
      );
    }
    
    // Get the job
    const job = await Job.findById(params.id);
    
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
    
    // Process resume file (save to public/uploads/resumes)
    let resumeUrl = '';
    let resumeText = '';
    
    if (resumeFile) {
      try {
        const bytes = await resumeFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes');
        await fs.mkdir(uploadDir, { recursive: true });
        const safeName = resumeFile.name.replace(/[^\w.\-]+/g, '_');
        const fileName = `${Date.now()}-${safeName}`;
        const filePath = path.join(uploadDir, fileName);
        await fs.writeFile(filePath, buffer);
        resumeUrl = `/uploads/resumes/${fileName}`;
      } catch (err) {
        console.error('Resume save failed:', err);
      }
      
      // Basic text surrogate for scoring/search
      resumeText = `${firstName || ''} ${lastName || ''} ${email} ${phone} ${skills || ''} ${coverLetter || ''}`.trim();
    }
    
    // Parse skills
    const candidateSkills = skills ? 
      skills.split(',').map(s => s.trim()).filter(Boolean) : 
      extractSkillsFromText(resumeText + ' ' + coverLetter);
    
    // Parse experience
    const yearsOfExperience = experience 
      ? (Number.isFinite(parseInt(experience, 10)) ? parseInt(experience, 10) : 0)
      : calculateExperienceFromText(resumeText + ' ' + coverLetter);
    
    // Get ATS settings
    const atsSettings = await (AtsSettings as any).findOrCreateForOrg(job.orgId);
    
    // Check for existing candidate
    let candidate = await (Candidate as any).findByEmail(job.orgId, email);
    
    if (!candidate) {
      // Create new candidate
      candidate = await Candidate.create({
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
      // Update existing candidate info
      candidate.skills = [...new Set([...candidate.skills, ...candidateSkills])];
      if (resumeUrl) candidate.resumeUrl = resumeUrl;
      if (resumeText) candidate.resumeText = resumeText;
      if (linkedin) candidate.linkedin = linkedin;
      await candidate.save();
    }
    
    // Check for duplicate application
    const existingApplication = await Application.findOne({
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
    
    // Score the application
    const scoringCriteria = atsSettings?.scoringCriteria || { experience: 30, skills: 40, education: 10, keywords: 10, location: 10 };
    const score = scoreApplication(
      {
        resume: resumeText,
        coverLetter: coverLetter || '',
        location: location || ''
      },
      {
        requiredExperience: job.screeningRules?.minExperience ?? 0,
        requiredSkills: Array.isArray(job.skills) ? job.skills : [],
        preferredEducation: Array.isArray((job as any).education) ? (job as any).education : [],
        keywords: Array.isArray((job as any).keywords) ? (job as any).keywords : (Array.isArray(job.skills) ? job.skills : []),
        location: job.location || ''
      },
      scoringCriteria
    );
    
    // Check knockout rules
    const knockoutCheck = atsSettings.shouldAutoReject({
      experience: yearsOfExperience,
      skills: candidateSkills,
      score: score
    });
    
    // Create application
    const application = await Application.create({
      orgId: job.orgId,
      jobId: job._id,
      candidateId: candidate._id,
      stage: knockoutCheck.shouldReject ? 'rejected' : 'applied',
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
        details: knockoutCheck.shouldReject ? knockoutCheck.reason : undefined
      }]
    });
    
    // Update job application count
    await Job.findByIdAndUpdate(job._id, { $inc: { applicationCount: 1 } });
    
    return NextResponse.json({ 
      success: true,
      data: {
        applicationId: application._id,
        status: application.stage,
        score,
        message: knockoutCheck.shouldReject ? 
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


