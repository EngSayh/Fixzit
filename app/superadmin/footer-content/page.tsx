"use client";

/**
 * Superadmin Footer Content Management
 * Manage policies, legal pages, AI chatbot settings, and footer configuration
 * 
 * @module app/superadmin/footer-content/page
 */

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  RefreshCw, Search, Edit, Plus, Trash2,
  FileText, Bot, Link, Mail, Phone, MapPin,
  Shield, Scale, Cookie, HelpCircle, Save,
  ExternalLink, Settings,
} from "@/components/ui/icons";
import { toast } from "sonner";

interface PolicyPage {
  _id: string;
  slug: string;
  title: string;
  titleAr?: string;
  content: string;
  contentAr?: string;
  type: "privacy" | "terms" | "refund" | "cookie" | "accessibility" | "custom";
  isPublished: boolean;
  lastUpdated: string;
  version: string;
  createdAt: string;
}

interface FooterLink {
  _id: string;
  label: string;
  labelAr?: string;
  url: string;
  section: "company" | "support" | "legal" | "social";
  icon?: string;
  isExternal: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface ChatbotSettings {
  enabled: boolean;
  provider: "internal" | "openai" | "anthropic" | "custom";
  hasApiKey?: boolean; // Server returns this instead of the actual key
  newApiKey?: string;  // Only sent when user enters a new key
  model?: string;
  welcomeMessage: string;
  welcomeMessageAr?: string;
  position: "bottom-right" | "bottom-left";
  primaryColor: string;
  avatarUrl?: string;
  offlineMessage: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
}

interface CompanyInfo {
  name: string;
  nameAr?: string;
  tagline: string;
  taglineAr?: string;
  email: string;
  phone: string;
  address: string;
  addressAr?: string;
  vatNumber?: string;
  crNumber?: string;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
}

const POLICY_ICONS: Record<string, typeof FileText> = {
  privacy: Shield,
  terms: Scale,
  refund: FileText,
  cookie: Cookie,
  accessibility: HelpCircle,
  custom: FileText,
};

const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: "Fixzit",
  nameAr: "فيكسيت",
  tagline: "Facility Management Made Simple",
  taglineAr: "إدارة المرافق بكل سهولة",
  email: "support@fixzit.sa",
  phone: "+966 11 XXX XXXX",
  address: "Riyadh, Saudi Arabia",
  addressAr: "الرياض، المملكة العربية السعودية",
  vatNumber: "3XXXXXXXXXX0003",
  crNumber: "10XXXXXXXXX",
  socialLinks: {
    twitter: "https://twitter.com/fixzit",
    linkedin: "https://linkedin.com/company/fixzit",
  },
};

const DEFAULT_CHATBOT_SETTINGS: ChatbotSettings = {
  enabled: true,
  provider: "internal",
  welcomeMessage: "Hello! How can I help you today?",
  welcomeMessageAr: "مرحباً! كيف يمكنني مساعدتك اليوم؟",
  position: "bottom-right",
  primaryColor: "#0061A8",
  offlineMessage: "We're currently offline. Please leave a message and we'll get back to you.",
  maxTokens: 1000,
  temperature: 0.7,
  systemPrompt: "You are a helpful customer support assistant for Fixzit, a facility management platform. Be concise and helpful.",
};

export default function SuperadminFooterContentPage() {
  const { t } = useI18n();
  const [policies, setPolicies] = useState<PolicyPage[]>([]);
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);
  const [chatbotSettings, setChatbotSettings] = useState<ChatbotSettings>(DEFAULT_CHATBOT_SETTINGS);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(DEFAULT_COMPANY_INFO);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Dialogs
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyPage | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<FooterLink | null>(null);
  
  // Forms
  const [policyForm, setPolicyForm] = useState({
    slug: "",
    title: "",
    titleAr: "",
    content: "",
    contentAr: "",
    type: "custom" as PolicyPage["type"],
    isPublished: true,
  });
  
  const [linkForm, setLinkForm] = useState({
    label: "",
    labelAr: "",
    url: "",
    section: "company" as FooterLink["section"],
    isExternal: false,
    isActive: true,
    sortOrder: 0,
  });

  const fetchPolicies = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/content/policies", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setPolicies(Array.isArray(data) ? data : data.policies || []);
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- SuperAdmin debug logging for API failures
      console.error("[Footer Content] Failed to fetch policies:", error);
      toast.error("Failed to load policies - showing demo data");
      // Demo data
      setPolicies([
        {
          _id: "policy-privacy",
          slug: "privacy-policy",
          title: "Privacy Policy",
          titleAr: "سياسة الخصوصية",
          content: "This Privacy Policy describes how Fixzit collects, uses, and protects your personal information...",
          contentAr: "توضح سياسة الخصوصية هذه كيفية جمع Fixzit لمعلوماتك الشخصية واستخدامها وحمايتها...",
          type: "privacy",
          isPublished: true,
          lastUpdated: new Date().toISOString(),
          version: "2.0",
          createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          _id: "policy-terms",
          slug: "terms-of-service",
          title: "Terms of Service",
          titleAr: "شروط الخدمة",
          content: "By using Fixzit, you agree to these Terms of Service...",
          contentAr: "باستخدام Fixzit، فإنك توافق على شروط الخدمة هذه...",
          type: "terms",
          isPublished: true,
          lastUpdated: new Date().toISOString(),
          version: "1.5",
          createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          _id: "policy-refund",
          slug: "refund-policy",
          title: "Refund Policy",
          titleAr: "سياسة الاسترداد",
          content: "Our refund policy allows for full refunds within 30 days of purchase...",
          contentAr: "تسمح سياسة الاسترداد لدينا باسترداد كامل المبلغ في غضون 30 يومًا من الشراء...",
          type: "refund",
          isPublished: true,
          lastUpdated: new Date().toISOString(),
          version: "1.0",
          createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          _id: "policy-cookie",
          slug: "cookie-policy",
          title: "Cookie Policy",
          titleAr: "سياسة ملفات تعريف الارتباط",
          content: "This Cookie Policy explains how Fixzit uses cookies and similar technologies...",
          contentAr: "توضح سياسة ملفات تعريف الارتباط هذه كيفية استخدام Fixzit لملفات تعريف الارتباط...",
          type: "cookie",
          isPublished: true,
          lastUpdated: new Date().toISOString(),
          version: "1.0",
          createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    }
  }, []);

  const fetchFooterLinks = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/content/footer-links", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setFooterLinks(Array.isArray(data) ? data : data.links || []);
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- SuperAdmin debug logging for API failures
      console.error("[Footer Content] Failed to fetch footer links:", error);
      toast.error("Failed to load footer links - showing demo data");
      // Demo data
      setFooterLinks([
        { _id: "link-1", label: "About Us", labelAr: "من نحن", url: "/about", section: "company", isExternal: false, isActive: true, sortOrder: 1 },
        { _id: "link-2", label: "Careers", labelAr: "وظائف", url: "/careers", section: "company", isExternal: false, isActive: true, sortOrder: 2 },
        { _id: "link-3", label: "Contact", labelAr: "اتصل بنا", url: "/contact", section: "company", isExternal: false, isActive: true, sortOrder: 3 },
        { _id: "link-4", label: "Help Center", labelAr: "مركز المساعدة", url: "/help", section: "support", isExternal: false, isActive: true, sortOrder: 1 },
        { _id: "link-5", label: "Documentation", labelAr: "التوثيق", url: "/docs", section: "support", isExternal: false, isActive: true, sortOrder: 2 },
        { _id: "link-6", label: "API Reference", labelAr: "مرجع API", url: "/api-docs", section: "support", isExternal: false, isActive: true, sortOrder: 3 },
        { _id: "link-7", label: "Privacy Policy", labelAr: "سياسة الخصوصية", url: "/privacy-policy", section: "legal", isExternal: false, isActive: true, sortOrder: 1 },
        { _id: "link-8", label: "Terms of Service", labelAr: "شروط الخدمة", url: "/terms-of-service", section: "legal", isExternal: false, isActive: true, sortOrder: 2 },
      ]);
    }
  }, []);

  const fetchChatbotSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/content/chatbot", { credentials: "include" });
      if (response.ok) {
        setChatbotSettings(await response.json());
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- SuperAdmin debug logging for API failures
      console.error("[Footer Content] Failed to fetch chatbot settings:", error);
      toast.error("Failed to load chatbot settings - using defaults");
      setChatbotSettings(DEFAULT_CHATBOT_SETTINGS);
    }
  }, []);

  const fetchCompanyInfo = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/content/company", { credentials: "include" });
      if (response.ok) {
        setCompanyInfo(await response.json());
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- SuperAdmin debug logging for API failures
      console.error("[Footer Content] Failed to fetch company info:", error);
      toast.error("Failed to load company info - using defaults");
      setCompanyInfo(DEFAULT_COMPANY_INFO);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPolicies(), fetchFooterLinks(), fetchChatbotSettings(), fetchCompanyInfo()]);
    setLoading(false);
  }, [fetchPolicies, fetchFooterLinks, fetchChatbotSettings, fetchCompanyInfo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Locale-aware search filtering for multilingual content
  const filteredPolicies = policies.filter(p => {
    if (!search) return true;
    const normalizedSearch = search.normalize("NFC").toLocaleLowerCase();
    const titleMatch = p.title.normalize("NFC").toLocaleLowerCase().includes(normalizedSearch);
    const slugMatch = p.slug.normalize("NFC").toLocaleLowerCase().includes(normalizedSearch);
    return titleMatch || slugMatch;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const handleSavePolicy = async () => {
    // Client-side validation
    if (!policyForm.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!policyForm.slug?.trim()) {
      toast.error("Slug is required");
      return;
    }
    // Validate slug format: alphanumeric and hyphens only
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(policyForm.slug.toLowerCase())) {
      toast.error("Slug must be alphanumeric with hyphens (e.g., 'privacy-policy')");
      return;
    }
    if (!policyForm.content?.trim()) {
      toast.error("Content is required");
      return;
    }
    if (!policyForm.type) {
      toast.error("Policy type is required");
      return;
    }
    // Check for duplicate slug (only for new policies)
    if (!editingPolicy) {
      const existingSlug = policies.find(p => p.slug === policyForm.slug.toLowerCase());
      if (existingSlug) {
        toast.error("A policy with this slug already exists");
        return;
      }
    }
    
    try {
      const url = editingPolicy 
        ? `/api/admin/content/policies/${editingPolicy._id}`
        : "/api/admin/content/policies";
      
      const response = await fetch(url, {
        method: editingPolicy ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(policyForm),
      });
      
      if (response.ok) {
        toast.success(editingPolicy ? "Policy updated" : "Policy created");
        setPolicyDialogOpen(false);
        setEditingPolicy(null);
        fetchPolicies();
      } else {
        toast.error("Failed to save policy");
      }
    } catch {
      toast.error("Error saving policy");
    }
  };

  const handleNewPolicy = () => {
    setEditingPolicy(null);
    setPolicyForm({
      slug: "",
      title: "",
      titleAr: "",
      content: "",
      contentAr: "",
      type: "custom",
      isPublished: true,
    });
    setPolicyDialogOpen(true);
  };

  const handleEditPolicy = (policy: PolicyPage) => {
    setEditingPolicy(policy);
    setPolicyForm({
      slug: policy.slug,
      title: policy.title,
      titleAr: policy.titleAr || "",
      content: policy.content,
      contentAr: policy.contentAr || "",
      type: policy.type,
      isPublished: policy.isPublished,
    });
    setPolicyDialogOpen(true);
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm("Are you sure you want to delete this policy? This action cannot be undone.")) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/content/policies/${policyId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        toast.success("Policy deleted successfully");
        fetchPolicies();
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete policy");
      }
    } catch {
      toast.error("Error deleting policy");
    }
  };

  const handleSaveLink = async () => {
    // Client-side validation
    if (!linkForm.label?.trim()) {
      toast.error("Label is required");
      return;
    }
    if (!linkForm.url?.trim()) {
      toast.error("URL is required");
      return;
    }
    if (!linkForm.section) {
      toast.error("Section is required");
      return;
    }
    // Validate URL format
    const isValidUrl = /^(\/[a-zA-Z0-9\-/]*|https?:\/\/.+)$/.test(linkForm.url);
    if (!isValidUrl) {
      toast.error("URL must be a valid relative path (e.g., /about) or absolute URL");
      return;
    }
    // External links must start with http:// or https://
    if (linkForm.isExternal && !/^https?:\/\/.+/.test(linkForm.url)) {
      toast.error("External links must start with http:// or https://");
      return;
    }
    
    try {
      const url = editingLink 
        ? `/api/admin/content/footer-links/${editingLink._id}`
        : "/api/admin/content/footer-links";
      
      const response = await fetch(url, {
        method: editingLink ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(linkForm),
      });
      
      if (response.ok) {
        toast.success(editingLink ? "Link updated" : "Link created");
        setLinkDialogOpen(false);
        setEditingLink(null);
        fetchFooterLinks();
      } else {
        toast.error("Failed to save link");
      }
    } catch {
      toast.error("Error saving link");
    }
  };

  const handleNewLink = () => {
    setEditingLink(null);
    // Calculate sortOrder per section (default section is "company")
    const sectionLinks = footerLinks.filter(l => l.section === "company");
    setLinkForm({
      label: "",
      labelAr: "",
      url: "",
      section: "company",
      isExternal: false,
      isActive: true,
      sortOrder: sectionLinks.length + 1,
    });
    setLinkDialogOpen(true);
  };

  const handleEditLink = (link: FooterLink) => {
    setEditingLink(link);
    setLinkForm({
      label: link.label,
      labelAr: link.labelAr || "",
      url: link.url,
      section: link.section,
      isExternal: link.isExternal,
      isActive: link.isActive,
      sortOrder: link.sortOrder,
    });
    setLinkDialogOpen(true);
  };

  const handleSaveChatbot = async () => {
    try {
      const response = await fetch("/api/admin/content/chatbot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(chatbotSettings),
      });
      
      if (response.ok) {
        toast.success("Chatbot settings saved");
      } else {
        toast.error("Failed to save chatbot settings");
      }
    } catch {
      toast.error("Error saving chatbot settings");
    }
  };

  const handleSaveCompany = async () => {
    // Client-side validation
    if (!companyInfo.name?.trim()) {
      toast.error("Company name is required");
      return;
    }
    // Validate email format if provided
    if (companyInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyInfo.email)) {
      toast.error("Invalid email format");
      return;
    }
    // Validate phone format if provided (basic check for phone-like characters)
    if (companyInfo.phone && !/^[+\d\s()-]+$/.test(companyInfo.phone)) {
      toast.error("Invalid phone format");
      return;
    }
    // Validate social link URLs
    const urlPattern = /^https?:\/\/.+$/;
    if (companyInfo.socialLinks) {
      for (const [platform, url] of Object.entries(companyInfo.socialLinks)) {
        if (url && !urlPattern.test(url)) {
          toast.error(`Invalid URL for ${platform}`);
          return;
        }
      }
    }
    
    try {
      const response = await fetch("/api/admin/content/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(companyInfo),
      });
      
      if (response.ok) {
        toast.success("Company info saved");
      } else {
        toast.error("Failed to save company info");
      }
    } catch {
      toast.error("Error saving company info");
    }
  };

  const groupedLinks = footerLinks.reduce((acc, link) => {
    if (!acc[link.section]) acc[link.section] = [];
    acc[link.section].push(link);
    return acc;
  }, {} as Record<string, FooterLink[]>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("superadmin.nav.footerContent")}</h1>
          <p className="text-muted-foreground">Manage policies, footer links, AI chatbot, and company information</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="border-input text-muted-foreground">
          <RefreshCw className={`h-4 w-4 me-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList className="bg-muted border-input">
          <TabsTrigger value="policies" className="data-[state=active]:bg-muted">Policies</TabsTrigger>
          <TabsTrigger value="links" className="data-[state=active]:bg-muted">Footer Links</TabsTrigger>
          <TabsTrigger value="chatbot" className="data-[state=active]:bg-muted">AI Chatbot</TabsTrigger>
          <TabsTrigger value="company" className="data-[state=active]:bg-muted">Company Info</TabsTrigger>
        </TabsList>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search policies..." value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10 bg-muted border-input text-foreground" />
            </div>
            <Button onClick={handleNewPolicy} className="bg-primary text-primary-foreground">
              <Plus className="h-4 w-4 me-2" />Add Policy
            </Button>
          </div>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground"><FileText className="h-5 w-5" />Policy Pages</CardTitle>
              <CardDescription className="text-muted-foreground">Legal and policy documents displayed on your site</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : filteredPolicies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12"><FileText className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">No policies found</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Title</TableHead>
                      <TableHead className="text-muted-foreground">Type</TableHead>
                      <TableHead className="text-muted-foreground">Slug</TableHead>
                      <TableHead className="text-muted-foreground">Version</TableHead>
                      <TableHead className="text-muted-foreground">Last Updated</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPolicies.map((policy) => {
                      const PolicyIcon = POLICY_ICONS[policy.type] || FileText;
                      return (
                        <TableRow key={policy._id} className="border-border hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <PolicyIcon className="h-4 w-4 text-primary" />
                              <div>
                                <p className="text-foreground font-medium">{policy.title}</p>
                                {policy.titleAr && <p className="text-sm text-muted-foreground">{policy.titleAr}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{policy.type}</Badge></TableCell>
                          <TableCell className="text-muted-foreground font-mono text-sm">/{policy.slug}</TableCell>
                          <TableCell className="text-muted-foreground">v{policy.version}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(policy.lastUpdated)}</TableCell>
                          <TableCell>
                            <Badge className={policy.isPublished ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                              {policy.isPublished ? "Published" : "Draft"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" asChild aria-label={`View policy ${policy.title || policy.slug}`}>
                                <a href={`/${policy.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View policy ${policy.title || policy.slug} (opens in new tab)`}>
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEditPolicy(policy)} aria-label={`Edit policy ${policy.title || policy.slug}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => handleDeletePolicy(policy._id)} aria-label={`Delete policy ${policy.title || policy.slug}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Footer Links Tab */}
        <TabsContent value="links" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleNewLink} className="bg-primary text-primary-foreground">
              <Plus className="h-4 w-4 me-2" />Add Link
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(["company", "support", "legal", "social"] as const).map(section => (
              <Card key={section} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-foreground capitalize text-lg">{section}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(groupedLinks[section] || []).sort((a, b) => a.sortOrder - b.sortOrder).map(link => (
                    <div key={link._id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <Link className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-foreground text-sm">{link.label}</p>
                          <p className="text-xs text-muted-foreground">{link.url}</p>
                        </div>
                        {link.isExternal && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <div className="flex items-center gap-1">
                        {!link.isActive && <Badge variant="outline" className="text-xs">Hidden</Badge>}
                        <Button variant="ghost" size="sm" onClick={() => handleEditLink(link)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!groupedLinks[section] || groupedLinks[section].length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No links in this section</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Chatbot Tab */}
        <TabsContent value="chatbot" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground"><Bot className="h-5 w-5" />AI Chatbot Settings</CardTitle>
              <CardDescription className="text-muted-foreground">Configure the AI-powered customer support chatbot</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-lg">Enable Chatbot</Label>
                  <p className="text-sm text-muted-foreground">Show the chatbot widget on your site</p>
                </div>
                <Switch 
                  checked={chatbotSettings.enabled} 
                  onCheckedChange={(v) => setChatbotSettings({ ...chatbotSettings, enabled: v })} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={chatbotSettings.provider} onValueChange={(v) => setChatbotSettings({ ...chatbotSettings, provider: v as ChatbotSettings["provider"] })}>
                    <SelectTrigger className="bg-muted border-input"><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal (Fixzit AI)</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                      <SelectItem value="custom">Custom API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select value={chatbotSettings.position} onValueChange={(v) => setChatbotSettings({ ...chatbotSettings, position: v as ChatbotSettings["position"] })}>
                    <SelectTrigger className="bg-muted border-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color" 
                      value={chatbotSettings.primaryColor} 
                      onChange={(e) => setChatbotSettings({ ...chatbotSettings, primaryColor: e.target.value })}
                      className="w-12 h-10 p-1 bg-muted border-input"
                    />
                    <Input 
                      value={chatbotSettings.primaryColor} 
                      onChange={(e) => setChatbotSettings({ ...chatbotSettings, primaryColor: e.target.value })}
                      className="bg-muted border-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Model (if applicable)</Label>
                  <Input 
                    value={chatbotSettings.model || ""} 
                    onChange={(e) => setChatbotSettings({ ...chatbotSettings, model: e.target.value })}
                    placeholder="e.g., gpt-4-turbo"
                    className="bg-muted border-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Welcome Message (English)</Label>
                  <Textarea 
                    value={chatbotSettings.welcomeMessage} 
                    onChange={(e) => setChatbotSettings({ ...chatbotSettings, welcomeMessage: e.target.value })}
                    className="bg-muted border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Welcome Message (Arabic)</Label>
                  <Textarea 
                    value={chatbotSettings.welcomeMessageAr || ""} 
                    onChange={(e) => setChatbotSettings({ ...chatbotSettings, welcomeMessageAr: e.target.value })}
                    className="bg-muted border-input"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea 
                  value={chatbotSettings.systemPrompt} 
                  onChange={(e) => setChatbotSettings({ ...chatbotSettings, systemPrompt: e.target.value })}
                  className="bg-muted border-input min-h-[100px]"
                  placeholder="Instructions for the AI assistant..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input 
                    type="number" 
                    value={chatbotSettings.maxTokens} 
                    onChange={(e) => {
                      const parsed = parseInt(e.target.value, 10);
                      const value = isNaN(parsed) ? chatbotSettings.maxTokens : Math.max(1, parsed);
                      setChatbotSettings({ ...chatbotSettings, maxTokens: value });
                    }}
                    className="bg-muted border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature (0-1)</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    min="0"
                    max="1"
                    value={chatbotSettings.temperature} 
                    onChange={(e) => {
                      const parsed = parseFloat(e.target.value);
                      if (isNaN(parsed)) return; // Keep previous value
                      const clamped = Math.min(1, Math.max(0, parsed));
                      setChatbotSettings({ ...chatbotSettings, temperature: clamped });
                    }}
                    className="bg-muted border-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Offline Message</Label>
                <Input 
                  value={chatbotSettings.offlineMessage} 
                  onChange={(e) => setChatbotSettings({ ...chatbotSettings, offlineMessage: e.target.value })}
                  className="bg-muted border-input"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveChatbot} className="bg-primary text-primary-foreground">
                  <Save className="h-4 w-4 me-2" />Save Chatbot Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Info Tab */}
        <TabsContent value="company" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground"><Settings className="h-5 w-5" />Company Information</CardTitle>
              <CardDescription className="text-muted-foreground">Footer company details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Company Name (English)</Label>
                  <Input 
                    value={companyInfo.name} 
                    onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                    className="bg-muted border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Name (Arabic)</Label>
                  <Input 
                    value={companyInfo.nameAr || ""} 
                    onChange={(e) => setCompanyInfo({ ...companyInfo, nameAr: e.target.value })}
                    className="bg-muted border-input"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline (English)</Label>
                  <Input 
                    value={companyInfo.tagline} 
                    onChange={(e) => setCompanyInfo({ ...companyInfo, tagline: e.target.value })}
                    className="bg-muted border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline (Arabic)</Label>
                  <Input 
                    value={companyInfo.taglineAr || ""} 
                    onChange={(e) => setCompanyInfo({ ...companyInfo, taglineAr: e.target.value })}
                    className="bg-muted border-input"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Mail className="h-4 w-4" />Email</Label>
                  <Input 
                    type="email"
                    value={companyInfo.email} 
                    onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                    className="bg-muted border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Phone className="h-4 w-4" />Phone</Label>
                  <Input 
                    value={companyInfo.phone} 
                    onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                    className="bg-muted border-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" />Address (English)</Label>
                  <Textarea 
                    value={companyInfo.address} 
                    onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                    className="bg-muted border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" />Address (Arabic)</Label>
                  <Textarea 
                    value={companyInfo.addressAr || ""} 
                    onChange={(e) => setCompanyInfo({ ...companyInfo, addressAr: e.target.value })}
                    className="bg-muted border-input"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>VAT Number</Label>
                  <Input 
                    value={companyInfo.vatNumber || ""} 
                    onChange={(e) => setCompanyInfo({ ...companyInfo, vatNumber: e.target.value })}
                    className="bg-muted border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CR Number</Label>
                  <Input 
                    value={companyInfo.crNumber || ""} 
                    onChange={(e) => setCompanyInfo({ ...companyInfo, crNumber: e.target.value })}
                    className="bg-muted border-input"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Social Links</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Twitter/X</Label>
                    <Input 
                      value={companyInfo.socialLinks.twitter || ""} 
                      onChange={(e) => setCompanyInfo({ ...companyInfo, socialLinks: { ...companyInfo.socialLinks, twitter: e.target.value } })}
                      placeholder="https://twitter.com/..."
                      className="bg-muted border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">LinkedIn</Label>
                    <Input 
                      value={companyInfo.socialLinks.linkedin || ""} 
                      onChange={(e) => setCompanyInfo({ ...companyInfo, socialLinks: { ...companyInfo.socialLinks, linkedin: e.target.value } })}
                      placeholder="https://linkedin.com/company/..."
                      className="bg-muted border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Facebook</Label>
                    <Input 
                      value={companyInfo.socialLinks.facebook || ""} 
                      onChange={(e) => setCompanyInfo({ ...companyInfo, socialLinks: { ...companyInfo.socialLinks, facebook: e.target.value } })}
                      placeholder="https://facebook.com/..."
                      className="bg-muted border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Instagram</Label>
                    <Input 
                      value={companyInfo.socialLinks.instagram || ""} 
                      onChange={(e) => setCompanyInfo({ ...companyInfo, socialLinks: { ...companyInfo.socialLinks, instagram: e.target.value } })}
                      placeholder="https://instagram.com/..."
                      className="bg-muted border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">YouTube</Label>
                    <Input 
                      value={companyInfo.socialLinks.youtube || ""} 
                      onChange={(e) => setCompanyInfo({ ...companyInfo, socialLinks: { ...companyInfo.socialLinks, youtube: e.target.value } })}
                      placeholder="https://youtube.com/..."
                      className="bg-muted border-input"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveCompany} className="bg-primary text-primary-foreground">
                  <Save className="h-4 w-4 me-2" />Save Company Info
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Policy Dialog */}
      <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? "Edit Policy" : "Create New Policy"}</DialogTitle>
            <DialogDescription className="text-muted-foreground">Configure policy page content</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title (English)</Label>
                <Input value={policyForm.title} onChange={(e) => setPolicyForm({ ...policyForm, title: e.target.value })} className="bg-muted border-input" />
              </div>
              <div className="space-y-2">
                <Label>Title (Arabic)</Label>
                <Input value={policyForm.titleAr} onChange={(e) => setPolicyForm({ ...policyForm, titleAr: e.target.value })} className="bg-muted border-input" dir="rtl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <Input value={policyForm.slug} onChange={(e) => setPolicyForm({ ...policyForm, slug: e.target.value })} placeholder="e.g., privacy-policy" className="bg-muted border-input" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={policyForm.type} onValueChange={(v) => setPolicyForm({ ...policyForm, type: v as PolicyPage["type"] })}>
                  <SelectTrigger className="bg-muted border-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="privacy">Privacy Policy</SelectItem>
                    <SelectItem value="terms">Terms of Service</SelectItem>
                    <SelectItem value="refund">Refund Policy</SelectItem>
                    <SelectItem value="cookie">Cookie Policy</SelectItem>
                    <SelectItem value="accessibility">Accessibility</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content (English)</Label>
              <Textarea value={policyForm.content} onChange={(e) => setPolicyForm({ ...policyForm, content: e.target.value })} placeholder="Policy content in Markdown..." className="bg-muted border-input min-h-[150px]" />
            </div>
            <div className="space-y-2">
              <Label>Content (Arabic)</Label>
              <Textarea value={policyForm.contentAr} onChange={(e) => setPolicyForm({ ...policyForm, contentAr: e.target.value })} placeholder="محتوى السياسة..." className="bg-muted border-input min-h-[150px]" dir="rtl" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={policyForm.isPublished} onCheckedChange={(v) => setPolicyForm({ ...policyForm, isPublished: v })} />
              <Label>Published</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPolicyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePolicy}>{editingPolicy ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>{editingLink ? "Edit Link" : "Add New Link"}</DialogTitle>
            <DialogDescription className="text-muted-foreground">Configure footer link</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label (English)</Label>
                <Input value={linkForm.label} onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })} className="bg-muted border-input" />
              </div>
              <div className="space-y-2">
                <Label>Label (Arabic)</Label>
                <Input value={linkForm.labelAr} onChange={(e) => setLinkForm({ ...linkForm, labelAr: e.target.value })} className="bg-muted border-input" dir="rtl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="/page or https://..." className="bg-muted border-input" />
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={linkForm.section} onValueChange={(v) => setLinkForm({ ...linkForm, section: v as FooterLink["section"] })}>
                <SelectTrigger className="bg-muted border-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={linkForm.isExternal} onCheckedChange={(v) => setLinkForm({ ...linkForm, isExternal: v })} />
                <Label>External Link</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={linkForm.isActive} onCheckedChange={(v) => setLinkForm({ ...linkForm, isActive: v })} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLink}>{editingLink ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
