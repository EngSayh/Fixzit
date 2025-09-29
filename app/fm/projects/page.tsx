'use client';

import { useState } from &apos;react&apos;;
import useSWR from 'swr&apos;;
import { Button } from &apos;@/src/components/ui/button&apos;;
import { Input } from &apos;@/src/components/ui/input&apos;;
import { Card, CardContent, CardHeader, CardTitle } from &apos;@/src/components/ui/card&apos;;
import { Badge } from &apos;@/src/components/ui/badge&apos;;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from &apos;@/src/components/ui/dialog&apos;;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from &apos;@/src/components/ui/select&apos;;
import { Textarea } from &apos;@/src/components/ui/textarea&apos;;
import { Separator } from &apos;@/src/components/ui/separator&apos;;
import { 
  Briefcase, Plus, Search, Filter, Calendar, DollarSign, 
  TrendingUp, Users, Eye, Edit, Trash2, BarChart3, 
  Construction, Hammer, PaintBucket, Building 
} from &apos;lucide-react&apos;;

const fetcher = (url: string) => fetch(url, { headers: { "x-tenant-id": "demo-tenant" } }).then(r => r.json());

export default function ProjectsPage() {
  const [search, setSearch] = useState(&apos;');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(&apos;');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, mutate } = useSWR(
    `/api/projects?search=${encodeURIComponent(search)}&type=${typeFilter}&status=${statusFilter}`,
    fetcher
  );

  const projects = data?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Management</h1>
          <p className="text-gray-600">Gantt tracking, milestones, and resource management</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <CreateProjectForm onCreated={() => { mutate(); setCreateOpen(false); }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project: any) => (
          <ProjectCard key={project._id} project={project} onUpdated={mutate} />
        ))}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Projects Found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first project.</p>
            <Button onClick={() => setCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProjectCard({ project, onUpdated }: { project: any; onUpdated: () => void }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'NEW_CONSTRUCTION&apos;:
        return <Construction className="w-5 h-5" />;
      case 'RENOVATION&apos;:
        return <Hammer className="w-5 h-5" />;
      case 'MAINTENANCE&apos;:
        return <PaintBucket className="w-5 h-5" />;
      case 'FIT_OUT&apos;:
        return <Building className="w-5 h-5" />;
      default:
        return <Briefcase className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING&apos;:
        return &apos;bg-gray-100 text-gray-800&apos;;
      case &apos;APPROVED&apos;:
        return &apos;bg-green-100 text-green-800&apos;;
      case &apos;IN_PROGRESS&apos;:
        return &apos;bg-blue-100 text-blue-800&apos;;
      case &apos;ON_HOLD&apos;:
        return &apos;bg-yellow-100 text-yellow-800&apos;;
      case &apos;COMPLETED&apos;:
        return &apos;bg-emerald-100 text-emerald-800&apos;;
      case &apos;CANCELLED&apos;:
        return &apos;bg-red-100 text-red-800&apos;;
      case &apos;CLOSED&apos;:
        return &apos;bg-purple-100 text-purple-800&apos;;
      default:
        return &apos;bg-gray-100 text-gray-800&apos;;
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
            {getTypeIcon(project.type)}
            <div className="flex-1">
              <CardTitle className="text-lg">{project.name}</CardTitle>
              <p className="text-sm text-gray-600">{project.code}</p>
            </div>
          </div>
          <Badge className={getStatusColor(project.status)}>
            {project.status.toLowerCase().replace(&apos;_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>

        {/* Progress Indicators */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Overall Progress</span>
            <span className="font-medium">{project.progress?.overall || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${project.progress?.overall || 0}%` }}
            />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="flex items-center text-gray-600">
              <Calendar className="w-4 h-4 mr-1" />
              Timeline
            </div>
            <p className="font-medium mt-1">
              {daysRemaining !== null ? (
                daysRemaining > 0 
                  ? `${daysRemaining} days left`
                  : `${Math.abs(daysRemaining)} days overdue`
              ) : &apos;No deadline&apos;}
            </p>
          </div>
          <div>
            <div className="flex items-center text-gray-600">
              <DollarSign className="w-4 h-4 mr-1" />
              Budget
            </div>
            <p className="font-medium mt-1">
              {project.budget?.total?.toLocaleString() || 'N/A&apos;} {project.budget?.currency || &apos;SAR&apos;}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {project.team?.length || 0} team members
            </span>
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateProjectForm({ onCreated }: { onCreated: () => void }) {
  const [formData, setFormData] = useState({
    name: &apos;',
    description: '',
    type: &apos;',
    propertyId: '',
    location: {
      address: &apos;',
      city: '',
      coordinates: { lat: 24.7136, lng: 46.6753 }
    },
    timeline: {
      startDate: new Date().toISOString().split(&apos;T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      duration: 90
    },
    budget: {
      total: 0,
      currency: &apos;SAR&apos;
    },
    tags: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(&apos;/api/projects&apos;, {
        method: &apos;POST&apos;,
        headers: { &apos;Content-Type&apos;: &apos;application/json&apos;, &apos;x-tenant-id&apos;: &apos;demo-tenant&apos; },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onCreated();
      } else {
        alert(&apos;Failed to create project&apos;);
      }
    } catch (error) {
      alert(&apos;Error creating project&apos;);
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
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
          Create Project
        </Button>
      </div>
    </form>
  );
}