"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CardGridSkeleton } from "@/components/skeletons";
import { logger } from "@/lib/logger";
import {
  Briefcase,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Users,
  Eye,
  Edit,
  Trash2,
  Construction,
  Hammer,
  PaintBucket,
  Building,
} from "@/components/ui/icons";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { FmGuardedPage } from "@/components/fm/FmGuardedPage";

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
  return (
    <FmGuardedPage moduleId="projects">
      {({ orgId, supportBanner }) => (
        <ProjectsContent orgId={orgId} supportBanner={supportBanner} />
      )}
    </FmGuardedPage>
  );
}

type ProjectsContentProps = {
  orgId: string;
  supportBanner?: ReactNode | null;
};

function ProjectsContent({ orgId, supportBanner }: ProjectsContentProps) {
  const { data: session } = useSession();
  const auto = useAutoTranslator("fm.projects");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // Fetcher with dynamic tenant ID from session
  const fetcher = (url: string) =>
    fetch(url, {
      headers: { "x-tenant-id": orgId },
    })
      .then((r) => r.json())
      .catch((error) => {
        logger.error("FM projects fetch error", error);
        throw error;
      });

  const { data, mutate, isLoading } = useSWR(
    orgId
      ? [
          `/api/projects?search=${encodeURIComponent(search)}&type=${typeFilter}&status=${statusFilter}`,
          orgId,
        ]
      : null,
    ([url]) => fetcher(url),
  );

  const projects = data?.items || [];

  // Show loading state if no session yet
  if (!session) {
    return <CardGridSkeleton count={6} />;
  }

  return (
    <div className="space-y-6">
      {supportBanner}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {auto("Project Management", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Gantt tracking, milestones, and resource management",
              "header.subtitle",
            )}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary" aria-label={auto("Create a new project", "actions.newAria")}>
              <Plus className="w-4 h-4 me-2" />
              {auto("New Project", "actions.new")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {auto("Create New Project", "dialog.title")}
              </DialogTitle>
            </DialogHeader>
            <CreateProjectForm
              orgId={orgId}
              onCreated={() => {
                mutate();
                setCreateOpen(false);
              }}
            />
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
                  placeholder={auto(
                    "Search projects...",
                    "filters.searchPlaceholder",
                  )}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-10"
                />
              </div>
            </div>
            <Select
              value={typeFilter}
              onValueChange={setTypeFilter}
              placeholder={auto("Project Type", "filters.type")}
              className="w-48"
            >
                <SelectItem value="">
                  {auto("All Types", "filters.allTypes")}
                </SelectItem>
                <SelectItem value="NEW_CONSTRUCTION">
                  {auto("New Construction", "filters.types.newConstruction")}
                </SelectItem>
                <SelectItem value="RENOVATION">
                  {auto("Renovation", "filters.types.renovation")}
                </SelectItem>
                <SelectItem value="MAINTENANCE">
                  {auto("Maintenance", "filters.types.maintenance")}
                </SelectItem>
                <SelectItem value="FIT_OUT">
                  {auto("Fit Out", "filters.types.fitOut")}
                </SelectItem>
                <SelectItem value="DEMOLITION">
                  {auto("Demolition", "filters.types.demolition")}
                </SelectItem>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder={auto("Status", "filters.status")}
              className="w-48"
            >
                <SelectItem value="">
                  {auto("All Status", "filters.allStatus")}
                </SelectItem>
                <SelectItem value="PLANNING">
                  {auto("Planning", "status.planning")}
                </SelectItem>
                <SelectItem value="APPROVED">
                  {auto("Approved", "status.approved")}
                </SelectItem>
                <SelectItem value="IN_PROGRESS">
                  {auto("In Progress", "status.inProgress")}
                </SelectItem>
                <SelectItem value="ON_HOLD">
                  {auto("On Hold", "status.onHold")}
                </SelectItem>
                <SelectItem value="COMPLETED">
                  {auto("Completed", "status.completed")}
                </SelectItem>
                <SelectItem value="CANCELLED">
                  {auto("Cancelled", "status.cancelled")}
                </SelectItem>
                <SelectItem value="CLOSED">
                  {auto("Closed", "status.closed")}
                </SelectItem>
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
              <ProjectCard
                key={project.id}
                project={project}
                orgId={orgId}
                onUpdated={mutate}
              />
            ))}
          </div>

          {/* Empty State */}
          {projects.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {auto("No Projects Found", "empty.title")}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {auto(
                    "Get started by creating your first project.",
                    "empty.subtitle",
                  )}
                </p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="bg-primary hover:bg-primary"
                  aria-label={auto("Create your first project", "actions.createAria")}
                >
                  <Plus className="w-4 h-4 me-2" />
                  {auto("Create Project", "actions.create")}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  orgId,
  onUpdated,
}: {
  project: ProjectItem;
  orgId?: string;
  onUpdated: () => void;
}) {
  const router = useRouter();
  const auto = useAutoTranslator("fm.projects.card");
  const handleDelete = async () => {
    if (
      !confirm(
        auto(
          'Delete project "{{name}}"? This cannot be undone.',
          "actions.confirmDelete",
        ).replace("{{name}}", project.name ?? ""),
      )
    ) {
      return;
    }
    if (!orgId)
      return toast.error(auto("Organization ID missing", "errors.noOrg"));

    const toastId = toast.loading(
      auto("Deleting project...", "toast.deleting"),
    );
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
        headers: { "x-tenant-id": orgId },
      });
      if (!res.ok)
        throw new Error(auto("Failed to delete project", "toast.deleteFailed"));
      toast.success(
        auto("Project deleted successfully", "toast.deleteSuccess"),
        { id: toastId },
      );
      onUpdated();
    } catch (_error) {
      toast.error(
        _error instanceof Error
          ? _error.message
          : auto("Failed to delete project", "toast.deleteFailed"),
        { id: toastId },
      );
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "NEW_CONSTRUCTION":
        return <Construction className="w-5 h-5" />;
      case "RENOVATION":
        return <Hammer className="w-5 h-5" />;
      case "MAINTENANCE":
        return <PaintBucket className="w-5 h-5" />;
      case "FIT_OUT":
        return <Building className="w-5 h-5" />;
      default:
        return <Briefcase className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PLANNING":
        return "bg-muted text-foreground";
      case "APPROVED":
        return "bg-success/10 text-success";
      case "IN_PROGRESS":
        return "bg-primary/10 text-primary";
      case "ON_HOLD":
        return "bg-accent/10 text-accent-foreground";
      case "COMPLETED":
        return "bg-success/10 text-success";
      case "CANCELLED":
        return "bg-destructive/10 text-destructive";
      case "CLOSED":
        return "bg-secondary/10 text-secondary";
      default:
        return "bg-muted text-foreground";
    }
  };

  const daysRemaining = project.timeline?.endDate
    ? Math.ceil(
        (new Date(project.timeline.endDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon(project.type || "")}
            <div className="flex-1">
              <CardTitle className="text-lg">{project.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{project.code}</p>
            </div>
          </div>
          <Badge className={getStatusColor(project.status || "")}>
            {project.status?.toLowerCase().replace("_", " ") || ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {project.description}
        </p>

        {/* Progress Indicators */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {auto("Overall Progress", "overall")}
            </span>
            <span className="font-medium">
              {project.progress?.overall || 0}%
            </span>
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
              {auto("Timeline", "timeline")}
            </div>
            <p className="font-medium mt-1">
              {daysRemaining !== null
                ? daysRemaining > 0
                  ? auto("{{count}} days left", "daysLeft").replace(
                      "{{count}}",
                      String(daysRemaining),
                    )
                  : auto("{{count}} days overdue", "daysOverdue").replace(
                      "{{count}}",
                      String(Math.abs(daysRemaining)),
                    )
                : auto("No deadline", "noDeadline")}
            </p>
          </div>
          <div>
            <div className="flex items-center text-muted-foreground">
              <DollarSign className="w-4 h-4 me-1" />
              {auto("Budget", "budget")}
            </div>
            <p className="font-medium mt-1">
              {(project.budget?.total?.toLocaleString() ||
                auto("N/A", "notAvailable")) +
                " " +
                (project.budget?.currency || "SAR")}
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
              aria-label={`View project ${project.name}`}
              title={`View ${project.name} details`}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/fm/projects/${project.id}/edit`)}
              aria-label={`Edit project ${project.name}`}
              title={`Edit ${project.name}`}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive/90"
              onClick={handleDelete}
              aria-label={`Delete project ${project.name}`}
              title={`Delete ${project.name} permanently`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateProjectForm({
  onCreated,
  orgId,
}: {
  onCreated: () => void;
  orgId: string;
}) {
  const auto = useAutoTranslator("fm.projects.form");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "",
    propertyId: "",
    location: {
      address: "",
      city: "",
      coordinates: { lat: 24.7136, lng: 46.6753 },
    },
    timeline: {
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      duration: 90,
    },
    budget: {
      total: 0,
      currency: "SAR",
    },
    tags: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgId) {
      toast.error(auto("No organization ID found", "errors.noOrg"));
      return;
    }

    const toastId = toast.loading(auto("Creating project...", "loading"));

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": orgId,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(auto("Project created successfully", "success"), {
          id: toastId,
        });
        onCreated();
      } else {
        const error = await response.json();
        toast.error(
          auto("Failed to create project: {{error}}", "failed").replace(
            "{{error}}",
            error.error || auto("Unknown error", "unknown"),
          ),
          { id: toastId },
        );
      }
    } catch (_error) {
      logger.error("Error creating project:", _error);
      toast.error(auto("Error creating project. Please try again.", "error"), {
        id: toastId,
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-h-96 overflow-y-auto"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto("Project Name *", "labels.projectName")}
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto("Type *", "labels.type")}
          </label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
            placeholder={auto("Select type", "placeholders.type")}
          >
              <SelectItem value="NEW_CONSTRUCTION">
                {auto("New Construction", "options.newConstruction")}
              </SelectItem>
              <SelectItem value="RENOVATION">
                {auto("Renovation", "options.renovation")}
              </SelectItem>
              <SelectItem value="MAINTENANCE">
                {auto("Maintenance", "options.maintenance")}
              </SelectItem>
              <SelectItem value="FIT_OUT">
                {auto("Fit Out", "options.fitOut")}
              </SelectItem>
              <SelectItem value="DEMOLITION">
                {auto("Demolition", "options.demolition")}
              </SelectItem>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {auto("Description", "labels.description")}
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto("Start Date *", "labels.startDate")}
          </label>
          <Input
            type="date"
            value={formData.timeline.startDate}
            onChange={(e) =>
              setFormData({
                ...formData,
                timeline: { ...formData.timeline, startDate: e.target.value },
              })
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto("End Date *", "labels.endDate")}
          </label>
          <Input
            type="date"
            value={formData.timeline.endDate}
            onChange={(e) =>
              setFormData({
                ...formData,
                timeline: { ...formData.timeline, endDate: e.target.value },
              })
            }
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto("Budget *", "labels.budget")}
          </label>
          <Input
            type="number"
            value={formData.budget.total}
            onChange={(e) =>
              setFormData({
                ...formData,
                budget: { ...formData.budget, total: Number(e.target.value) },
              })
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {auto("City", "labels.city")}
          </label>
          <Input
            value={formData.location.city}
            onChange={(e) =>
              setFormData({
                ...formData,
                location: { ...formData.location, city: e.target.value },
              })
            }
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" className="bg-primary hover:bg-primary" aria-label={auto("Submit the project form", "submitAria")}>
          {auto("Create Project", "submit")}
        </Button>
      </div>
    </form>
  );
}
