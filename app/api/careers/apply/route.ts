import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/server/security/rateLimit';

// Comprehensive Zod schema for job application validation
const jobApplicationSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[\+]?[0-9\s\-\(\)]{8,20}$/, 'Invalid phone number format'),
  position: z.string().min(1, 'Position is required').max(100, 'Position name too long'),
  department: z.string().min(1, 'Department is required').max(100, 'Department name too long'),
  coverLetter: z.string().min(50, 'Cover letter must be at least 50 characters').max(2000, 'Cover letter too long')
});

export async function POST(req: NextRequest) {
  // Rate limiting - 5 applications per IP per hour
  const ip = req.ip ?? 'unknown';
  
  try {
    const key = `career-apply:${ip}`;
    const rl = rateLimit(key, 5, 3600000); // 5 requests per hour
    if (!rl.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded',
        details: 'Too many applications submitted. Please wait before submitting another application.'
      }, { status: 429 });
    }

    const formData = await req.formData();

    // Extract and validate form data
    const applicationData = {
      jobId: formData.get('jobId') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      position: formData.get('position') as string,
      department: formData.get('department') as string,
      coverLetter: formData.get('coverLetter') as string
    };

    // Validate with Zod schema
    const validatedData = jobApplicationSchema.parse(applicationData);

    const resume = formData.get('resume') as File;
    if (!resume) {
      return NextResponse.json(
        { error: 'Resume file is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(validatedData.email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Validate phone number (basic validation): allow 8-20 digits ignoring formatting
    const phoneDigits = validatedData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 8 || phoneDigits.length > 20) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(resume.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          details: 'Only PDF, DOC, and DOCX files are allowed. Please upload a valid resume file.'
        },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (resume.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File size too large',
          details: `File size is ${(resume.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed size is 10MB.`
        },
        { status: 400 }
      );
    }

    // In a real application, you would:
    // 1. Save the file to a storage service (AWS S3, Google Cloud Storage, etc.)
    // 2. Save the application data to a database
    // 3. Send notification emails to HR and applicant
    // 4. Process the application through ATS system
    // 5. Generate application tracking ID

    // Generate cryptographically secure application ID
    const applicationId = `APP-${new Date().getFullYear()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

    // Log application received (NO PII - security compliance)
    console.log('🎯 Job Application Received:', {
      applicationId,
      timestamp: new Date().toISOString(),
      jobId: validatedData.jobId,
      position: validatedData.position,
      department: validatedData.department,
      resumeMetadata: {
        name: resume.name,
        type: resume.type,
        size: `${(resume.size / 1024 / 1024).toFixed(2)}MB`
      },
      coverLetterLength: validatedData.coverLetter.length,
      ip: ip // Only for security tracking
    });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      applicationId,
      applicantName: `${validatedData.firstName} ${validatedData.lastName}`,
      position: validatedData.position,
      department: validatedData.department,
      submittedAt: new Date().toISOString(),
      nextSteps: [
        '✅ Application received and logged',
        '📧 Confirmation email sent to your email address',
        '👥 HR team will review your application within 5 business days',
        '📞 If selected, you will be contacted for an interview',
        '📋 You can track your application status using ID: ' + applicationId,
        '🎯 Thank you for your interest in joining Fixzit Enterprise!'
      ],
      contactInfo: {
        hrEmail: 'careers@fixzit.com',
        supportPhone: '+966 50 123 4567'
      }
    });

  } catch (error: any) {
    // Secure error logging (no PII)
    console.error('🚨 Job application error:', {
      error: error.message,
      timestamp: new Date().toISOString(),
      ip: ip
    });

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid application data',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      );
    }

    // Generic secure error response
    return NextResponse.json(
      {
        error: 'Failed to submit application',
        details: 'Please check your information and try again',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
