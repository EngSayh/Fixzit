'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { CardGridSkeleton } from '@/components/skeletons';
import { logger } from '@/lib/logger';
import { 
  Briefcase, Plus, Search, Calendar, DollarSign, Users, Eye, Edit, Trash2, 
  Construction, Hammer, PaintBucket, Building 
} from 'lucide-react';

interface ProjectItem {
  id: string;
  name?: string;
  code?: string;
  type?: string;
  status?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: {
    total?: number;
    currency?: string;
  };
  team?: unknown[];
  timeline?: {
    endDate?: string;
  };
  progress?: {
    overall?: number;
  };
}

export default function ProjectsPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const orgId = session?.user?.orgId;

  // Fetcher with dynamic tenant ID from session
  const fetcher = (url: string) => {
    if (!orgId) return Promise.reject(new Error('No organization ID'));
    return fetch(url, { 
      headers: { 'x-tenant-id': orgId } 
    })
      .then(r => r.json())
      .catch(error => {
        console.error('FM projects fetch error:', error);
        throw error;
      });
  };

  const { data, mutate, isLoading } = useSWR(
    orgId ? `/api/projects?search=${encodeURIComponent(search)}&type=${typeFilter}&status=${statusFilter}` : null,
    fetcher
  );

  const projects = data?.items || [];

  // Show loading state if no session yet
  if (!session) {
    return <CardGridSkeleton count={6} />;
  }

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error: No organization ID found. Please contact support.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Management</h1>
          <p className="text-muted-foreground">Gantt tracking, milestones, and resource management</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary">
              <Plus className="w-4 h-4 me-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <CreateProjectForm orgId={orgId} onCreated={() => { mutate(); setCreateOpen(false); }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Project Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="NEW_CONSTRUCTION">New Construction</SelectItem>
                <SelectItem value="RENOVATION">Renovation</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="FIT_OUT">Fit Out</SelectItem>
                <SelectItem value="DEMOLITION">Demolition</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="PLANNING">Planning</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(projects as ProjectItem[]).map((project) => (
              <ProjectCard key={project.id} project={project} orgId={orgId} onUpdated={mutate} />
            ))}
          </div>

          {/* Empty State */}
          {projects.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Projects Found</h3>
                <p className="text-muted-foreground mb-4">Get started by creating your first project.</p>
                <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary">
                  <Plus className="w-4 h-4 me-2" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ProjectCard({ project, orgId, onUpdated }: { project: ProjectItem; orgId?: string; onUpdated: () => void }) {
  const router = useRouter();
  const handleDelete = async () => {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    if (!orgId) return toast.error('Organization ID missing');

    const toastId = toast.loading('Deleting project...');
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': orgId }
      });
      if (!res.ok) throw new Error('Failed to delete project');
      toast.success('Project deleted successfully', { id: toastId });
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete project', { id: toastId });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'NEW_CONSTRUCTION':
        return <Construction className="w-5 h-5" />;
      case 'RENOVATION':
        return <Hammer className="w-5 h-5" />;
      case 'MAINTENANCE':
        return <PaintBucket className="w-5 h-5" />;
      case 'FIT_OUT':
        return <Building className="w-5 h-5" />;
      default:
        return <Briefcase className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return 'bg-muted text-foreground';
      case 'APPROVED':
        return 'bg-success/10 text-success';
      case 'IN_PROGRESS':
        return 'bg-primary/10 text-primary';
      case 'ON_HOLD':
        return 'bg-accent/10 text-accent-foreground';
      case 'COMPLETED':
        return 'bg-success/10 text-success';
      case 'CANCELLED':
        return 'bg-destructive/10 text-destructive';
      case 'CLOSED':
        return 'bg-secondary/10 text-secondary';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const daysRemaining = project.timeline?.endDate 
    ? Math.ceil((new Date(project.timeline.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon(project.type || '')}
            <div className="flex-1">
              <CardTitle className="text-lg">{project.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{project.code}</p>
            </div>
          </div>
          <Badge className={getStatusColor(project.status || '')}>
            {project.status?.toLowerCase().replace('_', ' ') || ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>

        {/* Progress Indicators */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{project.progress?.overall || 0}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${project.progress?.overall || 0}%` }}
            />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="flex items-center text-muted-foreground">
              <Calendar className="w-4 h-4 me-1" />
              Timeline
            </div>
            <p className="font-medium mt-1">
              {daysRemaining !== null ? (
                daysRemaining > 0 
                  ? `${daysRemaining} days left`
                  : `${Math.abs(daysRemaining)} days overdue`
              ) : 'No deadline'}
            </p>
          </div>
          <div>
            <div className="flex items-center text-muted-foreground">
              <DollarSign className="w-4 h-4 me-1" />
              Budget
            </div>
            <p className="font-medium mt-1">
              {project.budget?.total?.toLocaleString() || 'N/A'} {project.budget?.currency || 'SAR'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {project.team?.length || 0} team members
            </span>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push(`/fm/projects/${project.id}`)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push(`/fm/projects/${project.id}/edit`)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-destructive hover:text-destructive/90"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateProjectForm({ onCreated, orgId }: { onCreated: () => void; orgId: string }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    propertyId: '',
    location: {
      address: '',
      city: '',
      coordinates: { lat: 24.7136, lng: 46.6753 }
    },
    timeline: {
      startDate: '', // ✅ HYDRATION FIX: Initialize empty
      endDate: '', // ✅ HYDRATION FIX: Initialize empty
      duration: 90
    },
    budget: {
      total: 0,
      currency: 'SAR'
    },
    tags: [] as string[]
  });

  // ✅ HYDRATION FIX: Set default dates after client hydration
  useEffect(() => {
    if (!formData.timeline.startDate) {
      setFormData(prev => ({
        ...prev,
        timeline: {
          ...prev.timeline,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      }));
    }
  }, [formData.timeline.startDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgId) {
      toast.error('No organization ID found');
      return;
    }

    const toastId = toast.loading('Creating project...');

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-tenant-id': orgId 
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Project created successfully', { id: toastId });
        onCreated();
      } else {
        const error = await response.json();
        toast.error(`Failed to create project: ${error.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (error) {
      logger.error('Error creating project:', error);
      toast.error('Error creating project. Please try again.', { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Project Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type *</label>
          <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW_CONSTRUCTION">New Construction</SelectItem>
              <SelectItem value="RENOVATION">Renovation</SelectItem>
              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              <SelectItem value="FIT_OUT">Fit Out</SelectItem>
              <SelectItem value="DEMOLITION">Demolition</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date *</label>
          <Input
            type="date"
            value={formData.timeline.startDate}
            onChange={(e) => setFormData({...formData, timeline: {...formData.timeline, startDate: e.target.value}})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date *</label>
          <Input
            type="date"
            value={formData.timeline.endDate}
            onChange={(e) => setFormData({...formData, timeline: {...formData.timeline, endDate: e.target.value}})}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Budget *</label>
          <Input
            type="number"
            value={formData.budget.total}
            onChange={(e) => setFormData({...formData, budget: {...formData.budget, total: Number(e.target.value)}})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">City</label>
          <Input
            value={formData.location.city}
            onChange={(e) => setFormData({...formData, location: {...formData.location, city: e.target.value}})}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" className="bg-primary hover:bg-primary">
          Create Project
        </Button>
      </div>
    </form>
  );
}
