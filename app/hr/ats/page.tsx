'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { 
  Users, 
  Briefcase, 
  FileText, 
  Calendar,
  BarChart3,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import Link from 'next/link';

interface StageStats {
  _id: string;
  count: number;
  avgScore: number;
}

export default function AtsHomePage() {
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    pendingReviews: 0,
    upcomingInterviews: 0,
    openOffers: 0
  });
  
  const [stageStats, setStageStats] = useState<StageStats[]>([]);
  const [recentApplications, setRecentApplications] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch job stats
      const jobsRes = await fetch('/api/ats/jobs?status=published&limit=100');
      const jobsData = await jobsRes.json();
      
      // Fetch application stats
      const appsRes = await fetch('/api/ats/applications?limit=5');
      const appsData = await appsRes.json();
      
      if (jobsData.success) {
        setStats(prev => ({
          ...prev,
          activeJobs: jobsData.data.length,
          totalJobs: jobsData.pagination.total
        }));
      }
      
      if (appsData.success) {
        setStageStats(appsData.stageStats || []);
        setRecentApplications(appsData.data || []);
        
        // Calculate stats from stage data
        const totalApps = appsData.stageStats.reduce((sum: number, stage: StageStats) => sum + stage.count, 0);
        const pendingCount = appsData.stageStats
          .filter((s: StageStats) => s._id === 'applied' || s._id === 'screened')
          .reduce((sum: number, stage: StageStats) => sum + stage.count, 0);
        const interviewCount = appsData.stageStats
          .find((s: StageStats) => s._id === 'interview')?.count || 0;
        const offerCount = appsData.stageStats
          .find((s: StageStats) => s._id === 'offer')?.count || 0;
          
        setStats(prev => ({
          ...prev,
          totalApplications: totalApps,
          pendingReviews: pendingCount,
          upcomingInterviews: interviewCount,
          openOffers: offerCount
        }));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      applied: 'bg-blue-100 text-blue-800',
      screened: 'bg-purple-100 text-purple-800',
      interview: 'bg-yellow-100 text-yellow-800',
      offer: 'bg-green-100 text-green-800',
      hired: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Recruitment (ATS)</h1>
          <p className="text-gray-600 mt-1">Manage jobs, candidates, and hiring pipeline</p>
        </div>
        <div className="flex gap-3">
          <Link href="/hr/ats/jobs/new">
            <Button className="bg-[#0061A8] hover:bg-[#0061A8]/90">
              <Plus className="w-4 h-4 mr-2" />
              Post New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobs}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalJobs} total positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingReviews} pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Interviews</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingInterviews}</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Offers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openOffers}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Application Pipeline</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-4">
                {['applied', 'screened', 'interview', 'offer', 'hired', 'rejected'].map(stage => {
                  const stageStat = stageStats.find(s => s._id === stage);
                  return (
                    <div key={stage} className="text-center">
                      <h4 className="font-medium capitalize mb-2">{stage}</h4>
                      <div className="text-2xl font-bold">
                        {stageStat?.count || 0}
                      </div>
                      {stageStat && stageStat.avgScore > 0 && (
                        <p className="text-xs text-gray-500">
                          Avg: {Math.round(stageStat.avgScore)}%
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Applications */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentApplications.map((app: any) => (
                  <div key={app._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <h4 className="font-medium">
                          {app.candidateId?.firstName} {app.candidateId?.lastName}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {app.jobId?.title} • {app.jobId?.department}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getStageColor(app.stage)}>
                        {app.stage}
                      </Badge>
                      <div className="text-right">
                        <div className="font-medium">Score: {app.score}%</div>
                        <div className="text-xs text-gray-500">
                          {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Link href={`/hr/ats/applications/${app._id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Manage Jobs</CardTitle>
                <Link href="/hr/ats/jobs">
                  <Button variant="outline">View All Jobs</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">View and manage all job postings</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="candidates">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Candidate Database</CardTitle>
                <Link href="/hr/ats/candidates">
                  <Button variant="outline">View All Candidates</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Search and manage candidate profiles</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interviews">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Interview Schedule</CardTitle>
                <Link href="/hr/ats/interviews">
                  <Button variant="outline">View Calendar</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Manage interview schedules and feedback</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Recruitment Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Analytics dashboard coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
