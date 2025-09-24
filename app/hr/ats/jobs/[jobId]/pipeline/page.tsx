'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { Input } from '@/src/components/ui/input';
import { Avatar, AvatarFallback, AvatarInitials } from '@/src/components/ui/avatar';
import { 
  ArrowLeft,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Star,
  Calendar,
  Clock,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { getInitials } from '@/src/lib/utils';

interface Application {
  _id: string;
  candidateId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location?: string;
    skills: string[];
  };
  jobId: {
    title: string;
    department: string;
  };
  stage: string;
  score: number;
  createdAt: string;
  candidateSnapshot: {
    fullName: string;
    email: string;
    phone: string;
    location?: string;
    skills: string[];
    experience: number;
  };
}

const STAGES = [
  { id: 'applied', label: 'Applied', color: 'bg-blue-50 border-blue-200' },
  { id: 'screened', label: 'Screened', color: 'bg-purple-50 border-purple-200' },
  { id: 'interview', label: 'Interview', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'offer', label: 'Offer', color: 'bg-green-50 border-green-200' },
  { id: 'hired', label: 'Hired', color: 'bg-emerald-50 border-emerald-200' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-50 border-red-200' }
];

/**
 * Renders the job application pipeline board for a given job.
 *
 * Displays six pipeline columns (Applied, Screened, Interview, Offer, Hired, Rejected) with candidate cards,
 * supports searching/filtering candidates, expanding a candidate to view contact/skills, and advancing an
 * application to the next stage. Fetches job details and applications on mount or when `params.jobId` changes,
 * and shows a fullscreen loading indicator while data is being loaded.
 *
 * @param params - Route parameters
 * @param params.jobId - ID of the job whose pipeline should be displayed
 * @returns The pipeline UI for the specified job
 */
export default function JobPipelinePage({ params }: { params: { jobId: string } }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);

  useEffect(() => {
    fetchJobAndApplications();
  }, [params.jobId]);

  const fetchJobAndApplications = async () => {
    try {
      setLoading(true);
      
      // Fetch job details
      const jobRes = await fetch(`/api/ats/jobs/${params.jobId}`);
      const jobData = await jobRes.json();
      if (jobData.success) {
        setJob(jobData.data);
      }
      
      // Fetch applications
      const appsRes = await fetch(`/api/ats/applications?jobId=${params.jobId}&limit=100`);
      const appsData = await appsRes.json();
      if (appsData.success) {
        setApplications(appsData.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (applicationId: string, newStage: string) => {
    try {
      const response = await fetch(`/api/ats/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      });
      
      if (response.ok) {
        fetchJobAndApplications();
      }
    } catch (error) {
      console.error('Failed to update stage:', error);
    }
  };

  const getApplicationsByStage = (stage: string) => {
    return applications.filter(app => app.stage === stage);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const filteredApplications = applications.filter(app => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const candidate = app.candidateSnapshot || app.candidateId;
    
    return (
      candidate.fullName?.toLowerCase().includes(search) ||
      candidate.email?.toLowerCase().includes(search) ||
      candidate.skills?.some(skill => skill.toLowerCase().includes(search))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[#0061A8] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/hr/ats/jobs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Jobs
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{job?.title || 'Job Pipeline'}</h1>
            <p className="text-gray-600">{job?.department} • {job?.location?.city}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-[300px]"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-6 gap-4 min-w-[1200px]">
          {STAGES.map(stage => {
            const stageApplications = getApplicationsByStage(stage.id).filter(app => {
              if (!searchTerm) return true;
              const search = searchTerm.toLowerCase();
              const candidate = app.candidateSnapshot || app.candidateId;
              
              return (
                candidate.fullName?.toLowerCase().includes(search) ||
                candidate.email?.toLowerCase().includes(search) ||
                candidate.skills?.some(skill => skill.toLowerCase().includes(search))
              );
            });
            
            return (
              <div key={stage.id} className={`${stage.color} border rounded-lg`}>
                <div className="p-4 border-b bg-white/50">
                  <h3 className="font-semibold">{stage.label}</h3>
                  <p className="text-sm text-gray-600">{stageApplications.length} candidates</p>
                </div>
                
                <div className="p-4 space-y-3 min-h-[400px]">
                  {stageApplications.map(app => {
                    const candidate = app.candidateSnapshot || app.candidateId;
                    const isSelected = selectedApplication === app._id;
                    
                    return (
                      <Card 
                        key={app._id} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          isSelected ? 'ring-2 ring-[#0061A8]' : ''
                        }`}
                        onClick={() => setSelectedApplication(isSelected ? null : app._id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar size="sm">
                                <AvatarInitials>
                                  {getInitials(candidate.fullName)}
                                </AvatarInitials>
                              </Avatar>
                              <div>
                                <h4 className="font-medium text-sm">
                                  {candidate.fullName}
                                </h4>
                                <p className="text-xs text-gray-600">
                                  {candidate.experience || 0} years exp
                                </p>
                              </div>
                            </div>
                            <div className={`text-lg font-bold ${getScoreColor(app.score)}`}>
                              {app.score}%
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="mt-3 space-y-2 text-xs">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="w-3 h-3" />
                                <span className="truncate">{candidate.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="w-3 h-3" />
                                {candidate.phone}
                              </div>
                              {candidate.location && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <MapPin className="w-3 h-3" />
                                  {candidate.location}
                                </div>
                              )}
                              
                              <div className="flex flex-wrap gap-1 mt-2">
                                {candidate.skills.slice(0, 3).map((skill, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {candidate.skills.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{candidate.skills.length - 3}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex gap-2 mt-3">
                                <Link href={`/hr/ats/applications/${app._id}`}>
                                  <Button size="sm" variant="outline" className="text-xs">
                                    View Details
                                  </Button>
                                </Link>
                                {stage.id !== 'hired' && stage.id !== 'rejected' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentIndex = STAGES.findIndex(s => s.id === stage.id);
                                      if (currentIndex < STAGES.length - 2) {
                                        handleStageChange(app._id, STAGES[currentIndex + 1].id);
                                      }
                                    }}
                                  >
                                    Move Forward
                                    <ChevronRight className="w-3 h-3 ml-1" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4 text-center">
            {STAGES.map(stage => {
              const count = getApplicationsByStage(stage.id).length;
              const percentage = applications.length > 0 
                ? Math.round((count / applications.length) * 100) 
                : 0;
              
              return (
                <div key={stage.id}>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-gray-600">{percentage}%</div>
                  <div className="text-xs text-gray-500">{stage.label}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
