"use client";

import { useState, useEffect, type ComponentType } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  MessageSquare,
  Package,
  Search,
  XCircle,
} from "@/components/ui/icons";
interface Claim {
  claimId: string;
  claimNumber: string;
  orderId: string;
  claimType: string;
  status: string;
  claimAmount?: number;
  requestedAmount?: number;
  type?: string;
  buyerName?: string;
  sellerName?: string;
  createdAt: string;
  updatedAt: string;
}

interface ClaimListProps {
  view: "buyer" | "seller" | "admin";
  onSelectClaim?: (_claimId: string) => void;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: ComponentType<{ className?: string }>;
  }
> = {
  // Legacy UI keys
  filed: { label: "تم التقديم", variant: "default", icon: FileText },
  "seller-notified": {
    label: "تم إشعار البائع",
    variant: "secondary",
    icon: MessageSquare,
  },
  "under-investigation": {
    label: "قيد التحقيق",
    variant: "secondary",
    icon: Clock,
  },
  "pending-seller-response": {
    label: "بانتظار رد البائع",
    variant: "secondary",
    icon: Clock,
  },
  "seller-responded": {
    label: "رد البائع",
    variant: "default",
    icon: MessageSquare,
  },
  "pending-decision": {
    label: "بانتظار القرار",
    variant: "secondary",
    icon: Clock,
  },
  approved: { label: "تمت الموافقة", variant: "default", icon: CheckCircle2 },
  "partially-approved": {
    label: "موافقة جزئية",
    variant: "default",
    icon: CheckCircle2,
  },
  rejected: { label: "مرفوض", variant: "destructive", icon: XCircle },
  "under-appeal": {
    label: "قيد الاستئناف",
    variant: "secondary",
    icon: AlertCircle,
  },
  closed: { label: "مغلق", variant: "outline", icon: CheckCircle2 },
  // Backend statuses
  pending_review: {
    label: "بانتظار المراجعة",
    variant: "secondary",
    icon: Clock,
  },
  under_review: { label: "قيد المراجعة", variant: "secondary", icon: Clock },
  pending_investigation: {
    label: "قيد التحقيق",
    variant: "secondary",
    icon: Clock,
  },
  pending_evidence: {
    label: "بانتظار الأدلة",
    variant: "secondary",
    icon: Clock,
  },
  approved_backend: {
    label: "تمت الموافقة",
    variant: "default",
    icon: CheckCircle2,
  },
  resolved_refund_full: {
    label: "استرجاع كامل",
    variant: "default",
    icon: CheckCircle2,
  },
  resolved_refund_partial: {
    label: "استرجاع جزئي",
    variant: "default",
    icon: CheckCircle2,
  },
  resolved_replacement: { label: "استبدال", variant: "default", icon: Package },
  escalated: { label: "تصعيد", variant: "secondary", icon: AlertCircle },
  under_appeal: {
    label: "قيد الاستئناف",
    variant: "secondary",
    icon: AlertCircle,
  },
  withdrawn: { label: "تم السحب", variant: "outline", icon: XCircle },
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "جميع الحالات (All)" },
  { value: "pending_review", label: "بانتظار المراجعة" },
  { value: "pending_seller_response", label: "بانتظار رد البائع" },
  { value: "under_review", label: "قيد المراجعة" },
  { value: "pending_investigation", label: "قيد التحقيق" },
  { value: "resolved_refund_full", label: "استرجاع كامل" },
  { value: "resolved_refund_partial", label: "استرجاع جزئي" },
  { value: "resolved_replacement", label: "استبدال" },
  { value: "rejected", label: "مرفوض" },
  { value: "approved", label: "تمت الموافقة" },
  { value: "closed", label: "مغلق" },
  { value: "under_appeal", label: "قيد الاستئناف" },
  { value: "escalated", label: "تصعيد" },
  { value: "withdrawn", label: "تم السحب" },
];

const CLAIM_TYPE_OPTIONS = [
  { value: "item_not_received", label: "لم أستلم السلعة (Item Not Received)" },
  { value: "defective_item", label: "السلعة معيبة (Defective Item)" },
  { value: "not_as_described", label: "لا تطابق الوصف (Not as Described)" },
  { value: "wrong_item", label: "سلعة خاطئة (Wrong Item Sent)" },
  { value: "missing_parts", label: "أجزاء ناقصة (Missing Parts)" },
  { value: "counterfeit", label: "سلعة مزيفة (Counterfeit Item)" },
];

const CLAIM_TYPE_LABELS = CLAIM_TYPE_OPTIONS.reduce<Record<string, string>>(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {},
);

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "جميع الأنواع (All)" },
  ...CLAIM_TYPE_OPTIONS,
];

export default function ClaimList({ view, onSelectClaim }: ClaimListProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;
  const { toast } = useToast();

  useEffect(() => {
    fetchClaims();
  }, [view, currentPage, statusFilter, typeFilter, searchQuery]);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        view: view, // Add view parameter for buyer/seller/admin context
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (typeFilter !== "all") {
        params.append("type", typeFilter); // Changed from 'claimType' to 'type' to match API
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await fetch(`/api/souq/claims?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setClaims(Array.isArray(data.claims) ? data.claims : []);

        const totalPagesFromApi =
          data?.pagination?.totalPages ??
          data?.pagination?.pages ??
          data?.totalPages;
        const parsedTotalPages =
          typeof totalPagesFromApi === "number" &&
          Number.isFinite(totalPagesFromApi)
            ? totalPagesFromApi
            : 1;

        setTotalPages(parsedTotalPages > 0 ? parsedTotalPages : 1);
      } else {
        // Show user-friendly error message
        const payload = await response.json().catch(() => ({}));
        toast({
          title: "فشل في تحميل المطالبات (Failed to load claims)",
          description:
            payload?.error ||
            "حدث خطأ أثناء تحميل المطالبات. يرجى المحاولة مرة أخرى. (An error occurred while loading claims. Please try again.)",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error("Failed to fetch claims", error, {
        component: "ClaimList",
        action: "fetchClaims",
      });
      // Show user-friendly error notification
      toast({
        title: "خطأ في الاتصال (Connection Error)",
        description:
          "تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى. (Unable to connect to server. Please check your internet connection and try again.)",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config =
      STATUS_CONFIG[status] ||
      STATUS_CONFIG["pending_review"] ||
      STATUS_CONFIG.filed;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getTitle = () => {
    if (view === "buyer") return "مطالباتي (My Claims)";
    if (view === "seller") return "المطالبات المقدمة ضدي (Claims Against Me)";
    return "جميع المطالبات (All Claims)";
  };

  const getClaimAmount = (claim: Claim) => {
    const amount = claim.claimAmount ?? claim.requestedAmount ?? 0;
    return Number.isFinite(amount) ? amount : 0;
  };

  const getClaimTypeLabel = (claim: Claim) =>
    CLAIM_TYPE_LABELS[claim.claimType] ??
    CLAIM_TYPE_LABELS[claim.type || ""] ??
    claim.claimType;

  const getClaimDisplayId = (claim: Claim) =>
    claim.claimNumber || claim.claimId;

  const getDescription = () => {
    if (view === "buyer")
      return "عرض وإدارة جميع مطالبات حماية المشتري الخاصة بك";
    if (view === "seller") return "عرض والرد على المطالبات المقدمة ضد منتجاتك";
    return "إدارة جميع مطالبات A-to-Z في المنصة";
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{getTitle()}</CardTitle>
            <CardDescription>{getDescription()}</CardDescription>
          </div>
          {view === "buyer" && (
            <Button
              onClick={() => {
                /* Navigate to new claim form */
              }}
              aria-label="Submit a new claim (تقديم مطالبة جديدة)"
              title="Submit a new claim"
            >
              تقديم مطالبة جديدة
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم المطالبة أو الطلب... (Search by claim or order number...)"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="ps-10"
            />
          </div>

          {/* Status Filter */}
          <div className="relative w-full md:w-[200px]">
            <Filter className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Select
              value={statusFilter}
              onValueChange={handleStatusFilter}
              placeholder="الحالة (Status)"
              className="ps-9"
              wrapperClassName="w-full"
            >
              <SelectItem value="all">جميع الحالات (All)</SelectItem>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Type Filter */}
          <div className="relative w-full md:w-[200px]">
            <Filter className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Select
              value={typeFilter}
              onValueChange={handleTypeFilter}
              placeholder="النوع (Type)"
              className="ps-9"
              wrapperClassName="w-full"
            >
              {TYPE_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>

        {/* Claims Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                جاري التحميل... (Loading...)
              </p>
            </div>
          </div>
        ) : claims.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">لا توجد مطالبات</p>
            <p className="text-sm text-muted-foreground">
              {view === "buyer"
                ? "لم تقدم أي مطالبات بعد (You haven't filed any claims yet)"
                : "لا توجد مطالبات مقدمة ضدك (No claims filed against you)"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم المطالبة</TableHead>
                    <TableHead>رقم الطلب</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الحالة</TableHead>
                    {view === "buyer" && <TableHead>البائع</TableHead>}
                    {view === "seller" && <TableHead>المشتري</TableHead>}
                    {view === "admin" && (
                      <>
                        <TableHead>المشتري</TableHead>
                        <TableHead>البائع</TableHead>
                      </>
                    )}
                    <TableHead>المبلغ</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow
                      key={claim.claimId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onSelectClaim?.(claim.claimId)}
                    >
                      <TableCell className="font-medium">
                        {getClaimDisplayId(claim)}
                      </TableCell>
                      <TableCell>{claim.orderId}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {getClaimTypeLabel(claim)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(claim.status)}</TableCell>
                      {view === "buyer" && (
                        <TableCell>{claim.sellerName}</TableCell>
                      )}
                      {view === "seller" && (
                        <TableCell>{claim.buyerName}</TableCell>
                      )}
                      {view === "admin" && (
                        <>
                          <TableCell>{claim.buyerName}</TableCell>
                          <TableCell>{claim.sellerName}</TableCell>
                        </>
                      )}
                      <TableCell className="font-medium">
                        {getClaimAmount(claim)} SAR
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(claim.createdAt).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClaim?.(claim.claimId);
                          }}
                          aria-label={`View claim ${claim.claimId} details`}
                        >
                          عرض
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {claims.map((claim) => (
                <Card
                  key={claim.claimId}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => onSelectClaim?.(claim.claimId)}
                >
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          #{getClaimDisplayId(claim)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Order #{claim.orderId}
                        </p>
                      </div>
                      {getStatusBadge(claim.status)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm">{getClaimTypeLabel(claim)}</p>
                      <p className="text-sm font-medium">
                        {getClaimAmount(claim)} SAR
                      </p>
                    </div>
                    {view === "buyer" && claim.sellerName && (
                      <p className="text-sm text-muted-foreground">
                        البائع: {claim.sellerName}
                      </p>
                    )}
                    {view === "seller" && claim.buyerName && (
                      <p className="text-sm text-muted-foreground">
                        المشتري: {claim.buyerName}
                      </p>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        {new Date(claim.createdAt).toLocaleDateString("ar-SA")}
                      </p>
                      <Button variant="ghost" size="sm" aria-label="View claim details" title="View claim details">
                        عرض التفاصيل
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  صفحة {currentPage} من {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Go to previous page"
                    title="Previous page"
                  >
                    السابق
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    aria-label="Go to next page"
                    title="Next page"
                  >
                    التالي
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
