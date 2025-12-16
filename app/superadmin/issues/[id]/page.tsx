"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar, User, Tag, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Issue {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  assignedTo: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  comments: Array<{
    id: string;
    content: string;
    author: string;
    createdAt: string;
  }>;
}

const STATUS_COLORS = {
  open: "bg-blue-500",
  "in-progress": "bg-yellow-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
};

const PRIORITY_COLORS = {
  P0: "bg-red-500",
  P1: "bg-orange-500",
  P2: "bg-yellow-500",
  P3: "bg-blue-500",
};

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const issueId = params?.id as string;

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!issueId) {
      setLoading(false);
      return;
    }

    const fetchIssue = async () => {
      try {
        const response = await fetch(`/api/issues/${issueId}`);
        if (!response.ok) throw new Error("Failed to fetch issue");
        const data = await response.json();
        setIssue(data);
      } catch (_error) {
        toast({
          title: "Error",
          description: "Failed to load issue details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchIssue();
  }, [issueId]);

  const handleAddComment = async () => {
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/issues/${issueId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });

      if (!response.ok) throw new Error("Failed to add comment");

      const newComment = await response.json();
      setIssue((prev) =>
        prev
          ? {
              ...prev,
              comments: [...prev.comments, newComment],
            }
          : null
      );
      setComment("");
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      setIssue((prev) => (prev ? { ...prev, status: newStatus } : null));
      toast({
        title: "Success",
        description: `Status updated to ${newStatus}`,
      });
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading issue...</div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-lg">Issue not found</div>
        <Button onClick={() => router.push("/superadmin/issues")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Issues
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/superadmin/issues")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Issues
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{issue.title}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className={STATUS_COLORS[issue.status as keyof typeof STATUS_COLORS] || "bg-gray-500"}>
                  {issue.status}
                </Badge>
                <Badge className={PRIORITY_COLORS[issue.priority as keyof typeof PRIORITY_COLORS] || "bg-gray-500"}>
                  {issue.priority}
                </Badge>
                <Badge variant="outline">
                  <Tag className="w-3 h-3 mr-1" />
                  {issue.category}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={issue.status === "open" ? "default" : "outline"}
                onClick={() => handleStatusChange("open")}
              >
                Open
              </Button>
              <Button
                size="sm"
                variant={issue.status === "in-progress" ? "default" : "outline"}
                onClick={() => handleStatusChange("in-progress")}
              >
                In Progress
              </Button>
              <Button
                size="sm"
                variant={issue.status === "resolved" ? "default" : "outline"}
                onClick={() => handleStatusChange("resolved")}
              >
                Resolved
              </Button>
              <Button
                size="sm"
                variant={issue.status === "closed" ? "default" : "outline"}
                onClick={() => handleStatusChange("closed")}
              >
                Closed
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {issue.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">Created by:</span>{" "}
                  {issue.createdBy}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">Assigned to:</span>{" "}
                  {issue.assignedTo || "Unassigned"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(issue.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">Updated:</span>{" "}
                  {new Date(issue.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Comments ({issue.comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-4">
            {issue.comments.map((comment) => (
              <div
                key={comment.id}
                className="p-4 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{comment.author}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
            {issue.comments.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No comments yet
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAddComment}
                disabled={!comment.trim() || submitting}
              >
                {submitting ? "Adding..." : "Add Comment"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
