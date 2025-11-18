'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin, Clock, DollarSign, Users, FileText, Send, Upload, Star, AlertTriangle } from 'lucide-react';
import ClientDate from '@/components/ClientDate';
import { logger } from '@/lib/logger';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Remote';
  salary: string;
  description: string;
  requirements: string[];
  benefits: string[];
  skills: string[];
  experience: string;
  postedDate: string;
  status: 'Open' | 'Closed';
  urgent?: boolean;
  featured?: boolean;
}

export default function CareersPage() {
  const { data: session } = useSession();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const auto = useAutoTranslator('careers.page');

  // Comprehensive job data
  const jobs: Job[] = [
    {
      id: '1',
      title: 'Senior Facility Manager',
      department: 'Operations',
      location: 'Riyadh, Saudi Arabia',
      type: 'Full-time',
      salary: 'SAR 15,000 - 25,000',
      description: 'We are looking for an experienced Facility Manager to oversee our commercial properties across Riyadh. The ideal candidate will have 5+ years of experience in facility management and will be responsible for ensuring optimal building operations, tenant satisfaction, and regulatory compliance.',
      requirements: [
        'Bachelor\'s degree in Engineering, Business Administration, or related field',
        '5+ years of experience in facility management',
        'Strong knowledge of building systems and maintenance',
        'Excellent leadership and communication skills',
        'Proficiency in English and Arabic',
        'Experience with property management software',
        'Knowledge of local building codes and regulations'
      ],
      benefits: [
        'Competitive salary package',
        'Health insurance coverage',
        'Annual performance bonus',
        'Professional development opportunities',
        'Company car allowance',
        '25 days annual leave'
      ],
      skills: ['Facility Management', 'Building Operations', 'Team Leadership', 'Budget Management', 'Vendor Relations'],
      experience: '5+ years',
      postedDate: '2025-01-15',
      status: 'Open',
      urgent: true,
      featured: true
    },
    {
      id: '2',
      title: 'Property Maintenance Technician',
      department: 'Maintenance',
      location: 'Jeddah, Saudi Arabia',
      type: 'Full-time',
      salary: 'SAR 8,000 - 12,000',
      description: 'Join our maintenance team to ensure the optimal operation of our properties. You will be responsible for preventive maintenance, repairs, emergency response, and ensuring all building systems operate efficiently.',
      requirements: [
        'Technical diploma or certification in electrical/mechanical systems',
        '3+ years of experience in building maintenance',
        'Knowledge of HVAC, electrical, and plumbing systems',
        'Valid driver\'s license',
        'Basic computer skills',
        'Ability to work flexible hours',
        'Safety certification preferred'
      ],
      benefits: [
        'Competitive salary',
        'Health and safety training',
        'Overtime opportunities',
        'Tool allowance',
        'Career advancement path',
        '21 days annual leave'
      ],
      skills: ['HVAC Systems', 'Electrical Maintenance', 'Plumbing', 'Preventive Maintenance', 'Emergency Response'],
      experience: '3+ years',
      postedDate: '2025-01-10',
      status: 'Open'
    },
    {
      id: '3',
      title: 'Tenant Relations Specialist',
      department: 'Customer Service',
      location: 'Dammam, Saudi Arabia',
      type: 'Full-time',
      salary: 'SAR 10,000 - 15,000',
      description: 'We are seeking a customer-focused professional to manage tenant relationships and ensure excellent service delivery across our property portfolio. You will be the primary point of contact for tenant inquiries and will work to maintain high satisfaction levels.',
      requirements: [
        'Bachelor\'s degree in Business, Communication, or related field',
        '3+ years of experience in customer service',
        'Excellent communication and interpersonal skills',
        'Proficiency in English and Arabic',
        'Experience with CRM systems',
        'Problem-solving abilities',
        'Professional presentation skills'
      ],
      benefits: [
        'Attractive salary package',
        'Customer service training',
        'Performance incentives',
        'Flexible working hours',
        'Career growth opportunities',
        '23 days annual leave'
      ],
      skills: ['Customer Service', 'Communication', 'CRM Systems', 'Conflict Resolution', 'Relationship Management'],
      experience: '3+ years',
      postedDate: '2025-01-08',
      status: 'Open'
    },
    {
      id: '4',
      title: 'IT Support Specialist',
      department: 'Information Technology',
      location: 'Riyadh, Saudi Arabia',
      type: 'Full-time',
      salary: 'SAR 12,000 - 18,000',
      description: 'Support our growing technology infrastructure by providing technical assistance to employees and maintaining our IT systems. You will troubleshoot hardware and software issues, manage network operations, and ensure system security.',
      requirements: [
        'Bachelor\'s degree in Computer Science or related field',
        '2+ years of experience in IT support',
        'Knowledge of Windows, macOS, and Linux systems',
        'Experience with network administration',
        'Strong problem-solving skills',
        'IT certifications preferred',
        'Customer service oriented'
      ],
      benefits: [
        'Competitive compensation',
        'Technical training programs',
        'Certification support',
        'Modern equipment',
        'Flexible work arrangements',
        '24 days annual leave'
      ],
      skills: ['IT Support', 'Network Administration', 'Hardware Troubleshooting', 'Software Installation', 'System Security'],
      experience: '2+ years',
      postedDate: '2025-01-05',
      status: 'Open'
    },
    {
      id: '5',
      title: 'Property Accountant',
      department: 'Finance',
      location: 'Riyadh, Saudi Arabia',
      type: 'Full-time',
      salary: 'SAR 14,000 - 20,000',
      description: 'Manage financial operations for our property portfolio including rent collection, expense tracking, financial reporting, and budget preparation. You will work closely with property managers to ensure accurate financial records.',
      requirements: [
        'Bachelor\'s degree in Accounting or Finance',
        '3+ years of experience in property accounting',
        'Proficiency in accounting software',
        'Knowledge of real estate financial principles',
        'Strong analytical skills',
        'CPA or equivalent certification preferred',
        'Experience with property management systems'
      ],
      benefits: [
        'Excellent salary package',
        'Professional accounting training',
        'Performance bonuses',
        'Health insurance',
        'Retirement plan',
        '26 days annual leave'
      ],
      skills: ['Financial Accounting', 'Budget Management', 'Financial Reporting', 'Property Management Software', 'Tax Compliance'],
      experience: '3+ years',
      postedDate: '2025-01-12',
      status: 'Open'
    },
    {
      id: '6',
      title: 'Marketing Coordinator',
      department: 'Marketing',
      location: 'Jeddah, Saudi Arabia',
      type: 'Full-time',
      salary: 'SAR 11,000 - 16,000',
      description: 'Support our marketing efforts by coordinating campaigns, managing social media presence, creating marketing materials, and analyzing market trends. You will help promote our properties and services to potential tenants and clients.',
      requirements: [
        'Bachelor\'s degree in Marketing, Communications, or related field',
        '2+ years of experience in marketing',
        'Proficiency in digital marketing tools',
        'Strong creative and writing skills',
        'Social media management experience',
        'Knowledge of real estate market',
        'Proficiency in English and Arabic'
      ],
      benefits: [
        'Creative work environment',
        'Marketing training programs',
        'Flexible hours',
        'Remote work options',
        'Professional development',
        '22 days annual leave'
      ],
      skills: ['Digital Marketing', 'Social Media Management', 'Content Creation', 'Campaign Planning', 'Market Analysis'],
      experience: '2+ years',
      postedDate: '2025-01-14',
      status: 'Open',
      featured: true
    },
    {
      id: '7',
      title: 'Security Supervisor',
      department: 'Security',
      location: 'Multiple Locations',
      type: 'Full-time',
      salary: 'SAR 9,000 - 13,000',
      description: 'Oversee security operations across our properties to ensure the safety of tenants, employees, and visitors. You will manage security personnel, coordinate with local authorities, and implement security protocols.',
      requirements: [
        'Security management certification',
        '4+ years of experience in security',
        'Knowledge of security systems',
        'Leadership and training skills',
        'Emergency response experience',
        'Valid security license',
        'Strong communication skills'
      ],
      benefits: [
        'Security training programs',
        'Health and safety coverage',
        'Shift allowances',
        'Career advancement',
        'Equipment provided',
        '21 days annual leave'
      ],
      skills: ['Security Management', 'Risk Assessment', 'Emergency Response', 'Team Leadership', 'Security Systems'],
      experience: '4+ years',
      postedDate: '2025-01-09',
      status: 'Open'
    },
    {
      id: '8',
      title: 'Procurement Officer',
      department: 'Procurement',
      location: 'Riyadh, Saudi Arabia',
      type: 'Full-time',
      salary: 'SAR 13,000 - 19,000',
      description: 'Manage procurement activities for our properties including vendor selection, contract negotiation, and supplier relationship management. You will ensure cost-effective procurement of goods and services while maintaining quality standards.',
      requirements: [
        'Bachelor\'s degree in Business, Supply Chain, or related field',
        '3+ years of experience in procurement',
        'Strong negotiation skills',
        'Knowledge of procurement processes',
        'Experience with vendor management',
        'Proficiency in procurement software',
        'Analytical and decision-making skills'
      ],
      benefits: [
        'Procurement training',
        'Negotiation skill development',
        'Performance incentives',
        'Travel opportunities',
        'Professional certification support',
        '25 days annual leave'
      ],
      skills: ['Procurement Management', 'Vendor Relations', 'Contract Negotiation', 'Cost Analysis', 'Supply Chain Management'],
      experience: '3+ years',
      postedDate: '2025-01-07',
      status: 'Open'
    }
  ];

  const handleApply = (job: Job) => {
    setSelectedJob(job);
    setShowApplyForm(true);
  };

  const handleSubmitApplication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    // Add job information to the form data
    if (selectedJob) {
      formData.append('jobId', selectedJob.id);
      formData.append('position', selectedJob.title);
      formData.append('department', selectedJob.department);
    }

    try {
      const response = await fetch('/api/careers/apply', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        // Show success message with application details
        toast.success(
          `Application Submitted Successfully! Application ID: ${result.applicationId} for ${selectedJob?.title}. You will receive a confirmation email shortly.`,
          { duration: 5000 }
        );

        // Reset form and close modal
        setShowApplyForm(false);
        setSelectedJob(null);

        // Clear the form
        (e.target as HTMLFormElement).reset();
      } else {
        throw new Error(result.error || 'Failed to submit application');
      }
    } catch (error) {
      logger.error('Application submission error:', error);

      const errorMessage = error instanceof Error
        ? `Error: ${error.message}. Please check your internet connection and try again.`
        : 'An unexpected error occurred. Please try again.';

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-success/10 text-success-foreground border-success/20';
      case 'Closed': return 'bg-destructive/10 text-destructive-foreground border-destructive/20';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary via-primary to-success text-primary-foreground py-16">{/* FIXED: Using CSS variables for theming */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {auto('Join Our Team', 'hero.title')}
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              {auto('Build your career with Fixzit Enterprise - where innovation meets opportunity', 'hero.subtitle')}
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-center">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6" />
                <span className="text-lg">{auto('50+ Employees', 'hero.statEmployees')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-6 h-6" />
                <span className="text-lg">{auto('3 Cities', 'hero.statCities')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-6 h-6" />
                <span className="text-lg">{auto('Growing Fast', 'hero.statGrowth')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {auto('Current Openings', 'listings.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {auto('Explore exciting career opportunities and join our growing team of professionals', 'listings.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <Card key={job.id} className={`hover:shadow-lg transition-shadow h-full flex flex-col ${job.featured ? 'ring-2 ring-primary/20 border-primary/30' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold">FZ</div>{/* FIXED: Using CSS variable */}
                        <div className="flex flex-col">
                          <CardTitle className="text-xl leading-tight">{job.title}</CardTitle>
                          <div className="text-xs text-muted-foreground">Fixzit Enterprise</div>
                        </div>
                        {job.urgent && <div title="Urgent Position"><AlertTriangle className="w-5 h-5 text-destructive" /></div>}
                        {job.featured && <div title="Featured Position"><Star className="w-5 h-5 text-accent" /></div>}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {job.type}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {job.salary}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {job.experience}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {job.skills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {job.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{job.skills.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                      {job.urgent && (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                          Urgent
                        </Badge>
                      )}
                      {job.featured && (
                        <Badge className="bg-accent/10 text-accent border-warning/20 text-xs">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-muted-foreground mb-4 line-clamp-3">{job.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">
                        {auto('Requirements:', 'job.requirementsTitle')}
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {job.requirements.slice(0, 2).map((req) => (
                          <li key={req} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                            {req}
                          </li>
                        ))}
                        {job.requirements.length > 2 && (
                          <li className="text-primary font-medium">
                            +{job.requirements.length - 2} more requirements
                          </li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">
                        {auto('Benefits:', 'job.benefitsTitle')}
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {job.benefits.slice(0, 2).map((benefit) => (
                          <li key={benefit} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-success rounded-full mt-2 flex-shrink-0"></span>
                            {benefit}
                          </li>
                        ))}
                        {job.benefits.length > 2 && (
                          <li className="text-success font-medium">
                            +{job.benefits.length - 2} more benefits
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Posted: <ClientDate date={job.postedDate} format="date-only" />
                    </span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => setSelectedJob(job)}
                          disabled={job.status === 'Closed'}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <FileText className="w-4 h-4 me-2" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <DialogTitle className="text-2xl">{job.title}</DialogTitle>
                              <div className="flex items-center gap-4 mt-2">
                                <Badge variant="secondary">{job.department}</Badge>
                                <Badge variant="outline">{job.type}</Badge>
                                <Badge variant="outline">{job.experience}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  Posted: <ClientDate date={job.postedDate} format="date-only" />
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              {job.urgent && <Badge className="bg-destructive/10 text-destructive border-destructive/20">Urgent</Badge>}
                              {job.featured && <Badge className="bg-accent/10 text-accent border-warning/20">Featured</Badge>}
                            </div>
                          </div>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-primary/10 p-3 rounded-2xl">
                              <Label className="text-sm font-medium text-primary">Location</Label>
                              <p className="text-foreground font-medium">{job.location}</p>
                            </div>
                            <div className="bg-success/10 p-3 rounded-2xl">
                              <Label className="text-sm font-medium text-success">Salary Range</Label>
                              <p className="text-foreground font-medium">{job.salary}</p>
                            </div>
                            <div className="bg-secondary/10 p-3 rounded-2xl">
                              <Label className="text-sm font-medium text-secondary">Job Type</Label>
                              <p className="text-foreground font-medium">{job.type}</p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-lg font-semibold">Job Description</Label>
                            <p className="text-foreground mt-2 leading-relaxed">{job.description}</p>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                              <Label className="text-lg font-semibold mb-3 block">Requirements</Label>
                              <ul className="space-y-2">
                                {job.requirements.map((req) => (
                                  <li key={req} className="flex items-start gap-3">
                                    <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                                    <span className="text-foreground">{req}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <Label className="text-lg font-semibold mb-3 block">Benefits & Perks</Label>
                              <ul className="space-y-2">
                                {job.benefits.map((benefit) => (
                                  <li key={benefit} className="flex items-start gap-3">
                                    <span className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0"></span>
                                    <span className="text-foreground">{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div>
                            <Label className="text-lg font-semibold mb-3 block">Required Skills</Label>
                            <div className="flex flex-wrap gap-2">
                              {job.skills.map((skill) => (
                                <Badge key={skill} variant="secondary" className="bg-muted text-foreground">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Hiring Stages (ATS) */}
                          <div>
                            <Label className="text-lg font-semibold mb-3 block">Hiring Stages</Label>
                            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                              {['Applied','Screening','Interview','Offer','Hired'].map((stage, idx) => (
                                <li key={stage} className="flex items-center gap-3 p-3 rounded border border-border bg-card">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx <= 1 ? 'bg-success text-white' : 'bg-muted text-muted-foreground'}`}>{idx+1}</span>
                                  <span className="text-sm text-foreground">{stage}</span>
                                </li>
                              ))}
                            </ol>
                            <div className="flex flex-wrap gap-2 mt-3">
                              <Button size="sm" className="bg-primary hover:bg-primary/90">Schedule Interview</Button>
                              <Button size="sm" variant="outline">Advance Stage</Button>
                              <Button size="sm" variant="outline">Share with Team</Button>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  <strong>Application Deadline:</strong> Applications are reviewed on a rolling basis
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  <strong>Status:</strong> <span className={job.status === 'Open' ? 'text-success' : 'text-destructive'}>{job.status}</span>
                                </p>
                              </div>
                              <Button
                                onClick={() => handleApply(job)}
                                disabled={job.status === 'Closed'}
                                className="bg-primary hover:bg-primary/90 text-white px-6 py-2"
                              >
                                <Send className="w-4 h-4 me-2" />
                                {auto('Apply Now', 'form.applyCta')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Job Application Form */}
      {selectedJob && (
        <Dialog open={showApplyForm} onOpenChange={setShowApplyForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {auto('Apply for {{jobTitle}}', 'form.dialogTitle', { jobTitle: selectedJob.title })}
              </DialogTitle>
              <p className="text-muted-foreground">
                {selectedJob.department} • {selectedJob.location} • {selectedJob.type}
              </p>
            </DialogHeader>

            <form onSubmit={handleSubmitApplication} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">{auto('First Name *', 'form.firstName.label')}</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    required
                    placeholder={auto('Enter your first name', 'form.firstName.placeholder')}
                    defaultValue={session?.user?.name?.split(' ')[0] || ''}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">{auto('Last Name *', 'form.lastName.label')}</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    required
                    placeholder={auto('Enter your last name', 'form.lastName.placeholder')}
                    defaultValue={session?.user?.name?.split(' ').slice(1).join(' ') || ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">{auto('Email Address *', 'form.email.label')}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder={auto('Enter your email', 'form.email.placeholder')}
                    defaultValue={session?.user?.email || ''}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{auto('Phone Number *', 'form.phone.label')}</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder={auto('Enter your phone number', 'form.phone.placeholder')}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="coverLetter">{auto('Cover Letter *', 'form.coverLetter.label')}</Label>
                <Textarea
                  id="coverLetter"
                  name="coverLetter"
                  rows={4}
                  required
                  placeholder={auto(
                    "Tell us why you're interested in this position and what makes you a great fit...",
                    'form.coverLetter.placeholder'
                  )}
                />
              </div>

              <div>
                <Label htmlFor="resume">{auto('Resume/CV *', 'form.resume.label')}</Label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border border-dashed rounded-2xl">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="flex text-sm text-muted-foreground">
                      <label htmlFor="resume" className="relative cursor-pointer bg-card rounded-2xl font-medium text-primary hover:text-primary">
                        <span>{auto('Upload a file', 'form.resume.upload')}</span>
                        <input
                          id="resume"
                          name="resume"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          required
                          className="sr-only"
                        />
                      </label>
                      <p className="ps-1">{auto('or drag and drop', 'form.resume.dragDrop')}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {auto('PDF, DOC, DOCX up to 10MB', 'form.resume.hint')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowApplyForm(false)}
                  disabled={isSubmitting}
                >
                  {auto('Cancel', 'form.actions.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin me-2" />
                      {auto('Submitting...', 'form.actions.submitting')}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 me-2" />
                      {auto('Submit Application', 'form.actions.submit')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
