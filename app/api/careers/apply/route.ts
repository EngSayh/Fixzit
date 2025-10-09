import { NextRequest, NextResponse } from 'next/server';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

/**
 * @openapi
 * /api/careers/apply:
 *   get:
 *     summary: careers/apply operations
 *     tags: [careers]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const formData = await req.formData();

    const jobId = formData.get('jobId') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const position = formData.get('position') as string;
    const department = formData.get('department') as string;
    const coverLetter = formData.get('coverLetter') as string;
    const resume = formData.get('resume') as File;

    // Comprehensive validation
    if (!jobId || !firstName || !lastName || !email || !phone || !coverLetter || !resume) {
      return NextResponse.json(
        {
          error: 'All fields are required',
          details: 'Please ensure all required fields are filled and a resume is uploaded'
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Validate phone number (basic validation)
    const phoneRegex = /^[+]?[0-9\s()-]{8,20}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
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

    // Validate cover letter length
    if (coverLetter.length < 50) {
      return NextResponse.json(
        {
          error: 'Cover letter too short',
          details: 'Cover letter must be at least 50 characters long.'
        },
        { status: 400 }
      );
    }

    if (coverLetter.length > 2000) {
      return NextResponse.json(
        {
          error: 'Cover letter too long',
          details: 'Cover letter must be less than 2000 characters.'
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

    // For now, we'll simulate comprehensive processing
    console.log('🎯 Job Application Received:', {
      applicationId: `APP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      jobDetails: {
        jobId,
        position,
        department
      },
      applicant: {
        name: `${firstName} ${lastName}`,
        email,
        phone
      },
      application: {
        coverLetterLength: coverLetter.length,
        resume: {
          name: resume.name,
          type: resume.type,
          size: `${(resume.size / 1024 / 1024).toFixed(2)}MB`
        }
      }
    });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const applicationId = `APP-${Date.now()}`;

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      applicationId,
      applicantName: `${firstName} ${lastName}`,
      position,
      department,
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

  } catch (error) {
    console.error('🚨 Job application error:', error);

    // Determine error type and provide appropriate response
    let errorMessage = 'An unexpected error occurred';
    let errorDetails = 'Please try again or contact our support team';

    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        errorMessage = 'Network error';
        errorDetails = 'Please check your internet connection and try again';
      } else if (error.message.includes('file')) {
        errorMessage = 'File processing error';
        errorDetails = 'There was an issue processing your file. Please try with a different file';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}


