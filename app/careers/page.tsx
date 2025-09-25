'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { Badge } from '@/src/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/src/components/ui/dialog';
import { formatCurrency } from '@/src/lib/utils';
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Building2, 
  Calendar,
  ChevronRight,
  Search,
  Filter,
  Briefcase,
  Users,
  FileText,
  Send,
  Upload,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Job {
  _id: string;
  title: string;
  titleAr?: string;
  department: string;
  location: {
    city: string;
    country: string;
    mode: string;
  };
  jobType: string;
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  description: string;
  descriptionAr?: string;
  requirements: string[];
  benefits: string[];
  skills: string[];
  experience: string;
  publishedAt: string;
  status: string;
  urgent?: boolean;
  featured?: boolean;
}

/**
 * CareersPage client component that displays job listings with search, filters, detail dialogs, and an application form.
 *
 * Renders a searchable, filterable list of published jobs fetched from /api/ats/jobs and provides:
 * - a details dialog for each job (description, requirements, benefits, location, salary, skills),
 * - an application dialog with a multi-field form and resume upload which POSTs form data to /api/ats/jobs/{jobId}/apply,
 * - counts for open positions, unique locations, and departments.
 *
 * The component manages loading and submission state, opens/closes dialogs for viewing and applying, and updates listings
 * when the search term, location filter, or department filter change.
 *
 * @returns A React element containing the careers page UI.
 */
export default function CareersPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  useEffect(() => {
    fetchJobs();
  }, [searchTerm, locationFilter, departmentFilter]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: 'published',
        q: searchTerm
      });
      if (locationFilter !== 'all') {
        // API expects city (filters on location.city)
        const city = locationFilter.split(',')[0].trim();
        params.append('location', city);
      }
      if (departmentFilter !== 'all') {
        params.append('department', departmentFilter);
      }
      const response = await fetch(`/api/ats/jobs?${params}`);
      const data = await response.json();
      if (data.success) {
        setJobs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (job: Job) => {
    setSelectedJob(job);
    setShowApplyForm(true);
    setApplicationSuccess(false);
  };

  const handleSubmitApplication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch(`/api/ats/jobs/${selectedJob?._id}/apply`, {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setApplicationSuccess(true);
        setTimeout(() => {
          alert(`
🎉 Application Submitted Successfully!

Application ID: ${result.data.applicationId}
Position: ${selectedJob?.title}
Department: ${selectedJob?.department}
Score: ${result.data.score}%

${result.data.message}

You will receive a confirmation email shortly.
Thank you for your interest in joining Fixzit Enterprise!
          `);
          setShowApplyForm(false);
          setSelectedJob(null);
          setApplicationSuccess(false);
          (e.target as HTMLFormElement).reset();
        }, 1000);
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

  const getJobTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'full-time': 'Full Time',
      'part-time': 'Part Time',
      'contract': 'Contract',
      'internship': 'Internship'
    };
    return labels[type] || type;
  };

  const uniqueLocations = Array.from(new Set(jobs.map(job => `${job.location.city}, ${job.location.country}`)));
  const uniqueDepartments = Array.from(new Set(jobs.map(job => job.department)));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#0061A8] to-[#004d87] text-white py-20">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Join Our Team
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8">
              Build your career with Fixzit Enterprise
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="text-3xl font-bold">{jobs.length}</div>
                <div className="text-sm text-blue-100">Open Positions</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="text-3xl font-bold">{uniqueLocations.length}</div>
                <div className="text-sm text-blue-100">Locations</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="text-3xl font-bold">{uniqueDepartments.length}</div>
                <div className="text-sm text-blue-100">Departments</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search jobs by title, skills, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0061A8]"
            >
              <option value="all">All Locations</option>
              {uniqueLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0061A8]"
            >
              <option value="all">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Job Listings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0061A8] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading job opportunities...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600">Try adjusting your search filters or check back later for new opportunities.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <Card key={job._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      {job.urgent && (
                        <Badge className="bg-red-100 text-red-800 mb-2">Urgent</Badge>
                      )}
                      {job.featured && (
                        <Badge className="bg-yellow-100 text-yellow-800 mb-2 ml-2">Featured</Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getJobTypeLabel(job.jobType)}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{job.title}</CardTitle>
                  <CardDescription className="space-y-2 mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4" />
                      <span>{job.department}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location.city}, {job.location.country}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4" />
                      <span>
                        {formatCurrency(job.salaryRange.min, job.salaryRange.currency)} - 
                        {formatCurrency(job.salaryRange.max, job.salaryRange.currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{job.experience} experience</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {job.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.skills.slice(0, 3).map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {job.skills.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{job.skills.length - 3} more
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => setSelectedJob(job)}
                          disabled={job.status === 'closed'}
                          className="bg-[#0061A8] hover:bg-[#0061A8]/90"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-2xl">{job.title}</DialogTitle>
                          <DialogDescription>
                            <div className="space-y-2 mt-4">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                <span className="font-medium">Department:</span>
                                <span>{job.department}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">Experience:</span>
                                <span>{job.experience}</span>
                              </div>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 mt-6">
                          <div>
                            <h3 className="font-semibold mb-2">Description</h3>
                            <p className="text-gray-600">{job.description}</p>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold mb-2">Requirements</h3>
                            <ul className="list-disc pl-5 space-y-1 text-gray-600">
                              {job.requirements.map((req, index) => (
                                <li key={index}>{req}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold mb-2">Benefits</h3>
                            <ul className="list-disc pl-5 space-y-1 text-gray-600">
                              {job.benefits.map((benefit, index) => (
                                <li key={index}>{benefit}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-blue-800">Location</Label>
                              <p className="text-gray-700 font-medium">{job.location.city}, {job.location.country}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-green-800">Salary Range</Label>
                              <p className="text-gray-700 font-medium">
                                {formatCurrency(job.salaryRange.min, job.salaryRange.currency)} - 
                                {formatCurrency(job.salaryRange.max, job.salaryRange.currency)}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-purple-800">Job Type</Label>
                              <p className="text-gray-700 font-medium">{getJobTypeLabel(job.jobType)}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold mb-2">Required Skills</h3>
                            <div className="flex flex-wrap gap-2">
                              {job.skills.map((skill, index) => (
                                <Badge key={index} variant="secondary">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button
                              onClick={() => handleApply(job)}
                              className="bg-[#00A859] hover:bg-[#00A859]/90"
                            >
                              Apply Now
                              <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Application Form Dialog */}
      <Dialog open={showApplyForm} onOpenChange={setShowApplyForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Apply for {selectedJob?.title}</DialogTitle>
            <DialogDescription>
              Please fill out the form below to submit your application.
            </DialogDescription>
          </DialogHeader>
          
          {applicationSuccess ? (
            <div className="py-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Application Submitted!</h3>
              <p className="text-gray-600">
                Thank you for your interest. We'll review your application and get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitApplication} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    required
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="+966 50 123 4567"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Current Location *</Label>
                  <Input
                    id="location"
                    name="location"
                    required
                    placeholder="City, Country"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="experience">Years of Experience *</Label>
                  <Input
                    id="experience"
                    name="experience"
                    type="number"
                    required
                    placeholder="5"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin">LinkedIn Profile</Label>
                  <Input
                    id="linkedin"
                    name="linkedin"
                    type="url"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="skills">Skills (comma-separated) *</Label>
                <Input
                  id="skills"
                  name="skills"
                  required
                  placeholder="Project Management, Team Leadership, Communication"
                />
              </div>
              
              <div>
                <Label htmlFor="coverLetter">Cover Letter *</Label>
                <Textarea
                  id="coverLetter"
                  name="coverLetter"
                  required
                  rows={6}
                  placeholder="Tell us why you're interested in this position and what makes you a great fit..."
                />
              </div>
              
              <div>
                <Label htmlFor="resume">Resume/CV (PDF) *</Label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="resume" className="relative cursor-pointer bg-white rounded-md font-medium text-[#0061A8] hover:text-[#0061A8]/80">
                        <span>Upload a file</span>
                        <input
                          id="resume"
                          name="resume"
                          type="file"
                          accept=".pdf"
                          required
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF up to 10MB</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="consent"
                  name="consent"
                  required
                  className="mt-1"
                />
                <Label htmlFor="consent" className="text-sm text-gray-600">
                  I consent to the processing of my personal data for recruitment purposes and agree to the terms and conditions.
                </Label>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
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
                  className="bg-[#00A859] hover:bg-[#00A859]/90"
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
