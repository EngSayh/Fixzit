"use client";

/**
 * Superadmin Email Template Management
 * List, edit, and preview transactional email templates
 * 
 * @module app/superadmin/emails/page
 * @status IMPLEMENTED [AGENT-001-A]
 * @issue SA-EMAIL-001
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  RefreshCw, 
  Edit,
  Eye,
  Send,
  Search,
  Mail,
  FileText,
  Clock,
  CheckCircle,
  Copy,
  Code,
  Smartphone,
  Monitor,
} from "@/components/ui/icons";
import { useSuperadminSession } from "@/components/superadmin/superadmin-session";
import DOMPurify from "dompurify";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  category: "auth" | "billing" | "notifications" | "marketing" | "system";
  bodyHtml: string;
  bodyText: string;
  variables: string[];
  lastUpdated: string;
  updatedBy: string;
  version: number;
  isActive: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_COLORS: Record<string, string> = {
  auth: "bg-blue-500/10 text-blue-500",
  billing: "bg-green-500/10 text-green-500",
  notifications: "bg-purple-500/10 text-purple-500",
  marketing: "bg-orange-500/10 text-orange-500",
  system: "bg-gray-500/10 text-gray-500",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EmailTemplatesPage() {
  const { t } = useI18n();
  // Session check for superadmin access (hook validates internally)
  useSuperadminSession();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Dialog states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [editTab, setEditTab] = useState<"html" | "text">("html");
  
  // Form state
  const [editForm, setEditForm] = useState({
    subject: "",
    bodyHtml: "",
    bodyText: "",
  });

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/superadmin/email-templates", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditForm({
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText,
    });
    setShowEditDialog(true);
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewDialog(true);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    
    try {
      const response = await fetch(`/api/superadmin/email-templates/${selectedTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject: editForm.subject,
          bodyHtml: editForm.bodyHtml,
          bodyText: editForm.bodyText,
        }),
      });
      if (!response.ok) throw new Error("Failed to save template");
      const data = await response.json();
      
      // Validate response shape before updating state
      if (!data || typeof data !== "object" || !data.template || !data.template.id) {
        logger.error("[Emails] Invalid API response shape", { data });
        throw new Error("Invalid response from server - template data missing");
      }
      
      setTemplates(prev => prev.map(t => 
        t.id === selectedTemplate.id ? data.template : t
      ));
      
      setShowEditDialog(false);
      toast.success("Template saved successfully");
    } catch (error) {
      logger.error("[Emails] Save template failed", { error: error instanceof Error ? error.message : String(error) });
      toast.error("Failed to save template");
    }
  };

  const handleSendTest = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`/api/superadmin/email-templates/${template.id}/test`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to send test email");
      toast.success(`Test email sent for "${template.name}"`);
    } catch {
      toast.error("Failed to send test email");
    }
  };

  const copyTemplateKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success("Template key copied");
    } catch {
      // Fallback for insecure context or permission denied
      try {
        const textArea = document.createElement("textarea");
        textArea.value = key;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast.success("Template key copied");
      } catch {
        toast.error("Failed to copy. Please copy manually: " + key);
      }
    }
  };

  const getPreviewHtml = () => {
    if (!selectedTemplate) return "";
    
    // Replace variables with sample data
    let html = selectedTemplate.bodyHtml;
    const sampleData: Record<string, string> = {
      userName: "John Doe",
      loginUrl: "https://app.fixzit.com/login",
      supportEmail: "support@fixzit.com",
      resetUrl: "https://app.fixzit.com/reset/abc123",
      expiryTime: "24 hours",
      invoiceNumber: "INV-2025-001",
      customerName: "Acme Corp",
      amount: "SAR 1,500.00",
      invoiceDate: "January 20, 2025",
      dueDate: "February 20, 2025",
      invoiceUrl: "https://app.fixzit.com/invoices/123",
      technicianName: "Ahmed",
      workOrderTitle: "AC Maintenance",
      propertyName: "Building A",
      priority: "High",
      workOrderUrl: "https://app.fixzit.com/wo/456",
      planName: "Professional",
      renewalDate: "February 1, 2025",
      cardLast4: "4242",
      billingUrl: "https://app.fixzit.com/billing",
    };
    
    Object.entries(sampleData).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, "g"), value);
    });
    
    // Sanitize HTML to prevent XSS from user-editable template content
    return typeof window !== "undefined" ? DOMPurify.sanitize(html) : html;
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.key.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" />
            {t("superadmin.emails.title", "Email Templates")}
          </h1>
          <p className="text-muted-foreground">
            {t("superadmin.emails.subtitle", "Manage transactional email templates")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={loading}>
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh", "Refresh")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-500">
                  {templates.filter(t => t.isActive).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">
                  {new Set(templates.map(t => t.category)).size}
                </p>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium">
                  {templates.length > 0 
                    ? new Date(
                        Math.max(...templates.map(t => new Date(t.lastUpdated).getTime()))
                      ).toLocaleDateString()
                    : "-"}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("superadmin.emails.search", "Search templates...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="auth">Authentication</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="notifications">Notifications</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("superadmin.emails.name", "Name")}</TableHead>
                <TableHead>{t("superadmin.emails.key", "Key")}</TableHead>
                <TableHead>{t("superadmin.emails.subject", "Subject")}</TableHead>
                <TableHead>{t("superadmin.emails.category", "Category")}</TableHead>
                <TableHead>{t("superadmin.emails.variables", "Variables")}</TableHead>
                <TableHead>{t("superadmin.emails.version", "Version")}</TableHead>
                <TableHead>{t("common.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t("superadmin.emails.noTemplates", "No email templates found")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map(template => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(template.lastUpdated).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{template.key}</code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => copyTemplateKey(template.key)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="truncate max-w-[200px] block">{template.subject}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={CATEGORY_COLORS[template.category]}>
                        {template.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{template.variables.length}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">v{template.version}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePreview(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSendTest(template)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {t("superadmin.emails.editTitle", "Edit Template")} - {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              {t("superadmin.emails.editDescription", "Modify the email template content")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-auto">
            <div className="space-y-2">
              <Label>{t("superadmin.emails.subject", "Subject")}</Label>
              <Input
                value={editForm.subject}
                onChange={(e) => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Variables: {selectedTemplate?.variables.map(v => `{{${v}}}`).join(", ")}
              </p>
            </div>
            
            <Tabs value={editTab} onValueChange={(v) => setEditTab(v as "html" | "text")}>
              <TabsList>
                <TabsTrigger value="html" className="gap-2">
                  <Code className="h-4 w-4" />
                  HTML
                </TabsTrigger>
                <TabsTrigger value="text" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Plain Text
                </TabsTrigger>
              </TabsList>
              <TabsContent value="html" className="mt-4">
                <Textarea
                  value={editForm.bodyHtml}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bodyHtml: e.target.value }))}
                  rows={15}
                  className="font-mono text-sm"
                />
              </TabsContent>
              <TabsContent value="text" className="mt-4">
                <Textarea
                  value={editForm.bodyText}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bodyText: e.target.value }))}
                  rows={15}
                  className="font-mono text-sm"
                />
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={handleSave}>
              {t("common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {t("superadmin.emails.preview", "Preview")} - {selectedTemplate?.name}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={previewMode === "desktop" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode("desktop")}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewMode === "mobile" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode("mobile")}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted rounded-lg p-4">
            <div 
              className={`bg-white rounded-lg shadow-lg mx-auto ${
                previewMode === "mobile" ? "max-w-[375px]" : "max-w-[600px]"
              }`}
            >
              <div className="border-b p-4">
                <p className="text-sm text-muted-foreground">Subject:</p>
                <p className="font-medium">{selectedTemplate?.subject.replace(/\{\{(\w+)\}\}/g, "Sample")}</p>
              </div>
              <div 
                className="p-4"
                dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              {t("common.close", "Close")}
            </Button>
            <Button onClick={() => selectedTemplate && handleSendTest(selectedTemplate)}>
              <Send className="h-4 w-4 me-2" />
              {t("superadmin.emails.sendTest", "Send Test")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
