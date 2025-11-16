"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/ats/rbac';
import type { ATSRole } from '@/lib/ats/rbac';

/**
 * ATS Recruitment Dashboard (Monday.com-style)
 * 
 * Phase 1: Layout freeze compliance
 * - Single global Header + Sidebar (inherited from dashboard layout)
 * - Tabs for sub-navigation (Jobs, Applications, Interviews, Pipeline, Settings)
 * - RBAC: Different views based on role permissions
 * 
 * Phase 2-4: Feature implementation
 */

export default function RecruitmentPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<string>('jobs');
  
  const userRole = (session?.user?.role || 'Candidate') as ATSRole;
  
  // RBAC checks
  const canManageJobs = hasPermission(userRole, 'jobs:create');
  const canViewApplications = hasPermission(userRole, 'applications:read');
  const canScheduleInterviews = hasPermission(userRole, 'interviews:create');
  const canViewSettings = hasPermission(userRole, 'settings:read');

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
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold mb-2">Jobs Management</h2>
            <p className="text-muted-foreground mb-4">
              Create and manage job postings. View active, draft, and closed positions.
            </p>
            <p className="text-sm text-muted-foreground">
              Phase 2: Job board with filters, search, and bulk actions
            </p>
          </div>
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
