&apos;use client&apos;;

import { useState } from &apos;react&apos;;
import { Card, CardContent, CardHeader, CardTitle } from &apos;@/src/components/ui/card&apos;;
import { Button } from &apos;@/src/components/ui/button&apos;;
import { Input } from &apos;@/src/components/ui/input&apos;;
import { Textarea } from &apos;@/src/components/ui/textarea&apos;;
import { Label } from &apos;@/src/components/ui/label&apos;;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from &apos;@/src/components/ui/select&apos;;
import { Badge } from &apos;@/src/components/ui/badge&apos;;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from &apos;@/src/components/ui/dialog&apos;;
import { useTranslation } from &apos;@/src/contexts/TranslationContext&apos;;
import { MapPin, Clock, DollarSign, Users, FileText, Send, Upload, Star, AlertTriangle } from &apos;lucide-react&apos;;

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: &apos;Full-time&apos; | &apos;Part-time&apos; | &apos;Contract&apos; | &apos;Remote&apos;;
  salary: string;
  description: string;
  requirements: string[];
  benefits: string[];
  skills: string[];
  experience: string;
  postedDate: string;
  status: &apos;Open&apos; | &apos;Closed&apos;;
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
      id: &apos;1',
      title: &apos;Senior Facility Manager&apos;,
      department: &apos;Operations&apos;,
      location: &apos;Riyadh, Saudi Arabia&apos;,
      type: &apos;Full-time&apos;,
      salary: &apos;SAR 15,000 - 25,000&apos;,
      description: &apos;We are looking for an experienced Facility Manager to oversee our commercial properties across Riyadh. The ideal candidate will have 5+ years of experience in facility management and will be responsible for ensuring optimal building operations, tenant satisfaction, and regulatory compliance.&apos;,
      requirements: [
        &apos;Bachelor\&apos;s degree in Engineering, Business Administration, or related field&apos;,
        &apos;5+ years of experience in facility management&apos;,
        &apos;Strong knowledge of building systems and maintenance&apos;,
        &apos;Excellent leadership and communication skills&apos;,
        &apos;Proficiency in English and Arabic&apos;,
        &apos;Experience with property management software&apos;,
        &apos;Knowledge of local building codes and regulations&apos;
      ],
      benefits: [
        &apos;Competitive salary package&apos;,
        &apos;Health insurance coverage&apos;,
        &apos;Annual performance bonus&apos;,
        &apos;Professional development opportunities&apos;,
        &apos;Company car allowance&apos;,
        &apos;25 days annual leave&apos;
      ],
      skills: [&apos;Facility Management&apos;, &apos;Building Operations&apos;, &apos;Team Leadership&apos;, &apos;Budget Management&apos;, &apos;Vendor Relations&apos;],
      experience: &apos;5+ years&apos;,
      postedDate: &apos;2025-01-15&apos;,
      status: &apos;Open&apos;,
      urgent: true,
      featured: true
    },
    {
      id: &apos;2',
      title: &apos;Property Maintenance Technician&apos;,
      department: &apos;Maintenance&apos;,
      location: &apos;Jeddah, Saudi Arabia&apos;,
      type: &apos;Full-time&apos;,
      salary: &apos;SAR 8,000 - 12,000&apos;,
      description: &apos;Join our maintenance team to ensure the optimal operation of our properties. You will be responsible for preventive maintenance, repairs, emergency response, and ensuring all building systems operate efficiently.&apos;,
      requirements: [
        &apos;Technical diploma or certification in electrical/mechanical systems&apos;,
        &apos;3+ years of experience in building maintenance&apos;,
        &apos;Knowledge of HVAC, electrical, and plumbing systems&apos;,
        &apos;Valid driver\&apos;s license&apos;,
        &apos;Basic computer skills&apos;,
        &apos;Ability to work flexible hours&apos;,
        &apos;Safety certification preferred&apos;
      ],
      benefits: [
        &apos;Competitive salary&apos;,
        &apos;Health and safety training&apos;,
        &apos;Overtime opportunities&apos;,
        &apos;Tool allowance&apos;,
        &apos;Career advancement path&apos;,
        &apos;21 days annual leave&apos;
      ],
      skills: [&apos;HVAC Systems&apos;, &apos;Electrical Maintenance&apos;, &apos;Plumbing&apos;, &apos;Preventive Maintenance&apos;, &apos;Emergency Response&apos;],
      experience: &apos;3+ years&apos;,
      postedDate: &apos;2025-01-10&apos;,
      status: &apos;Open&apos;
    },
    {
      id: &apos;3',
      title: &apos;Tenant Relations Specialist&apos;,
      department: &apos;Customer Service&apos;,
      location: &apos;Dammam, Saudi Arabia&apos;,
      type: &apos;Full-time&apos;,
      salary: &apos;SAR 10,000 - 15,000&apos;,
      description: &apos;We are seeking a customer-focused professional to manage tenant relationships and ensure excellent service delivery across our property portfolio. You will be the primary point of contact for tenant inquiries and will work to maintain high satisfaction levels.&apos;,
      requirements: [
        &apos;Bachelor\&apos;s degree in Business, Communication, or related field&apos;,
        &apos;3+ years of experience in customer service&apos;,
        &apos;Excellent communication and interpersonal skills&apos;,
        &apos;Proficiency in English and Arabic&apos;,
        &apos;Experience with CRM systems&apos;,
        &apos;Problem-solving abilities&apos;,
        &apos;Professional presentation skills&apos;
      ],
      benefits: [
        &apos;Attractive salary package&apos;,
        &apos;Customer service training&apos;,
        &apos;Performance incentives&apos;,
        &apos;Flexible working hours&apos;,
        &apos;Career growth opportunities&apos;,
        &apos;23 days annual leave&apos;
      ],
      skills: [&apos;Customer Service&apos;, &apos;Communication&apos;, &apos;CRM Systems&apos;, &apos;Conflict Resolution&apos;, &apos;Relationship Management&apos;],
      experience: &apos;3+ years&apos;,
      postedDate: &apos;2025-01-08&apos;,
      status: &apos;Open&apos;
    },
    {
      id: &apos;4',
      title: &apos;IT Support Specialist&apos;,
      department: &apos;Information Technology&apos;,
      location: &apos;Riyadh, Saudi Arabia&apos;,
      type: &apos;Full-time&apos;,
      salary: &apos;SAR 12,000 - 18,000&apos;,
      description: &apos;Support our growing technology infrastructure by providing technical assistance to employees and maintaining our IT systems. You will troubleshoot hardware and software issues, manage network operations, and ensure system security.&apos;,
      requirements: [
        &apos;Bachelor\&apos;s degree in Computer Science or related field&apos;,
        &apos;2+ years of experience in IT support&apos;,
        &apos;Knowledge of Windows, macOS, and Linux systems&apos;,
        &apos;Experience with network administration&apos;,
        &apos;Strong problem-solving skills&apos;,
        &apos;IT certifications preferred&apos;,
        &apos;Customer service oriented&apos;
      ],
      benefits: [
        &apos;Competitive compensation&apos;,
        &apos;Technical training programs&apos;,
        &apos;Certification support&apos;,
        &apos;Modern equipment&apos;,
        &apos;Flexible work arrangements&apos;,
        &apos;24 days annual leave&apos;
      ],
      skills: [&apos;IT Support&apos;, &apos;Network Administration&apos;, &apos;Hardware Troubleshooting&apos;, &apos;Software Installation&apos;, &apos;System Security&apos;],
      experience: &apos;2+ years&apos;,
      postedDate: &apos;2025-01-05&apos;,
      status: &apos;Open&apos;
    },
    {
      id: &apos;5',
      title: &apos;Property Accountant&apos;,
      department: &apos;Finance&apos;,
      location: &apos;Riyadh, Saudi Arabia&apos;,
      type: &apos;Full-time&apos;,
      salary: &apos;SAR 14,000 - 20,000&apos;,
      description: &apos;Manage financial operations for our property portfolio including rent collection, expense tracking, financial reporting, and budget preparation. You will work closely with property managers to ensure accurate financial records.&apos;,
      requirements: [
        &apos;Bachelor\&apos;s degree in Accounting or Finance&apos;,
        &apos;3+ years of experience in property accounting&apos;,
        &apos;Proficiency in accounting software&apos;,
        &apos;Knowledge of real estate financial principles&apos;,
        &apos;Strong analytical skills&apos;,
        &apos;CPA or equivalent certification preferred&apos;,
        &apos;Experience with property management systems&apos;
      ],
      benefits: [
        &apos;Excellent salary package&apos;,
        &apos;Professional accounting training&apos;,
        &apos;Performance bonuses&apos;,
        &apos;Health insurance&apos;,
        &apos;Retirement plan&apos;,
        &apos;26 days annual leave&apos;
      ],
      skills: [&apos;Financial Accounting&apos;, &apos;Budget Management&apos;, &apos;Financial Reporting&apos;, &apos;Property Management Software&apos;, &apos;Tax Compliance&apos;],
      experience: &apos;3+ years&apos;,
      postedDate: &apos;2025-01-12&apos;,
      status: &apos;Open&apos;
    },
    {
      id: &apos;6',
      title: &apos;Marketing Coordinator&apos;,
      department: &apos;Marketing&apos;,
      location: &apos;Jeddah, Saudi Arabia&apos;,
      type: &apos;Full-time&apos;,
      salary: &apos;SAR 11,000 - 16,000&apos;,
      description: &apos;Support our marketing efforts by coordinating campaigns, managing social media presence, creating marketing materials, and analyzing market trends. You will help promote our properties and services to potential tenants and clients.&apos;,
      requirements: [
        &apos;Bachelor\&apos;s degree in Marketing, Communications, or related field&apos;,
        &apos;2+ years of experience in marketing&apos;,
        &apos;Proficiency in digital marketing tools&apos;,
        &apos;Strong creative and writing skills&apos;,
        &apos;Social media management experience&apos;,
        &apos;Knowledge of real estate market&apos;,
        &apos;Proficiency in English and Arabic&apos;
      ],
      benefits: [
        &apos;Creative work environment&apos;,
        &apos;Marketing training programs&apos;,
        &apos;Flexible hours&apos;,
        &apos;Remote work options&apos;,
        &apos;Professional development&apos;,
        &apos;22 days annual leave&apos;
      ],
      skills: [&apos;Digital Marketing&apos;, &apos;Social Media Management&apos;, &apos;Content Creation&apos;, &apos;Campaign Planning&apos;, &apos;Market Analysis&apos;],
      experience: &apos;2+ years&apos;,
      postedDate: &apos;2025-01-14&apos;,
      status: &apos;Open&apos;,
      featured: true
    },
    {
      id: &apos;7',
      title: &apos;Security Supervisor&apos;,
      department: &apos;Security&apos;,
      location: &apos;Multiple Locations&apos;,
      type: &apos;Full-time&apos;,
      salary: &apos;SAR 9,000 - 13,000&apos;,
      description: &apos;Oversee security operations across our properties to ensure the safety of tenants, employees, and visitors. You will manage security personnel, coordinate with local authorities, and implement security protocols.&apos;,
      requirements: [
        &apos;Security management certification&apos;,
        &apos;4+ years of experience in security&apos;,
        &apos;Knowledge of security systems&apos;,
        &apos;Leadership and training skills&apos;,
        &apos;Emergency response experience&apos;,
        &apos;Valid security license&apos;,
        &apos;Strong communication skills&apos;
      ],
      benefits: [
        &apos;Security training programs&apos;,
        &apos;Health and safety coverage&apos;,
        &apos;Shift allowances&apos;,
        &apos;Career advancement&apos;,
        &apos;Equipment provided&apos;,
        &apos;21 days annual leave&apos;
      ],
      skills: [&apos;Security Management&apos;, &apos;Risk Assessment&apos;, &apos;Emergency Response&apos;, &apos;Team Leadership&apos;, &apos;Security Systems&apos;],
      experience: &apos;4+ years&apos;,
      postedDate: &apos;2025-01-09&apos;,
      status: &apos;Open&apos;
    },
    {
      id: &apos;8',
      title: &apos;Procurement Officer&apos;,
      department: &apos;Procurement&apos;,
      location: &apos;Riyadh, Saudi Arabia&apos;,
      type: &apos;Full-time&apos;,
      salary: &apos;SAR 13,000 - 19,000&apos;,
      description: &apos;Manage procurement activities for our properties including vendor selection, contract negotiation, and supplier relationship management. You will ensure cost-effective procurement of goods and services while maintaining quality standards.&apos;,
      requirements: [
        &apos;Bachelor\&apos;s degree in Business, Supply Chain, or related field&apos;,
        &apos;3+ years of experience in procurement&apos;,
        &apos;Strong negotiation skills&apos;,
        &apos;Knowledge of procurement processes&apos;,
        &apos;Experience with vendor management&apos;,
        &apos;Proficiency in procurement software&apos;,
        &apos;Analytical and decision-making skills&apos;
      ],
      benefits: [
        &apos;Procurement training&apos;,
        &apos;Negotiation skill development&apos;,
        &apos;Performance incentives&apos;,
        &apos;Travel opportunities&apos;,
        &apos;Professional certification support&apos;,
        &apos;25 days annual leave&apos;
      ],
      skills: [&apos;Procurement Management&apos;, &apos;Vendor Relations&apos;, &apos;Contract Negotiation&apos;, &apos;Cost Analysis&apos;, &apos;Supply Chain Management&apos;],
      experience: &apos;3+ years&apos;,
      postedDate: &apos;2025-01-07&apos;,
      status: &apos;Open&apos;
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
      formData.append(&apos;jobId&apos;, selectedJob.id);
      formData.append(&apos;position&apos;, selectedJob.title);
      formData.append(&apos;department&apos;, selectedJob.department);
    }

    try {
      const response = await fetch(&apos;/api/careers/apply&apos;, {
        method: &apos;POST&apos;,
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
${result.nextSteps.map((step: string, index: number) => `${index + 1}. ${step}`).join(&apos;\n&apos;)}

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
        throw new Error(result.error || &apos;Failed to submit application&apos;);
      }
    } catch (error) {
      console.error(&apos;Application submission error:&apos;, error);

      const errorMessage = error instanceof Error
        ? `Error: ${error.message}\n\nPlease check your internet connection and try again.`
        : &apos;An unexpected error occurred. Please try again.&apos;;

      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case &apos;Open&apos;: return &apos;bg-green-100 text-green-800 border-green-200&apos;;
      case &apos;Closed&apos;: return &apos;bg-red-100 text-red-800 border-red-200&apos;;
      default: return &apos;bg-gray-100 text-gray-800 border-gray-200&apos;;
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
              <Card key={job.id} className={`hover:shadow-lg transition-shadow h-full flex flex-col ${job.featured ? &apos;ring-2 ring-[#0061A8]/20 border-[#0061A8]/30&apos; : &apos;'}`}>
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
                          disabled={job.status === &apos;Closed&apos;}
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
                              {[&apos;Applied&apos;,'Screening&apos;,'Interview&apos;,'Offer&apos;,'Hired&apos;].map((stage, idx) => (
                                <li key={stage} className="flex items-center gap-3 p-3 rounded border border-gray-200 bg-white">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx <= 1 ? &apos;bg-[#00A859] text-white&apos; : &apos;bg-gray-200 text-gray-600&apos;}`}>{idx+1}</span>
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
                                  <strong>Status:</strong> <span className={job.status === &apos;Open&apos; ? &apos;text-green-600&apos; : &apos;text-red-600&apos;}>{job.status}</span>
                                </p>
                              </div>
                              <Button
                                onClick={() => handleApply(job)}
                                disabled={job.status === &apos;Closed&apos;}
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
                  placeholder="Tell us why you&apos;re interested in this position and what makes you a great fit..."
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
