"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SimpleFilterBar } from "@/components/ui/compact-filter-bar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/contexts/TranslationContext";
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  Loader2,
  ExternalLink,
  AlertTriangle,
  ShieldAlert,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Roles allowed to access admin approval queue
const ADMIN_ROLES = ["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN", "SUPPORT"];

type OnboardingStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "DOCS_PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
type OnboardingRole = "TENANT" | "PROPERTY_OWNER" | "OWNER" | "VENDOR" | "AGENT";

interface OnboardingCase {
  _id: string;
  role: OnboardingRole;
  status: OnboardingStatus;
  current_step: number;
  basic_info: {
    name: string;
    email: string;
    phone?: string;
  };
  documents: string[];
  country: string;
  createdAt: string;
  subject_user_id?: string;
}

const STATUS_COLORS: Record<OnboardingStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SUBMITTED: "bg-primary/10 text-primary-dark",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
  DOCS_PENDING: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<OnboardingStatus, { en: string; ar: string }> = {
  DRAFT: { en: "Draft", ar: "مسودة" },
  SUBMITTED: { en: "Submitted", ar: "مرسل" },
  UNDER_REVIEW: { en: "Under Review", ar: "قيد المراجعة" },
  DOCS_PENDING: { en: "Documents Pending", ar: "مستندات معلقة" },
  APPROVED: { en: "Approved", ar: "موافق عليه" },
  REJECTED: { en: "Rejected", ar: "مرفوض" },
  CANCELLED: { en: "Cancelled", ar: "ملغي" },
};

const ROLE_LABELS: Record<OnboardingRole, { en: string; ar: string }> = {
  TENANT: { en: "Tenant", ar: "مستأجر" },
  PROPERTY_OWNER: { en: "Property Owner", ar: "مالك عقار" },
  OWNER: { en: "Corporate Owner", ar: "مالك مؤسسي" },
  VENDOR: { en: "Vendor", ar: "مورد" },
  AGENT: { en: "Agent", ar: "وكيل" },
};

export default function AdminApprovalQueuePage() {
  const { t, isRTL } = useTranslation();
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [cases, setCases] = useState<OnboardingCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("SUBMITTED");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  // Review dialog state
  const [selectedCase, setSelectedCase] = useState<OnboardingCase | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // RBAC Check: Only allow admin roles
  const userRole = session?.user?.role as string | undefined;
  const hasAccess = userRole && ADMIN_ROLES.includes(userRole);

  // Redirect if not authorized (after session loads)
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/admin/onboarding");
    }
  }, [status, router]);

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (roleFilter !== "all") params.set("role", roleFilter);
      params.set("limit", "50");

      const res = await fetch(`/api/onboarding?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCases(data);
      }
    } catch (_error) {
      toast.error(isRTL ? "فشل في تحميل الطلبات" : "Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, roleFilter, isRTL]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access denied if no permission
  if (status === "authenticated" && !hasAccess) {
    return (
      <div className="container max-w-2xl py-16 px-4">
        <Card className="border-destructive/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">
              {isRTL ? "الوصول مرفوض" : "Access Denied"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p className="mb-4">
              {isRTL
                ? "ليس لديك صلاحية للوصول إلى قائمة الموافقات. هذه الصفحة مخصصة للمسؤولين فقط."
                : "You do not have permission to access the Approval Queue. This page is restricted to Admin users only."}
            </p>
            <Button variant="outline" onClick={() => router.push("/dashboard")} aria-label={isRTL ? "العودة للوحة التحكم" : "Go back to dashboard"}>
              {isRTL ? "العودة للوحة التحكم" : "Back to Dashboard"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredCases = cases.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.basic_info.name?.toLowerCase().includes(query) ||
      c.basic_info.email?.toLowerCase().includes(query) ||
      c._id.includes(query)
    );
  });

  const handleReview = async () => {
    if (!selectedCase || !reviewAction) return;

    setIsProcessing(true);
    try {
      const newStatus = reviewAction === "approve" 
        ? (selectedCase.documents.length > 0 ? "UNDER_REVIEW" : "APPROVED")
        : "REJECTED";

      const res = await fetch(`/api/onboarding/${selectedCase._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          payload: reviewAction === "reject" ? { rejectionReason } : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      toast.success(
        reviewAction === "approve"
          ? (isRTL ? "تمت الموافقة على الطلب" : "Application approved")
          : (isRTL ? "تم رفض الطلب" : "Application rejected")
      );

      setSelectedCase(null);
      setReviewAction(null);
      setRejectionReason("");
      fetchCases();
    } catch (_error) {
      toast.error(isRTL ? "فشل في تحديث الطلب" : "Failed to update application");
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingCount = cases.filter((c) => c.status === "SUBMITTED").length;
  const reviewingCount = cases.filter((c) => c.status === "UNDER_REVIEW").length;
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const approvedCount = cases.filter((c) => {
    if (c.status !== "APPROVED") return false;
    const ts = (c as { approvedAt?: string | Date; createdAt?: string | Date }).approvedAt ?? c.createdAt;
    if (!ts) return false;
    const d = new Date(ts);
    return d >= startOfDay && d <= endOfDay;
  }).length;

  return (
    <div className="container max-w-7xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {t("admin.approvalQueue", isRTL ? "قائمة الموافقات" : "Approval Queue")}
        </h1>
        <p className="text-muted-foreground">
          {t(
            "admin.approvalQueueDesc",
            isRTL
              ? "مراجعة والموافقة على طلبات الإنضمام"
              : "Review and approve onboarding applications"
          )}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isRTL ? "بانتظار المراجعة" : "Pending Review"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-2xl font-bold">{pendingCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isRTL ? "قيد المراجعة" : "Under Review"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{reviewingCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isRTL ? "تمت الموافقة" : "Approved Today"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{approvedCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <SimpleFilterBar
        className="mb-6"
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: isRTL ? "بحث بالاسم أو البريد..." : "Search by name or email...",
        }}
        filters={[
          {
            id: "status",
            value: statusFilter,
            placeholder: isRTL ? "الحالة" : "Status",
            options: [
              { value: "all", label: isRTL ? "الكل" : "All" },
              { value: "SUBMITTED", label: isRTL ? "مرسل" : "Submitted" },
              { value: "UNDER_REVIEW", label: isRTL ? "قيد المراجعة" : "Under Review" },
              { value: "DOCS_PENDING", label: isRTL ? "مستندات معلقة" : "Docs Pending" },
              { value: "APPROVED", label: isRTL ? "موافق عليه" : "Approved" },
              { value: "REJECTED", label: isRTL ? "مرفوض" : "Rejected" },
            ],
            onChange: setStatusFilter,
            width: "w-[140px]",
          },
          {
            id: "role",
            value: roleFilter,
            placeholder: isRTL ? "الدور" : "Role",
            options: [
              { value: "all", label: isRTL ? "الكل" : "All Roles" },
              { value: "TENANT", label: isRTL ? "مستأجر" : "Tenant" },
              { value: "PROPERTY_OWNER", label: isRTL ? "مالك عقار" : "Property Owner" },
              { value: "OWNER", label: isRTL ? "مالك مؤسسي" : "Corporate Owner" },
              { value: "VENDOR", label: isRTL ? "مورد" : "Vendor" },
              { value: "AGENT", label: isRTL ? "وكيل" : "Agent" },
            ],
            onChange: setRoleFilter,
            width: "w-[150px]",
          },
        ]}
        onClear={() => { setSearchQuery(""); setStatusFilter("all"); setRoleFilter("all"); }}
      />

      {/* Cases Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4" />
              <p>{isRTL ? "لا توجد طلبات" : "No applications found"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "مقدم الطلب" : "Applicant"}</TableHead>
                  <TableHead>{isRTL ? "الدور" : "Role"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "المستندات" : "Documents"}</TableHead>
                  <TableHead>{isRTL ? "تاريخ التقديم" : "Submitted"}</TableHead>
                  <TableHead className="text-end">{isRTL ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{c.basic_info.name}</p>
                          <p className="text-sm text-muted-foreground">{c.basic_info.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ROLE_LABELS[c.role]?.[isRTL ? "ar" : "en"] || c.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("font-normal", STATUS_COLORS[c.status])}>
                        {STATUS_LABELS[c.status]?.[isRTL ? "ar" : "en"] || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {c.documents?.length || 0} {isRTL ? "مستند" : "docs"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString(isRTL ? "ar-SA" : "en-US")}
                      </span>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/admin/onboarding/${c._id}`, "_blank")}
                          aria-label={isRTL ? `فتح طلب ${c.basic_info.name}` : `Open application for ${c.basic_info.name}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {(c.status === "SUBMITTED" || c.status === "UNDER_REVIEW") && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => {
                                setSelectedCase(c);
                                setReviewAction("approve");
                              }}
                              aria-label={isRTL ? `الموافقة على طلب ${c.basic_info.name}` : `Approve application for ${c.basic_info.name}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setSelectedCase(c);
                                setReviewAction("reject");
                              }}
                              aria-label={isRTL ? `رفض طلب ${c.basic_info.name}` : `Reject application for ${c.basic_info.name}`}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewAction && !!selectedCase} onOpenChange={() => {
        setReviewAction(null);
        setSelectedCase(null);
        setRejectionReason("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve"
                ? (isRTL ? "تأكيد الموافقة" : "Confirm Approval")
                : (isRTL ? "تأكيد الرفض" : "Confirm Rejection")}
            </DialogTitle>
            <DialogDescription>
              {selectedCase && (
                <span>
                  {isRTL
                    ? `مراجعة طلب ${selectedCase.basic_info.name}`
                    : `Reviewing application for ${selectedCase.basic_info.name}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {reviewAction === "reject" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {isRTL ? "سبب الرفض" : "Rejection Reason"}
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={isRTL ? "اكتب سبب الرفض..." : "Enter rejection reason..."}
                rows={3}
              />
            </div>
          )}

          {reviewAction === "approve" && selectedCase && selectedCase.documents.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                {isRTL
                  ? "لم يتم تحميل أي مستندات. سيتم الموافقة على الطلب مباشرة."
                  : "No documents uploaded. Application will be approved directly."}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewAction(null);
                setSelectedCase(null);
                setRejectionReason("");
              }}
              disabled={isProcessing}
              aria-label={isRTL ? "إلغاء المراجعة" : "Cancel review"}
            >
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              variant={reviewAction === "approve" ? "default" : "destructive"}
              onClick={handleReview}
              disabled={isProcessing || (reviewAction === "reject" && !rejectionReason.trim())}
              aria-label={reviewAction === "approve" ? (isRTL ? "تأكيد الموافقة" : "Confirm approval") : (isRTL ? "تأكيد الرفض" : "Confirm rejection")}
            >
              {isProcessing && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {reviewAction === "approve"
                ? (isRTL ? "موافقة" : "Approve")
                : (isRTL ? "رفض" : "Reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
