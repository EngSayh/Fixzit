"use client";

/**
 * Admin Issue Detail Page
 * View and manage individual issue details
 * 
 * @module app/admin/issues/[id]/page
 */

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  FileCode,
  RefreshCw,
  Save,
  Trash2,
  MessageSquare,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "@/contexts/TranslationContext";

// ============================================================================
// TYPES
// ============================================================================

interface AuditEntry {
  timestamp: string;
  action: string;
  sessionId?: string;
  agentId?: string;
  notes?: string;
  sourceFile?: string;
  lineRange?: { start: number; end: number };
}

interface Comment {
  content: string;
  author: string;
  createdAt: string;
}

interface Issue {
  _id: string;
  issueId: string;
  legacyId?: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  effort: string;
  module: string;
  location: {
    filePath: string;
    lineStart?: number;
    lineEnd?: number;
  };
  assignedTo?: string;
  riskTags: string[];
  labels: string[];
  mentionCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
  auditEntries?: AuditEntry[];
  comments?: Comment[];
  rootCause?: string;
  proposedFix?: string;
  actualFix?: string;
  relatedIssues?: string[];
  dependencies?: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_OPTIONS = [
  { value: "P0", label: "P0 - Critical", color: "text-red-600" },
  { value: "P1", label: "P1 - High", color: "text-orange-500" },
  { value: "P2", label: "P2 - Medium", color: "text-yellow-500" },
  { value: "P3", label: "P3 - Low", color: "text-blue-500" },
];

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "blocked", label: "Blocked" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "wont_fix", label: "Won't Fix" },
];

const EFFORT_OPTIONS = [
  { value: "trivial", label: "Trivial (< 1h)" },
  { value: "small", label: "Small (1-4h)" },
  { value: "medium", label: "Medium (1-3d)" },
  { value: "large", label: "Large (1w+)" },
  { value: "epic", label: "Epic (2w+)" },
];

const CATEGORY_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "security", label: "Security" },
  { value: "efficiency", label: "Efficiency" },
  { value: "missing_test", label: "Missing Test" },
  { value: "logic_error", label: "Logic Error" },
  { value: "enhancement", label: "Enhancement" },
  { value: "documentation", label: "Documentation" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminIssueDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();

  // State
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState("");

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [effort, setEffort] = useState("");
  const [category, setCategory] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [proposedFix, setProposedFix] = useState("");

  // Fetch issue
  const fetchIssue = useCallback(async () => {
    try {
      const response = await fetch(`/api/issues/${params.id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: t("common.notFound", "Not Found"),
            description: t("issues.notFound", "Issue not found"),
            variant: "destructive",
          });
          router.push("/admin/issues");
          return;
        }
        throw new Error(t("issues.fetchFailed", "Failed to fetch issue"));
      }

      const data = await response.json();
      setIssue(data);
      
      // Initialize editable fields
      setTitle(data.title);
      setDescription(data.description || "");
      setStatus(data.status);
      setPriority(data.priority);
      setEffort(data.effort || "medium");
      setCategory(data.category);
      setRootCause(data.rootCause || "");
      setProposedFix(data.proposedFix || "");
    } catch (_error) {
      toast({
        title: t("common.error", "Error"),
        description: t("issues.loadFailed", "Failed to load issue"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [params.id, router, toast]);

  // Initial load
  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/issues/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          status,
          priority,
          effort,
          category,
          rootCause,
          proposedFix,
        }),
      });

      if (!response.ok) {
        throw new Error(t("issues.saveFailed", "Failed to save"));
      }

      const updated = await response.json();
      setIssue(updated);

      toast({
        title: t("common.saved", "Saved"),
        description: t("issues.updateSuccess", "Issue updated successfully"),
      });
    } catch (_error) {
      toast({
        title: t("common.error", "Error"),
        description: t("issues.saveFailedChanges", "Failed to save changes"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete issue
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/issues/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(t("issues.deleteFailed", "Failed to delete"));
      }

      toast({
        title: t("common.deleted", "Deleted"),
        description: t("issues.deleteSuccess", "Issue deleted successfully"),
      });
      router.push("/admin/issues");
    } catch (_error) {
      toast({
        title: t("common.error", "Error"),
        description: t("issues.deleteFailedIssue", "Failed to delete issue"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Add comment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/issues/${params.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });

      if (!response.ok) {
        // Comments endpoint might not exist yet - show info
        toast({
          title: t("common.note", "Note"),
          description: t("issues.comments.apiMissing", "Comments API not implemented yet"),
        });
        return;
      }

      setNewComment("");
      fetchIssue();
    } catch (_error) {
      toast({
        title: t("common.note", "Note"),
        description: t("issues.comments.comingSoon", "Comments feature coming soon"),
      });
    }
  };

  // Status icon helper
  const getStatusIcon = (s: string) => {
    switch (s) {
      case "resolved":
      case "closed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "blocked":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "in_progress":
        return <Zap className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!issue) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/issues")} aria-label={t("accessibility.backToIssuesList", "Go back to issues list")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              {getStatusIcon(status)}
              <h1 className="text-2xl font-bold">{issue.issueId || issue.legacyId || `Issue #${issue._id.slice(-6)}`}</h1>
              <Badge
                variant="outline"
                className={
                  priority === "P0" ? "border-red-500 text-red-500" :
                  priority === "P1" ? "border-orange-500 text-orange-500" :
                  priority === "P2" ? "border-yellow-500 text-yellow-500" :
                  "border-blue-500 text-blue-500"
                }
              >
                {priority}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {t("common.created", "Created")} {new Date(issue.createdAt).toLocaleDateString()} • 
              {t("common.lastUpdated", "Last updated")} {new Date(issue.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchIssue} aria-label={t("accessibility.refreshIssue", "Refresh issue data")} title={t("accessibility.refreshIssue", "Refresh issue data")}>
            <RefreshCw className="h-4 w-4 me-2" />
            {t("common.refresh", "Refresh")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} aria-label={t("accessibility.saveIssue", "Save issue changes")} title={t("accessibility.saveIssue", "Save issue changes")}>
            <Save className="h-4 w-4 me-2" />
            {saving ? t("common.saving", "Saving...") : t("common.save", "Save")}
          </Button>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleting} aria-label={t("accessibility.deleteIssue", "Delete this issue")} title={t("accessibility.deleteIssue", "Delete this issue permanently")}>
                <Trash2 className="h-4 w-4 me-2" />
                {t("common.delete", "Delete")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("issues.actions.deleteConfirm", "Delete Issue?")}</DialogTitle>
                <DialogDescription>
                  {t("issues.actions.deleteWarning", "This action cannot be undone. The issue and all associated data will be permanently deleted.")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} aria-label={t("accessibility.cancelDelete", "Cancel delete action")}>{t("common.cancel", "Cancel")}</Button>
                <Button onClick={handleDelete} variant="destructive" aria-label={t("accessibility.confirmDelete", "Confirm delete")}>
                  {t("common.delete", "Delete")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">{t("issues.tabs.details", "Details")}</TabsTrigger>
          <TabsTrigger value="activity">{t("issues.tabs.activity", "Activity")} ({issue.auditEntries?.length || 0})</TabsTrigger>
          <TabsTrigger value="comments">{t("issues.tabs.comments", "Comments")} ({issue.comments?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("issues.details.title", "Issue Details")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>{t("issues.fields.title", "Title")}</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t("issues.placeholders.title", "Issue title")}
                    />
                  </div>
                  <div>
                    <Label>{t("issues.fields.description", "Description")}</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t("issues.placeholders.description", "Describe the issue...")}
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>{t("issues.fields.rootCause", "Root Cause Analysis")}</Label>
                    <Textarea
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      placeholder={t("issues.placeholders.rootCause", "What is causing this issue?")}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>{t("issues.fields.proposedFix", "Proposed Fix")}</Label>
                    <Textarea
                      value={proposedFix}
                      onChange={(e) => setProposedFix(e.target.value)}
                      placeholder={t("issues.placeholders.proposedFix", "How should this be fixed?")}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              {issue.location?.filePath && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCode className="h-5 w-5" />
                      {t("issues.details.location", "Location")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-4 rounded-md font-mono text-sm">
                      <p>{issue.location.filePath}</p>
                      {issue.location.lineStart && (
                        <p className="text-muted-foreground">
                          Lines {issue.location.lineStart}
                          {issue.location.lineEnd && ` - ${issue.location.lineEnd}`}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("issues.details.properties", "Properties")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className={opt.color}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Effort</Label>
                    <Select value={effort} onValueChange={setEffort}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EFFORT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("issues.details.metadata", "Metadata")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Module</span>
                    <span className="font-mono">{issue.module || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mention Count</span>
                    <span>{issue.mentionCount || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">First Seen</span>
                    <span>{issue.firstSeenAt ? new Date(issue.firstSeenAt).toLocaleDateString() : "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Seen</span>
                    <span>{issue.lastSeenAt ? new Date(issue.lastSeenAt).toLocaleDateString() : "N/A"}</span>
                  </div>
                  {issue.legacyId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Legacy ID</span>
                      <span className="font-mono">{issue.legacyId}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {issue.labels && issue.labels.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("issues.details.labels", "Labels")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {issue.labels.map((label) => (
                        <Badge key={label} variant="secondary">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {issue.riskTags && issue.riskTags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      {t("issues.details.riskTags", "Risk Tags")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {issue.riskTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="border-yellow-500 text-yellow-600">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                {t("issues.details.auditHistory", "Audit History")}
              </CardTitle>
              <CardDescription>
                {t("issues.details.auditDescription", "Timeline of all changes and agent mentions")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!issue.auditEntries || issue.auditEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t("issues.details.noActivity", "No activity recorded yet")}
                </p>
              ) : (
                <div className="space-y-4">
                  {issue.auditEntries.map((entry, i) => (
                    <div key={i} className="flex gap-4 border-s-2 border-muted ps-4 pb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{entry.action}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="mt-1 text-sm">{entry.notes}</p>
                        )}
                        {entry.agentId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Agent: {entry.agentId}
                          </p>
                        )}
                        {entry.sourceFile && (
                          <p className="text-xs font-mono text-muted-foreground mt-1">
                            {entry.sourceFile}
                            {entry.lineRange && `:${entry.lineRange.start}-${entry.lineRange.end}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t("issues.details.comments", "Comments")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment */}
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t("issues.details.addComment", "Add a comment...")}
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={handleAddComment} disabled={!newComment.trim()} aria-label={t("accessibility.postComment", "Post comment to this issue")}>
                  {t("issues.details.postComment", "Post")}
                </Button>
              </div>

              {/* Comments List */}
              {!issue.comments || issue.comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t("issues.details.noComments", "No comments yet")}
                </p>
              ) : (
                <div className="space-y-4">
                  {issue.comments.map((comment, i) => (
                    <div key={i} className="bg-muted p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
