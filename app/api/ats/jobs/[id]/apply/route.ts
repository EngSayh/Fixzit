import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';
import { Candidate } from '@/src/server/models/Candidate';
import { Application } from '@/src/server/models/Application';
import { AtsSettings } from '@/src/server/models/AtsSettings';
import { scoreApplication, extractSkillsFromText, calculateExperienceFromText } from '@/src/lib/ats/scoring';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db;
    
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
    
    // Process resume file (secure private storage with validation)
    let resumeUrl = '';
    let resumeText = '';
    
    if (resumeFile) {
      try {
        // Validate file type and size BEFORE processing
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        const maxSize = 5 * 1024 * 1024; // 5MB limit
        
        if (!allowedTypes.includes(resumeFile.type)) {
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid file type. Only PDF and Word documents are allowed.' 
          }, { status: 400 });
        }
        
        if (resumeFile.size > maxSize) {
          return NextResponse.json({ 
            success: false, 
            error: 'File too large. Maximum size is 5MB.' 
          }, { status: 400 });
        }
        
        const bytes = await resumeFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Magic byte validation for additional security
        const isValidPDF = buffer.slice(0, 4).toString() === '%PDF';
        const isValidDOC = buffer.slice(0, 4).equals(Buffer.from([0xD0, 0xCF, 0x11, 0xE0]));
        const isValidDOCX = buffer.slice(0, 4).equals(Buffer.from([0x50, 0x4B, 0x03, 0x04]));
        
        if (resumeFile.type === 'application/pdf' && !isValidPDF) {
          return NextResponse.json({ success: false, error: 'Invalid PDF file' }, { status: 400 });
        }
        
        // Use PRIVATE storage directory with tenant isolation using job's orgId
        const uploadDir = path.join(process.cwd(), 'private', 'uploads', 'resumes', job.orgId || 'default');
        await fs.mkdir(uploadDir, { recursive: true });
<<<<<<< HEAD
        const safeName = resumeFile.name.replace(/[^\w.-]+/g, '_');
        const fileName = `${Date.now()}-${safeName}`;
=======
        
        // Use cryptographically secure filename
        const fileExt = resumeFile.name.split('.').pop()?.toLowerCase() || 'pdf';
        const safeExt = fileExt.replace(/[^a-z0-9]/g, '');
        const fileName = `${crypto.randomUUID()}.${safeExt}`;
>>>>>>> origin/main
        const filePath = path.join(uploadDir, fileName);
        
        await fs.writeFile(filePath, buffer);
        
        // Generate signed URL for private file access
        resumeUrl = `/api/files/resumes/${fileName}?tenant=${job.orgId || 'default'}`;
      } catch (err) {
        console.error('Resume save failed:', err);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to process resume file' 
        }, { status: 500 });
      }
      
      // Basic text surrogate for scoring/search
      resumeText = `${firstName || ''} ${lastName || ''} ${email} ${phone} ${skills || ''} ${coverLetter || ''}`.trim();
    }
    
    // Parse skills
    const candidateSkills = skills ? 
      skills.split(',').map(s => s.trim()).filter(Boolean) : 
      extractSkillsFromText(resumeText + ' ' + coverLetter);
    
    // Parse experience
    const yearsOfExperience = experience ? 
      parseInt(experience) : 
      calculateExperienceFromText(resumeText + ' ' + coverLetter);
    
    // Get ATS settings
    const atsSettings = await AtsSettings.findOrCreateForOrg(job.orgId);
    
    // Check for existing candidate
    let candidate = await Candidate.findByEmail(job.orgId, email);
    
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
      candidate.skills = [...new Set([...(candidate.skills || []), ...candidateSkills])];
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
    const score = scoreApplication({
      skills: candidateSkills,
      requiredSkills: job.skills,
      experience: yearsOfExperience,
      minExperience: job.screeningRules?.minYears
    }, atsSettings?.scoringWeights || undefined);
    
    // Check knockout rules
    const knockoutCheck = atsSettings.shouldAutoReject({
      experience: yearsOfExperience,
      skills: candidateSkills
    });
    
    // Create application
    const application = await Application.create({
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
    
    // Update job application count
    await Job.findByIdAndUpdate(job._id, { $inc: { applicationCount: 1 } });
    
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


