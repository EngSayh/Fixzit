'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Label } from '@/src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Badge } from '@/src/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { MapPin, Clock, DollarSign, Users, FileText, Send, Upload, Star, AlertTriangle } from 'lucide-react';

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
  const { t } = useTranslation();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        const successMessage = `
🎉 Application Submitted Successfully!

Application ID: ${result.applicationId}
Position: ${selectedJob?.title}
Department: ${selectedJob?.department}

Next Steps:
${result.nextSteps.map((step: string, index: number) => `${index + 1}. ${step}`).join('\n')}

You will receive a confirmation email shortly.
Thank you for your interest in joining Fixzit Enterprise!
        `;

        alert(successMessage);

        // Reset form and close modal
        setShowApplyForm(false);
        setSelectedJob(null);

        // Clear the form
        (e.target as HTMLFormElement).reset();
      } else {
        throw new Error(result.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Application submission error:', error);

      const errorMessage = error instanceof Error
        ? `Error: ${error.message}\n\nPlease check your internet connection and try again.`
        : 'An unexpected error occurred. Please try again.';

      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-green-100 text-green-800 border-green-200';
      case 'Closed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#023047] via-[#0061A8] to-[#00A859] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Join Our Team</h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              Build your career with Fixzit Enterprise - where innovation meets opportunity
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-center">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6" />
                <span className="text-lg">50+ Employees</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-6 h-6" />
                <span className="text-lg">3 Cities</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-6 h-6" />
                <span className="text-lg">Growing Fast</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Current Openings</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Explore exciting career opportunities and join our growing team of professionals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <Card key={job.id} className={`hover:shadow-lg transition-shadow h-full flex flex-col ${job.featured ? 'ring-2 ring-[#0061A8]/20 border-[#0061A8]/30' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded bg-[#023047] text-white flex items-center justify-center font-bold">FZ</div>
                        <div className="flex flex-col">
                          <CardTitle className="text-xl leading-tight">{job.title}</CardTitle>
                          <div className="text-xs text-gray-500">Fixzit Enterprise</div>
                        </div>
                        {job.urgent && <div title="Urgent Position"><AlertTriangle className="w-5 h-5 text-red-500" /></div>}
                        {job.featured && <div title="Featured Position"><Star className="w-5 h-5 text-yellow-500" /></div>}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
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
                        {job.skills.slice(0, 3).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
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
                        <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                          Urgent
                        </Badge>
                      )}
                      {job.featured && (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-gray-600 mb-4 line-clamp-3">{job.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Requirements:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {job.requirements.slice(0, 2).map((req, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                            {req}
                          </li>
                        ))}
                        {job.requirements.length > 2 && (
                          <li className="text-blue-600 font-medium">
                            +{job.requirements.length - 2} more requirements
                          </li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Benefits:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {job.benefits.slice(0, 2).map((benefit, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                            {benefit}
                          </li>
                        ))}
                        {job.benefits.length > 2 && (
                          <li className="text-green-600 font-medium">
                            +{job.benefits.length - 2} more benefits
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      Posted: {new Date(job.postedDate).toLocaleDateString()}
                    </span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => setSelectedJob(job)}
                          disabled={job.status === 'Closed'}
                          className="bg-[#0061A8] hover:bg-[#0061A8]/90"
                        >
                          <FileText className="w-4 h-4 mr-2" />
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
                                <span className="text-sm text-gray-500">
                                  Posted: {new Date(job.postedDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              {job.urgent && <Badge className="bg-red-100 text-red-800 border-red-200">Urgent</Badge>}
                              {job.featured && <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Featured</Badge>}
                            </div>
                          </div>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <Label className="text-sm font-medium text-blue-800">Location</Label>
                              <p className="text-gray-700 font-medium">{job.location}</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg">
                              <Label className="text-sm font-medium text-green-800">Salary Range</Label>
                              <p className="text-gray-700 font-medium">{job.salary}</p>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <Label className="text-sm font-medium text-purple-800">Job Type</Label>
                              <p className="text-gray-700 font-medium">{job.type}</p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-lg font-semibold">Job Description</Label>
                            <p className="text-gray-700 mt-2 leading-relaxed">{job.description}</p>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                              <Label className="text-lg font-semibold mb-3 block">Requirements</Label>
                              <ul className="space-y-2">
                                {job.requirements.map((req, index) => (
                                  <li key={index} className="flex items-start gap-3">
                                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                                    <span className="text-gray-700">{req}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <Label className="text-lg font-semibold mb-3 block">Benefits & Perks</Label>
                              <ul className="space-y-2">
                                {job.benefits.map((benefit, index) => (
                                  <li key={index} className="flex items-start gap-3">
                                    <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                                    <span className="text-gray-700">{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div>
                            <Label className="text-lg font-semibold mb-3 block">Required Skills</Label>
                            <div className="flex flex-wrap gap-2">
                              {job.skills.map((skill, index) => (
                                <Badge key={index} variant="secondary" className="bg-gray-100 text-gray-800">
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
                                <li key={stage} className="flex items-center gap-3 p-3 rounded border border-gray-200 bg-white">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx <= 1 ? 'bg-[#00A859] text-white' : 'bg-gray-200 text-gray-600'}`}>{idx+1}</span>
                                  <span className="text-sm text-gray-800">{stage}</span>
                                </li>
                              ))}
                            </ol>
                            <div className="flex flex-wrap gap-2 mt-3">
                              <Button size="sm" className="bg-[#0061A8] hover:bg-[#0061A8]/90">Schedule Interview</Button>
                              <Button size="sm" variant="outline">Advance Stage</Button>
                              <Button size="sm" variant="outline">Share with Team</Button>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm text-gray-600">
                                  <strong>Application Deadline:</strong> Applications are reviewed on a rolling basis
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  <strong>Status:</strong> <span className={job.status === 'Open' ? 'text-green-600' : 'text-red-600'}>{job.status}</span>
                                </p>
                              </div>
                              <Button
                                onClick={() => handleApply(job)}
                                disabled={job.status === 'Closed'}
                                className="bg-[#0061A8] hover:bg-[#0061A8]/90 text-white px-6 py-2"
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Apply Now
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
              <DialogTitle className="text-2xl">Apply for {selectedJob.title}</DialogTitle>
              <p className="text-gray-600">
                {selectedJob.department} • {selectedJob.location} • {selectedJob.type}
              </p>
            </DialogHeader>

            <form onSubmit={handleSubmitApplication} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    required
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    required
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="coverLetter">Cover Letter *</Label>
                <Textarea
                  id="coverLetter"
                  name="coverLetter"
                  rows={4}
                  required
                  placeholder="Tell us why you're interested in this position and what makes you a great fit..."
                />
              </div>

              <div>
                <Label htmlFor="resume">Resume/CV *</Label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="resume" className="relative cursor-pointer bg-white rounded-md font-medium text-[#0061A8] hover:text-[#0061A8]/80">
                        <span>Upload a file</span>
                        <input
                          id="resume"
                          name="resume"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          required
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, DOC, DOCX up to 10MB</p>
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0061A8] hover:bg-[#0061A8]/90"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Application
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
