import mongoose from 'mongoose';
import { Job } from '@/src/server/models/Job';
import { Candidate } from '@/src/server/models/Candidate';
import { Application } from '@/src/server/models/Application';
import { AtsSettings } from '@/src/server/models/AtsSettings';
import dotenv from 'dotenv';

dotenv.config();

const ORG_ID = process.env.SEED_ORG_ID || 'fixzit-platform';

async function seedAtsSettings() {
  console.log('🔧 Creating ATS settings...');
  
  const settings = await AtsSettings.findOrCreateForOrg(ORG_ID);
  
  // Update with default email templates
  settings.emailTemplates = {
    applicationReceived: `
Dear {{candidateName}},

Thank you for applying for the {{jobTitle}} position at Fixzit Enterprise.

We have received your application and it is currently under review. Our recruitment team will carefully evaluate your qualifications and experience.

Application ID: {{applicationId}}
Position: {{jobTitle}}
Department: {{department}}

Next Steps:
1. Application review (5-7 business days)
2. If selected, you will be contacted for an interview
3. Interview process may include multiple rounds
4. Final decision and offer (if applicable)

You can track your application status using the application ID above.

If you have any questions, please contact our HR team at careers@fixzit.com.

Best regards,
Fixzit Recruitment Team
    `.trim(),
    
    interviewInvitation: `
Dear {{candidateName}},

Congratulations! We are pleased to invite you for an interview for the {{jobTitle}} position.

Interview Details:
Date: {{interviewDate}}
Time: {{interviewTime}}
Duration: {{duration}} minutes
Type: {{interviewType}}
Location/Link: {{location}}

Interviewers:
{{interviewers}}

Please confirm your availability by replying to this email within 48 hours.

Preparation Tips:
- Review the job description and requirements
- Prepare examples of your relevant experience
- Research Fixzit Enterprise and our values
- Prepare questions about the role and company

If you need to reschedule, please contact us at least 24 hours in advance.

Best regards,
Fixzit Recruitment Team
    `.trim()
  };
  
  await settings.save();
  console.log('✅ ATS settings created');
}

async function seedJobs() {
  console.log('💼 Seeding jobs...');
  
  const jobs = [
    {
      orgId: ORG_ID,
      title: 'Senior Facility Manager',
      titleAr: 'مدير مرافق أول',
      department: 'Operations',
      jobType: 'full-time',
      location: {
        city: 'Riyadh',
        country: 'Saudi Arabia',
        mode: 'onsite'
      },
      salaryRange: {
        min: 15000,
        max: 25000,
        currency: 'SAR'
      },
      description: `
We are seeking an experienced Senior Facility Manager to oversee our commercial properties across Riyadh. 
The ideal candidate will have 5+ years of experience in facility management and will be responsible for 
ensuring optimal building operations, tenant satisfaction, and regulatory compliance.

Key Responsibilities:
- Oversee daily operations of multiple commercial properties
- Manage maintenance teams and contractors
- Ensure compliance with local regulations and safety standards
- Develop and manage budgets for facility operations
- Implement preventive maintenance programs
- Handle tenant relations and resolve issues promptly
- Coordinate with vendors and service providers
- Prepare reports on facility performance and KPIs
      `.trim(),
      requirements: [
        "Bachelor's degree in Engineering, Business Administration, or related field",
        "5+ years of experience in facility management",
        "Strong knowledge of building systems and maintenance",
        "Excellent leadership and communication skills",
        "Proficiency in English and Arabic",
        "Experience with property management software",
        "Knowledge of local building codes and regulations"
      ],
      benefits: [
        "Competitive salary package",
        "Health insurance coverage",
        "Annual performance bonus",
        "Professional development opportunities",
        "Company car allowance",
        "25 days annual leave"
      ],
      skills: ['Facility Management', 'Building Operations', 'Team Leadership', 'Budget Management', 'Vendor Relations'],
      experience: '5+ years',
      urgent: true,
      featured: true,
      status: 'published',
      publishedAt: new Date(),
      postedBy: 'system'
    },
    {
      orgId: ORG_ID,
      title: 'Property Maintenance Technician',
      titleAr: 'فني صيانة العقارات',
      department: 'Maintenance',
      jobType: 'full-time',
      location: {
        city: 'Jeddah',
        country: 'Saudi Arabia',
        mode: 'onsite'
      },
      salaryRange: {
        min: 8000,
        max: 12000,
        currency: 'SAR'
      },
      description: `
Join our maintenance team to ensure the optimal operation of our properties. You will be responsible 
for preventive maintenance, repairs, emergency response, and ensuring all building systems operate efficiently.

Key Responsibilities:
- Perform routine maintenance on HVAC, electrical, and plumbing systems
- Respond to emergency maintenance requests
- Conduct regular property inspections
- Maintain maintenance logs and reports
- Coordinate with external contractors when needed
- Ensure compliance with safety protocols
- Assist in implementing energy-saving initiatives
      `.trim(),
      requirements: [
        "Technical diploma or certification in electrical/mechanical systems",
        "3+ years of experience in building maintenance",
        "Knowledge of HVAC, electrical, and plumbing systems",
        "Valid driver's license",
        "Basic computer skills",
        "Ability to work flexible hours",
        "Safety certification preferred"
      ],
      benefits: [
        "Competitive salary",
        "Health and safety training",
        "Overtime opportunities",
        "Tool allowance",
        "Career advancement path",
        "21 days annual leave"
      ],
      skills: ['HVAC Systems', 'Electrical Maintenance', 'Plumbing', 'Preventive Maintenance', 'Emergency Response'],
      experience: '3+ years',
      status: 'published',
      publishedAt: new Date(),
      postedBy: 'system'
    },
    {
      orgId: ORG_ID,
      title: 'Procurement Officer',
      titleAr: 'مسؤول مشتريات',
      department: 'Procurement',
      jobType: 'full-time',
      location: {
        city: 'Riyadh',
        country: 'Saudi Arabia',
        mode: 'hybrid'
      },
      salaryRange: {
        min: 13000,
        max: 19000,
        currency: 'SAR'
      },
      description: `
Manage procurement activities for our properties including vendor selection, contract negotiation, 
and supplier relationship management. You will ensure cost-effective procurement of goods and services 
while maintaining quality standards.

Key Responsibilities:
- Source and evaluate suppliers for various goods and services
- Negotiate contracts and pricing agreements
- Manage purchase orders and delivery schedules
- Maintain vendor database and performance metrics
- Ensure compliance with procurement policies
- Analyze market trends and pricing
- Collaborate with various departments on procurement needs
- Prepare procurement reports and cost analysis
      `.trim(),
      requirements: [
        "Bachelor's degree in Business, Supply Chain, or related field",
        "3+ years of experience in procurement",
        "Strong negotiation skills",
        "Knowledge of procurement processes",
        "Experience with vendor management",
        "Proficiency in procurement software",
        "Analytical and decision-making skills"
      ],
      benefits: [
        "Procurement training",
        "Negotiation skill development",
        "Performance incentives",
        "Travel opportunities",
        "Professional certification support",
        "25 days annual leave"
      ],
      skills: ['Procurement Management', 'Vendor Relations', 'Contract Negotiation', 'Cost Analysis', 'Supply Chain Management'],
      experience: '3+ years',
      status: 'published',
      publishedAt: new Date(),
      postedBy: 'system',
      screeningRules: {
        minYears: 3,
        requiredSkills: ['procurement', 'negotiation', 'vendor management']
      }
    }
  ];
  
  for (const jobData of jobs) {
    const slug = jobData.title.toLowerCase().replace(/\s+/g, '-');
    
    const existingJob = await Job.findOne({ orgId: ORG_ID, slug });
    if (existingJob) {
      console.log(`  ⏭️  Job already exists: ${jobData.title}`);
      continue;
    }
    
    const job = await Job.create({
      ...jobData,
      slug
    });
    
    console.log(`  ✅ Created job: ${job.title}`);
  }
}

async function seedCandidates() {
  console.log('👥 Seeding candidates...');
  
  const candidates = [
    {
      orgId: ORG_ID,
      firstName: 'Ahmed',
      lastName: 'Hassan',
      email: 'ahmed.hassan@example.com',
      phone: '+966501234567',
      location: 'Riyadh, Saudi Arabia',
      skills: ['Facility Management', 'Project Management', 'Budget Management', 'Team Leadership'],
      experience: 6,
      currentPosition: 'Facility Manager',
      currentCompany: 'ABC Properties',
      expectedSalary: {
        min: 18000,
        max: 22000,
        currency: 'SAR'
      },
      resumeText: 'Experienced facility manager with 6 years in commercial property management...',
      source: 'careers',
      consents: {
        privacy: true,
        contact: true,
        dataRetention: true
      }
    },
    {
      orgId: ORG_ID,
      firstName: 'Fatima',
      lastName: 'Al-Rashid',
      email: 'fatima.alrashid@example.com',
      phone: '+966502345678',
      location: 'Jeddah, Saudi Arabia',
      skills: ['HVAC Systems', 'Electrical Maintenance', 'Plumbing', 'Safety Protocols'],
      experience: 4,
      currentPosition: 'Maintenance Supervisor',
      currentCompany: 'XYZ Facilities',
      expectedSalary: {
        min: 10000,
        max: 12000,
        currency: 'SAR'
      },
      resumeText: 'Skilled maintenance technician with expertise in building systems...',
      source: 'careers',
      consents: {
        privacy: true,
        contact: true,
        dataRetention: true
      }
    },
    {
      orgId: ORG_ID,
      firstName: 'Omar',
      lastName: 'Ali',
      email: 'omar.ali@example.com',
      phone: '+966503456789',
      location: 'Riyadh, Saudi Arabia',
      skills: ['Procurement', 'Negotiation', 'Vendor Management', 'Cost Analysis', 'Excel'],
      experience: 4,
      currentPosition: 'Senior Procurement Specialist',
      currentCompany: 'Global Corp',
      expectedSalary: {
        min: 15000,
        max: 18000,
        currency: 'SAR'
      },
      resumeText: 'Procurement professional with 4 years of experience in vendor management...',
      source: 'careers',
      consents: {
        privacy: true,
        contact: true,
        dataRetention: true
      }
    }
  ];
  
  for (const candidateData of candidates) {
    const existingCandidate = await Candidate.findByEmail(ORG_ID, candidateData.email);
    if (existingCandidate) {
      console.log(`  ⏭️  Candidate already exists: ${candidateData.email}`);
      continue;
    }
    
    const candidate = await Candidate.create(candidateData);
    const fullName = (candidate as any).fullName || `${(candidate as any).firstName} ${(candidate as any).lastName}`;
    console.log(`  ✅ Created candidate: ${fullName}`);
  }
}

async function seedApplications() {
  console.log('📋 Seeding applications...');
  
  // Get jobs and candidates
  const facilityManagerJob = await Job.findOne({ orgId: ORG_ID, slug: 'senior-facility-manager' });
  const maintenanceJob = await Job.findOne({ orgId: ORG_ID, slug: 'property-maintenance-technician' });
  const procurementJob = await Job.findOne({ orgId: ORG_ID, slug: 'procurement-officer' });
  
  const ahmed = await Candidate.findByEmail(ORG_ID, 'ahmed.hassan@example.com');
  const fatima = await Candidate.findByEmail(ORG_ID, 'fatima.alrashid@example.com');
  const omar = await Candidate.findByEmail(ORG_ID, 'omar.ali@example.com');
  
  if (!facilityManagerJob || !maintenanceJob || !procurementJob || !ahmed || !fatima || !omar) {
    console.log('  ⚠️  Required jobs or candidates not found, skipping applications');
    return;
  }
  
  const applications = [
    {
      orgId: ORG_ID,
      jobId: facilityManagerJob._id,
      candidateId: ahmed._id,
      stage: 'interview',
      score: 85,
      source: 'careers',
      candidateSnapshot: {
        fullName: 'Ahmed Hassan',
        email: ahmed.email,
        phone: ahmed.phone,
        location: ahmed.location,
        skills: ahmed.skills,
        experience: ahmed.experience,
        resumeUrl: ahmed.resumeUrl
      },
      coverLetter: 'I am excited to apply for the Senior Facility Manager position...',
      history: [
        { action: 'applied', by: 'candidate', at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        { action: 'stage_change:applied->screened', by: 'system', at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
        { action: 'stage_change:screened->interview', by: 'hr_manager', at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
      ],
      notes: [
        {
          author: 'hr_manager',
          text: 'Strong candidate with relevant experience. Recommended for interview.',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          isPrivate: false
        }
      ]
    },
    {
      orgId: ORG_ID,
      jobId: maintenanceJob._id,
      candidateId: fatima._id,
      stage: 'screened',
      score: 78,
      source: 'careers',
      candidateSnapshot: {
        fullName: 'Fatima Al-Rashid',
        email: fatima.email,
        phone: fatima.phone,
        location: fatima.location,
        skills: fatima.skills,
        experience: fatima.experience,
        resumeUrl: fatima.resumeUrl
      },
      coverLetter: 'With my 4 years of experience in building maintenance...',
      history: [
        { action: 'applied', by: 'candidate', at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        { action: 'stage_change:applied->screened', by: 'system', at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
      ]
    },
    {
      orgId: ORG_ID,
      jobId: procurementJob._id,
      candidateId: omar._id,
      stage: 'applied',
      score: 92,
      source: 'careers',
      candidateSnapshot: {
        fullName: 'Omar Ali',
        email: omar.email,
        phone: omar.phone,
        location: omar.location,
        skills: omar.skills,
        experience: omar.experience,
        resumeUrl: omar.resumeUrl
      },
      coverLetter: 'I am writing to express my interest in the Procurement Officer position...',
      history: [
        { action: 'applied', by: 'candidate', at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
      ]
    }
  ];
  
  for (const appData of applications) {
    const existingApp = await Application.findOne({
      orgId: appData.orgId,
      jobId: appData.jobId,
      candidateId: appData.candidateId
    });
    
    if (existingApp) {
      console.log(`  ⏭️  Application already exists for ${appData.candidateSnapshot.fullName}`);
      continue;
    }
    
    const application = await Application.create(appData);
    console.log(`  ✅ Created application: ${application.candidateSnapshot.fullName} for ${appData.stage} stage`);
  }
}

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit');
    console.log('📦 Connected to MongoDB');
    
    // Run seeders
    await seedAtsSettings();
    await seedJobs();
    await seedCandidates();
    await seedApplications();
    
    console.log('\n✨ ATS seeding completed successfully!');
    console.log('\n📌 Demo credentials:');
    console.log('   - Visit /careers to see job listings');
    console.log('   - Visit /hr/ats to access the ATS dashboard');
    console.log('   - Use the seeded candidates to test applications');
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the seeder
if (require.main === module) {
  main();
}
