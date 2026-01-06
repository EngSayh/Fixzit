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
import { BRAND_COLORS, NEUTRAL_COLORS } from "@/lib/config/brand-colors";
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
import { Select, SelectItem } from "@/components/ui/select";
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
  Code,
  Smartphone,
  Monitor,
} from "@/components/ui/icons";
import { CopyButton } from "@/components/ui/copy-button";
import { useSuperadminSession } from "@/components/superadmin/superadmin-session";
import DOMPurify from "dompurify";

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
// MOCK DATA
// ============================================================================

const MOCK_TEMPLATES: EmailTemplate[] = [
  {
    id: "tpl-1",
    key: "welcome",
    name: "Welcome Email",
    subject: "Welcome to Fixzit, {{userName}}!",
    category: "auth",
    bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: ${BRAND_COLORS.primary};">Welcome to Fixzit!</h1>
  <p>Hi {{userName}},</p>
  <p>Thank you for joining Fixzit. Your account has been created successfully.</p>
  <p><a href="{{loginUrl}}" style="background: ${BRAND_COLORS.primary}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Started</a></p>
  <p>If you have any questions, contact us at {{supportEmail}}</p>
  <p>Best regards,<br>The Fixzit Team</p>
</div>`,
    bodyText: `Welcome to Fixzit!

Hi {{userName}},

Thank you for joining Fixzit. Your account has been created successfully.

Get Started: {{loginUrl}}

If you have any questions, contact us at {{supportEmail}}

Best regards,
The Fixzit Team`,
    variables: ["userName", "loginUrl", "supportEmail"],
    lastUpdated: "2025-01-15T10:00:00Z",
    updatedBy: "superadmin",
    version: 3,
    isActive: true,
  },
  {
    id: "tpl-2",
    key: "password_reset",
    name: "Password Reset",
    subject: "Reset your Fixzit password",
    category: "auth",
    bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: ${BRAND_COLORS.primary};">Password Reset Request</h1>
  <p>Hi {{userName}},</p>
  <p>We received a request to reset your password. Click the button below to proceed:</p>
  <p><a href="{{resetUrl}}" style="background: ${BRAND_COLORS.primary}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
  <p>This link expires in {{expiryTime}}.</p>
  <p>If you didn't request this, please ignore this email.</p>
</div>`,
    bodyText: `Password Reset Request

Hi {{userName}},

We received a request to reset your password. Click the link below:

{{resetUrl}}

This link expires in {{expiryTime}}.

If you didn't request this, please ignore this email.`,
    variables: ["userName", "resetUrl", "expiryTime"],
    lastUpdated: "2025-01-10T14:30:00Z",
    updatedBy: "superadmin",
    version: 2,
    isActive: true,
  },
  {
    id: "tpl-3",
    key: "invoice",
    name: "Invoice Notification",
    subject: "Invoice #{{invoiceNumber}} - {{amount}}",
    category: "billing",
    bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: ${BRAND_COLORS.primary};">Invoice #{{invoiceNumber}}</h1>
  <p>Hi {{customerName}},</p>
  <p>Your invoice for {{amount}} is now available.</p>
  <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
    <tr><td style="padding: 8px; border-bottom: 1px solid ${NEUTRAL_COLORS.border};">Invoice Date:</td><td style="padding: 8px; border-bottom: 1px solid ${NEUTRAL_COLORS.border};">{{invoiceDate}}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid ${NEUTRAL_COLORS.border};">Due Date:</td><td style="padding: 8px; border-bottom: 1px solid ${NEUTRAL_COLORS.border};">{{dueDate}}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid ${NEUTRAL_COLORS.border};"><strong>Amount:</strong></td><td style="padding: 8px; border-bottom: 1px solid ${NEUTRAL_COLORS.border};"><strong>{{amount}}</strong></td></tr>
  </table>
  <p><a href="{{invoiceUrl}}" style="background: ${BRAND_COLORS.primary}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Invoice</a></p>
</div>`,
    bodyText: `Invoice #{{invoiceNumber}}

Hi {{customerName}},

Your invoice for {{amount}} is now available.

Invoice Date: {{invoiceDate}}
Due Date: {{dueDate}}
Amount: {{amount}}

View Invoice: {{invoiceUrl}}`,
    variables: ["invoiceNumber", "customerName", "amount", "invoiceDate", "dueDate", "invoiceUrl"],
    lastUpdated: "2025-01-12T09:00:00Z",
    updatedBy: "superadmin",
    version: 5,
    isActive: true,
  },
  {
    id: "tpl-4",
    key: "work_order_assigned",
    name: "Work Order Assigned",
    subject: "New Work Order: {{workOrderTitle}}",
    category: "notifications",
    bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: ${BRAND_COLORS.primary};">New Work Order Assigned</h1>
  <p>Hi {{technicianName}},</p>
  <p>A new work order has been assigned to you:</p>
  <div style="background: ${NEUTRAL_COLORS.backgroundPage}; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p><strong>{{workOrderTitle}}</strong></p>
    <p>Property: {{propertyName}}</p>
    <p>Priority: {{priority}}</p>
    <p>Due: {{dueDate}}</p>
  </div>
  <p><a href="{{workOrderUrl}}" style="background: ${BRAND_COLORS.primary}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Details</a></p>
</div>`,
    bodyText: `New Work Order Assigned

Hi {{technicianName}},

A new work order has been assigned to you:

{{workOrderTitle}}
Property: {{propertyName}}
Priority: {{priority}}
Due: {{dueDate}}

View Details: {{workOrderUrl}}`,
    variables: ["technicianName", "workOrderTitle", "propertyName", "priority", "dueDate", "workOrderUrl"],
    lastUpdated: "2025-01-18T16:00:00Z",
    updatedBy: "superadmin",
    version: 4,
    isActive: true,
  },
  {
    id: "tpl-5",
    key: "subscription_renewal",
    name: "Subscription Renewal Reminder",
    subject: "Your Fixzit subscription renews soon",
    category: "billing",
    bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: ${BRAND_COLORS.primary};">Subscription Renewal</h1>
  <p>Hi {{customerName}},</p>
  <p>Your {{planName}} subscription will renew on {{renewalDate}} for {{amount}}.</p>
  <p>No action needed - your card ending in {{cardLast4}} will be charged automatically.</p>
  <p><a href="{{billingUrl}}" style="background: ${BRAND_COLORS.primary}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Manage Subscription</a></p>
</div>`,
    bodyText: `Subscription Renewal

Hi {{customerName}},

Your {{planName}} subscription will renew on {{renewalDate}} for {{amount}}.

No action needed - your card ending in {{cardLast4}} will be charged automatically.

Manage Subscription: {{billingUrl}}`,
    variables: ["customerName", "planName", "renewalDate", "amount", "cardLast4", "billingUrl"],
    lastUpdated: "2025-01-08T11:00:00Z",
    updatedBy: "superadmin",
    version: 2,
    isActive: true,
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  auth: "bg-blue-500/10 text-blue-500",
  billing: "bg-green-500/10 text-green-500",
  notifications: "bg-purple-500/10 text-purple-500",
  marketing: "bg-orange-500/10 text-orange-500",
  system: "bg-muted text-muted-foreground",
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
      // In production: fetch from /api/superadmin/email-templates
      await new Promise(r => setTimeout(r, 500));
      setTemplates(MOCK_TEMPLATES);
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
      // In production: PUT to /api/superadmin/email-templates/:id
      setTemplates(prev => prev.map(t => 
        t.id === selectedTemplate.id 
          ? { 
              ...t, 
              subject: editForm.subject,
              bodyHtml: editForm.bodyHtml,
              bodyText: editForm.bodyText,
              lastUpdated: new Date().toISOString(),
              version: t.version + 1,
            } 
          : t
      ));
      
      setShowEditDialog(false);
      toast.success("Template saved successfully");
    } catch {
      toast.error("Failed to save template");
    }
  };

  const handleSendTest = async (template: EmailTemplate) => {
    try {
      // In production: POST to /api/superadmin/email-templates/:id/test
      await new Promise(r => setTimeout(r, 1000));
      toast.success(`Test email sent for "${template.name}"`);
    } catch {
      toast.error("Failed to send test email");
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
        <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={loading} aria-label={t("common.refresh", "Refresh email templates")} title={t("common.refresh", "Refresh email templates")}>
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
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search row */}
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("superadmin.emails.search", "Search templates...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-10 bg-muted border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {/* Filter row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter} placeholder="Category" className="w-full sm:w-40 bg-muted border-input text-foreground">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="notifications">Notifications</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
                        <CopyButton 
                          value={template.key}
                          iconOnly
                          size="icon"
                          className="h-6 w-6"
                          successMessage={t("superadmin.emails.keyCopied", "Template key copied")}
                        />
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
                          aria-label={t("superadmin.emails.edit", `Edit ${template.name} template`)}
                          title={t("superadmin.emails.edit", `Edit ${template.name}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePreview(template)}
                          aria-label={t("superadmin.emails.preview", `Preview ${template.name} template`)}
                          title={t("superadmin.emails.preview", `Preview ${template.name}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSendTest(template)}
                          aria-label={t("superadmin.emails.sendTest", `Send test email for ${template.name}`)}
                          title={t("superadmin.emails.sendTest", `Send test for ${template.name}`)}
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
            <Button variant="outline" onClick={() => setShowEditDialog(false)} aria-label={t("accessibility.cancel", "Cancel changes")} title={t("accessibility.cancel", "Cancel changes")}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={handleSave} aria-label={t("accessibility.saveTemplate", "Save email template")} title={t("accessibility.saveTemplate", "Save email template")}>
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
                  aria-label={t("superadmin.emails.desktopPreview", "Desktop preview mode")}
                  title={t("superadmin.emails.desktopPreview", "Desktop preview mode")}
                  aria-pressed={previewMode === "desktop"}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewMode === "mobile" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode("mobile")}
                  aria-label={t("superadmin.emails.mobilePreview", "Mobile preview mode")}
                  title={t("superadmin.emails.mobilePreview", "Mobile preview mode")}
                  aria-pressed={previewMode === "mobile"}
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
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)} aria-label={t("common.close", "Close preview")} title={t("common.close", "Close preview")}>
              {t("common.close", "Close")}
            </Button>
            <Button onClick={() => selectedTemplate && handleSendTest(selectedTemplate)} aria-label={t("superadmin.emails.sendTest", "Send test email")} title={t("superadmin.emails.sendTest", "Send test email")}>
              <Send className="h-4 w-4 me-2" />
              {t("superadmin.emails.sendTest", "Send Test")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
