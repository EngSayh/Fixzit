"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { hasPermission } from '@/lib/ats/rbac';
import type { ATSRole } from '@/lib/ats/rbac';

/**
 * ATS Recruitment Dashboard (Monday.com-style)
 * 
 * Phase 1: Layout + Data Fetching
 * - Single global Header + Sidebar (inherited from dashboard layout)
 * - Tabs for sub-navigation (Jobs, Applications, Interviews, Pipeline, Settings)
 * - RBAC: Different views based on role permissions
 * - Real-time data fetching with SWR
 * 
 * Phase 2-4: Feature implementation
 */

// SWR fetcher with proper error handling for 402 Payment Required
const fetcher = async (url: string) => {
  const res = await fetch(url);
  
  // Handle ATS not enabled (402 Payment Required)
  if (res.status === 402) {
    const err: any = new Error('ATS not enabled');
    err.status = 402;
    err.data = await res.json().catch(() => ({}));
    throw err;
  }
  
  // Handle other errors
  if (!res.ok) {
    const err: any = new Error(`Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  
  return res.json();
};

export default function RecruitmentPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('jobs');
  
  const userRole = (session?.user?.role || 'Candidate') as ATSRole;
  
  // Fetch jobs data
  const { data: jobsData, error: jobsError, isLoading: jobsLoading } = useSWR(
    '/api/ats/jobs?status=all',
    fetcher
  );
  
  // Handle 402 Payment Required - redirect to upgrade page
  if (jobsError && (jobsError as any)?.status === 402) {
    router.push('/billing/upgrade?feature=ats');
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2">ATS Not Enabled</h2>
          <p className="text-muted-foreground mb-4">Redirecting to upgrade page...</p>
        </div>
      </div>
    );
  }
  
  // RBAC checks
  const canManageJobs = hasPermission(userRole, 'jobs:create');
  const canViewApplications = hasPermission(userRole, 'applications:read');
  const canScheduleInterviews = hasPermission(userRole, 'interviews:create');
  const canViewSettings = hasPermission(userRole, 'settings:read');
  
  const jobs = jobsData?.data || [];
  const jobsCount = jobs.length;

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Recruitment (ATS)</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Applicant Tracking System - Manage jobs, applications, and interviews
            </p>
          </div>
          
          {canManageJobs && (
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              + New Job
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation (Monday-style) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-background px-6 h-12">
          <TabsTrigger value="jobs" className="data-[state=active]:border-b-2 data-[state=active]:border-primary">
            📋 Jobs
          </TabsTrigger>
          
          {canViewApplications && (
            <TabsTrigger value="applications" className="data-[state=active]:border-b-2 data-[state=active]:border-primary">
              📝 Applications
            </TabsTrigger>
          )}
          
          {canScheduleInterviews && (
            <TabsTrigger value="interviews" className="data-[state=active]:border-b-2 data-[state=active]:border-primary">
              🗓️ Interviews
            </TabsTrigger>
          )}
          
          {canViewApplications && (
            <TabsTrigger value="pipeline" className="data-[state=active]:border-b-2 data-[state=active]:border-primary">
              📊 Pipeline
            </TabsTrigger>
          )}
          
          {canViewSettings && (
            <TabsTrigger value="settings" className="data-[state=active]:border-b-2 data-[state=active]:border-primary">
              ⚙️ Settings
            </TabsTrigger>
          )}
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="flex-1 p-6">
          {jobsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading jobs...</p>
              </div>
            </div>
          ) : jobsError ? (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Jobs</h3>
              <p className="text-sm text-muted-foreground">{jobsError.message}</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-card border rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-xl font-semibold mb-2">No Jobs Yet</h2>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first job posting.
              </p>
              {canManageJobs && (
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                  + Create First Job
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">All Jobs ({jobsCount})</h2>
                <div className="flex gap-2">
                  <select className="px-3 py-2 border rounded-md text-sm">
                    <option value="all">All Status</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              
              <div className="grid gap-4">
                {jobs.map((job: any) => (
                  <div key={job._id} className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">{job.title}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            job.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            job.status === 'draft' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span>📍 {job.location?.city || 'Remote'}</span>
                          <span>💼 {job.jobType || 'Full-time'}</span>
                          <span>🏢 {job.department || 'N/A'}</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {job.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            📝 {job.applicationCount || 0} applications
                          </span>
                          <span className="text-muted-foreground">
                            📅 Posted {new Date(job.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button className="px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors">
                          View
                        </button>
                        {canManageJobs && (
                          <button className="px-3 py-1 text-sm border rounded-md hover:bg-accent transition-colors">
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Applications Tab */}
        {canViewApplications && (
          <TabsContent value="applications" className="flex-1 p-6">
            <div className="bg-card border rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-xl font-semibold mb-2">Applications</h2>
              <p className="text-muted-foreground mb-4">
                Review candidate applications, update stages, and add notes.
              </p>
              <p className="text-sm text-muted-foreground">
                Phase 2: Kanban board with drag-drop stage transitions
              </p>
            </div>
          </TabsContent>
        )}

        {/* Interviews Tab */}
        {canScheduleInterviews && (
          <TabsContent value="interviews" className="flex-1 p-6">
            <div className="bg-card border rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">🗓️</div>
              <h2 className="text-xl font-semibold mb-2">Interviews</h2>
              <p className="text-muted-foreground mb-4">
                Schedule interviews, send calendar invites, and collect feedback.
              </p>
              <p className="text-sm text-muted-foreground">
                Phase 2: Calendar view with ICS generation and feedback forms
              </p>
            </div>
          </TabsContent>
        )}

        {/* Pipeline Tab */}
        {canViewApplications && (
          <TabsContent value="pipeline" className="flex-1 p-6">
            <div className="bg-card border rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-xl font-semibold mb-2">Recruitment Pipeline</h2>
              <p className="text-muted-foreground mb-4">
                Visualize candidate flow, conversion rates, and bottlenecks.
              </p>
              <p className="text-sm text-muted-foreground">
                Phase 3: Analytics dashboard with charts and metrics
              </p>
            </div>
          </TabsContent>
        )}

        {/* Settings Tab */}
        {canViewSettings && (
          <TabsContent value="settings" className="flex-1 p-6">
            <div className="bg-card border rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">⚙️</div>
              <h2 className="text-xl font-semibold mb-2">ATS Settings</h2>
              <p className="text-muted-foreground mb-4">
                Configure screening rules, email templates, and integrations.
              </p>
              <p className="text-sm text-muted-foreground">
                Phase 4: Settings forms for workflows and automation
              </p>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
