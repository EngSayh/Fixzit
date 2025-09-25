'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Users,
  Calendar,
  DollarSign,
  MapPin,
  Briefcase,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/src/lib/utils';

interface Job {
  _id: string;
  title: string;
  department: string;
  location: {
    city: string;
    country: string;
    mode: string;
  };
  jobType: string;
  status: string;
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  applicationCount: number;
  viewCount: number;
  publishedAt?: string;
  createdAt: string;
  urgent?: boolean;
  featured?: boolean;
}

/**
 * Client-side page component that displays and manages ATS job postings.
 *
 * Renders a searchable, filterable, and paginated list of jobs with controls to
 * view, edit, publish, view applications, and delete postings. Fetches job data
 * from /api/ats/jobs and updates component state; publishing and deletion are
 * performed via POST/DELETE requests to the corresponding API endpoints and
 * trigger a refetch on success.
 *
 * The component maintains local state for jobs, loading, search, status and
 * department filters, and pagination.
 *
 * @returns The Jobs Management page as a React element.
 */
export default function JobsManagementPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchJobs();
  }, [searchTerm, statusFilter, departmentFilter, pagination.page]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: statusFilter,
        q: searchTerm
      });
      
      if (departmentFilter !== 'all') {
        params.append('department', departmentFilter);
      }
      
      const response = await fetch(`/api/ats/jobs?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    try {
      const response = await fetch(`/api/ats/jobs/${jobId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  };

  const handlePublish = async (jobId: string) => {
    try {
      const response = await fetch(`/api/ats/jobs/${jobId}/publish`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to publish job:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'closed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getJobTypeIcon = (type: string) => {
    switch (type) {
      case 'full-time': return <Briefcase className="w-4 h-4" />;
      case 'part-time': return <Calendar className="w-4 h-4" />;
      case 'contract': return <FileText className="w-4 h-4" />;
      default: return <Briefcase className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Jobs Management</h1>
          <p className="text-gray-600 mt-1">Create and manage job postings</p>
        </div>
        <Link href="/hr/ats/jobs/new">
          <Button className="bg-[#0061A8] hover:bg-[#0061A8]/90">
            <Plus className="w-4 h-4 mr-2" />
            Create New Job
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="Procurement">Procurement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-[#0061A8] border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading jobs...</p>
            </CardContent>
          </Card>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No jobs found</p>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job._id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{job.title}</h3>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                          {job.urgent && (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              Urgent
                            </Badge>
                          )}
                          {job.featured && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                              Featured
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {job.department}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location.city}, {job.location.country}
                          </div>
                          <div className="flex items-center gap-1">
                            {getJobTypeIcon(job.jobType)}
                            {job.jobType}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {formatCurrency(job.salaryRange.min)} - {formatCurrency(job.salaryRange.max)}
                          </div>
                        </div>
                        
                        <div className="flex gap-6 text-sm">
                          <div>
                            <span className="text-gray-500">Applications:</span>
                            <span className="font-medium ml-1">{job.applicationCount}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Views:</span>
                            <span className="font-medium ml-1">{job.viewCount}</span>
                          </div>
                          {job.publishedAt && (
                            <div>
                              <span className="text-gray-500">Published:</span>
                              <span className="font-medium ml-1">
                                {formatDate(job.publishedAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    {job.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePublish(job._id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        Publish
                      </Button>
                    )}
                    
                    <Link href={`/hr/ats/jobs/${job._id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </Link>
                    
                    <Link href={`/hr/ats/jobs/${job._id}/applications`}>
                      <Button size="sm" variant="outline">
                        <Users className="w-4 h-4 mr-2" />
                        Applications
                      </Button>
                    </Link>
                    
                    <Link href={`/hr/ats/jobs/${job._id}/edit`}>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(job._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === pagination.page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            disabled={pagination.page === pagination.pages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}