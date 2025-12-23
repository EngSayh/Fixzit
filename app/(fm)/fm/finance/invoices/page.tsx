"use client";
import { logger } from "@/lib/logger";
import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Pagination } from "@/components/ui/pagination";
import { CardGridSkeleton } from "@/components/skeletons";
import {
  FileText,
  Plus,
  Search,
  DollarSign,
  QrCode,
  Send,
  Eye,
  Download,
  Mail,
  CheckCircle,
  AlertCircle,
  Clock,
} from "@/components/ui/icons";
import { useTranslation } from "@/contexts/TranslationContext";
import { FmGuardedPage } from "@/components/fm/FmGuardedPage";
import ClientDate from "@/components/ClientDate";
import { parseDate } from "@/lib/date-utils";
import { EMAIL_DOMAINS } from "@/lib/config/domains";
import type { Invoice } from "@/types/invoice";

export default function InvoicesPage() {
  return (
    <FmGuardedPage moduleId="finance">
      {({ orgId, supportOrg }) => (
        <InvoicesContent orgId={orgId} supportOrg={supportOrg} />
      )}
    </FmGuardedPage>
  );
}

type InvoicesContentProps = {
  orgId: string;
  supportOrg?: { name?: string } | null;
};

type InvoiceFormLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: { type: string; rate: number; amount: number };
  total: number;
};

type InvoiceFormData = {
  type: string;
  issuer: {
    name: string;
    taxId: string;
    address: string;
    phone: string;
    email: string;
    registration: string;
    license: string;
  };
  recipient: {
    name: string;
    taxId: string;
    address: string;
    phone: string;
    email: string;
    customerId: string;
  };
  issueDate: string;
  dueDate: string;
  description: string;
  items: InvoiceFormLineItem[];
  currency: string;
  payment: {
    method: string;
    terms: string;
    instructions: string;
    account: {
      bank: string;
      accountNumber: string;
      iban: string;
      swift: string;
    };
  };
};

const createDefaultLineItem = (): InvoiceFormLineItem => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  tax: { type: "VAT", rate: 15, amount: 0 },
  total: 0,
});

const createInitialFormData = (): InvoiceFormData => ({
  type: "SALES",
  issuer: {
    name: "Fixzit Enterprise Co.",
    taxId: "300000000000003",
    address: "King Fahd Road, Riyadh 11564, Saudi Arabia",
    phone: "+966 11 123 4567",
    email: EMAIL_DOMAINS.invoices,
    registration: "CR-1234567890",
    license: "L-1234567890",
  },
  recipient: {
    name: "",
    taxId: "",
    address: "",
    phone: "",
    email: "",
    customerId: "",
  },
  issueDate: new Date().toISOString().split("T")[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
  description: "",
  items: [createDefaultLineItem()],
  currency: "SAR",
  payment: {
    method: "BANK_TRANSFER",
    terms: "Net 30",
    instructions: "Please transfer to the following account:",
    account: {
      bank: "Al Rajhi Bank",
      accountNumber: "1234567890",
      iban: "SA0380000000608010167519",
      swift: "RJHISARI",
    },
  },
});

function InvoicesContent({ orgId, supportOrg }: InvoicesContentProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetcher = (url: string) =>
    fetch(url)
      .then((r) => r.json())
      .catch((error) => {
        logger.error("FM invoices fetch error", error);
        throw error;
      });

  const { data, mutate, isLoading } = useSWR(
    orgId
      ? [
          `/api/finance/invoices?q=${encodeURIComponent(search)}&status=${statusFilter}&type=${typeFilter}&page=${currentPage}&limit=${itemsPerPage}&org=${encodeURIComponent(
            orgId,
          )}`,
          orgId,
        ]
      : null,
    ([url]) => fetcher(url),
  );

  if (!session) {
    return <CardGridSkeleton count={6} />;
  }

  const invoices: Invoice[] = data?.data || [];

  const totalPages = data?.pagination?.pages || 1;
  const totalItems = data?.pagination?.total || 0;

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="finance" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t("fm.invoices.title", "Invoices")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "fm.invoices.subtitle",
              "ZATCA compliant e-invoicing with QR codes",
            )}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-success hover:bg-success/90">
              <Plus className="w-4 h-4 me-2" />
              {t("fm.invoices.newInvoice", "New Invoice")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("fm.invoices.createInvoice", "Create Invoice")}
              </DialogTitle>
            </DialogHeader>
            <CreateInvoiceForm
              orgId={orgId}
              onCreated={() => {
                mutate();
                setCreateOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t("fm.finance.support.activeOrg", "Support context: {{name}}", {
            name: supportOrg.name ?? "Support org",
          })}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("fm.invoices.totalOutstanding", "Total Outstanding")}
                </p>
                <p className="text-2xl font-bold">
                  {invoices
                    .filter(
                      (inv: Invoice) =>
                        inv.status !== "PAID" && inv.status !== "CANCELLED",
                    )
                    .reduce((sum: number, inv: Invoice) => sum + inv.total, 0)
                    .toLocaleString()}{" "}
                  SAR
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("fm.invoices.overdue", "Overdue")}
                </p>
                <p className="text-2xl font-bold text-destructive">
                  {
                    invoices.filter((inv: Invoice) => inv.status === "OVERDUE")
                      .length
                  }
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("fm.invoices.pending", "Pending")}
                </p>
                <p className="text-2xl font-bold text-accent-foreground">
                  {
                    invoices.filter(
                      (inv: Invoice) =>
                        inv.status === "SENT" || inv.status === "VIEWED",
                    ).length
                  }
                </p>
              </div>
              <Clock className="w-8 h-8 text-accent-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("fm.invoices.paidThisMonth", "Paid This Month")}
                </p>
                <p className="text-2xl font-bold text-success">
                  {
                    invoices.filter((inv: Invoice) => {
                      if (inv.status !== "PAID") {
                        return false;
                      }
                      const paymentDate = parseDate(
                        inv.payments?.[0]?.date,
                        () => new Date(),
                      );
                      return paymentDate.getMonth() === new Date().getMonth();
                    }).length
                  }
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t(
                    "fm.invoices.searchInvoices",
                    "Search by invoice number or customer...",
                  )}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-10"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder={t("fm.properties.status", "Status")}
              className="w-48"
            >
              <SelectContent>
                <SelectItem value="">
                  {t("common.all", "All Status")}
                </SelectItem>
                <SelectItem value="DRAFT">
                  {t("fm.invoices.draft", "Draft")}
                </SelectItem>
                <SelectItem value="SENT">
                  {t("fm.invoices.sent", "Sent")}
                </SelectItem>
                <SelectItem value="VIEWED">
                  {t("fm.invoices.viewed", "Viewed")}
                </SelectItem>
                <SelectItem value="APPROVED">
                  {t("fm.vendors.approved", "Approved")}
                </SelectItem>
                <SelectItem value="PAID">
                  {t("fm.invoices.paid", "Paid")}
                </SelectItem>
                <SelectItem value="OVERDUE">
                  {t("fm.invoices.overdue", "Overdue")}
                </SelectItem>
                <SelectItem value="CANCELLED">
                  {t("fm.invoices.cancelled", "Cancelled")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={setTypeFilter}
              placeholder={t("fm.properties.type", "Type")}
              className="w-48"
            >
              <SelectContent>
                <SelectItem value="">
                  {t("fm.properties.allTypes", "All Types")}
                </SelectItem>
                <SelectItem value="SALES">
                  {t("fm.invoices.sales", "Sales")}
                </SelectItem>
                <SelectItem value="PURCHASE">
                  {t("fm.invoices.purchase", "Purchase")}
                </SelectItem>
                <SelectItem value="RENTAL">
                  {t("fm.invoices.rental", "Rental")}
                </SelectItem>
                <SelectItem value="SERVICE">
                  {t("fm.invoices.service", "Service")}
                </SelectItem>
                <SelectItem value="MAINTENANCE">
                  {t("fm.invoices.maintenance", "Maintenance")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Grid */}
      {isLoading ? (
        <CardGridSkeleton count={itemsPerPage} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {invoices.map((invoice: Invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onUpdated={mutate}
                orgId={orgId}
              />
            ))}
          </div>

          {/* Empty State */}
          {invoices.length === 0 && !isLoading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t("fm.invoices.noInvoices", "No Invoices Found")}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t(
                    "fm.invoices.noInvoicesText",
                    "Get started by creating your first invoice.",
                  )}
                </p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="bg-success hover:bg-success/90"
                >
                  <Plus className="w-4 h-4 me-2" />
                  {t("fm.invoices.createInvoice", "Create Invoice")}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {totalItems > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function InvoiceCard({
  invoice,
  onUpdated,
  orgId,
}: {
  invoice: Invoice;
  onUpdated: () => void;
  orgId: string;
}) {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleViewInvoice = () => {
    // Open invoice detail view in a new tab or modal
    window.open(`/fm/finance/invoices/${invoice.id}`, "_blank");
  };

  const handleDownloadInvoice = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/finance/invoices/${invoice.id}/download?org=${encodeURIComponent(orgId)}`);
      if (!response.ok) {
        throw new Error("Failed to download invoice");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoice.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(t("fm.invoices.toast.downloadSuccess", "Invoice downloaded successfully"));
    } catch (error) {
      logger.error("Invoice download failed", error);
      toast.error(t("fm.invoices.toast.downloadFailed", "Failed to download invoice"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendInvoice = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/finance/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" }),
      });
      if (!response.ok) {
        throw new Error("Failed to send invoice");
      }
      toast.success(t("fm.invoices.toast.sendSuccess", "Invoice sent successfully"));
      onUpdated();
    } catch (error) {
      logger.error("Invoice send failed", error);
      toast.error(t("fm.invoices.toast.sendFailed", "Failed to send invoice"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendReminder = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/finance/invoices/${invoice.id}/reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (!response.ok) {
        throw new Error("Failed to send reminder");
      }
      toast.success(t("fm.invoices.toast.reminderSuccess", "Payment reminder sent"));
      onUpdated();
    } catch (error) {
      logger.error("Invoice reminder failed", error);
      toast.error(t("fm.invoices.toast.reminderFailed", "Failed to send reminder"));
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-muted text-foreground";
      case "SENT":
        return "bg-primary/10 text-primary-foreground";
      case "VIEWED":
        return "bg-secondary/10 text-secondary";
      case "APPROVED":
        return "bg-success/10 text-success-foreground";
      case "PAID":
        return "bg-success/10 text-success";
      case "OVERDUE":
        return "bg-destructive/10 text-destructive-foreground";
      case "CANCELLED":
        return "bg-muted text-foreground";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: t("fm.invoices.draft", "Draft"),
      SENT: t("fm.invoices.sent", "Sent"),
      VIEWED: t("fm.invoices.viewed", "Viewed"),
      APPROVED: t("fm.vendors.approved", "Approved"),
      PAID: t("fm.invoices.paid", "Paid"),
      OVERDUE: t("fm.invoices.overdue", "Overdue"),
      CANCELLED: t("fm.invoices.cancelled", "Cancelled"),
    };
    return labels[status] || status.toLowerCase();
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SALES: t("fm.invoices.sales", "Sales"),
      PURCHASE: t("fm.invoices.purchase", "Purchase"),
      RENTAL: t("fm.invoices.rental", "Rental"),
      SERVICE: t("fm.invoices.service", "Service"),
      MAINTENANCE: t("fm.invoices.maintenance", "Maintenance"),
    };
    return labels[type] || type.toLowerCase();
  };

  const getZATCAStatus = (status: string) => {
    switch (status) {
      case "CLEARED":
        return { icon: CheckCircle, color: "text-success" };
      case "PENDING":
        return { icon: Clock, color: "text-warning" };
      default:
        return { icon: AlertCircle, color: "text-muted-foreground" };
    }
  };

  const zatcaStatus = getZATCAStatus(invoice.zatca?.status || "PENDING");
  const ZatcaIcon = zatcaStatus.icon;

  const dueDateValue =
    invoice.status === "OVERDUE" && invoice.dueDate
      ? new Date(invoice.dueDate)
      : null;
  const daysOverdue =
    dueDateValue != null
      ? Math.floor(
          (Date.now() - dueDateValue.getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{invoice.number}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {invoice.recipient?.name}
            </p>
          </div>
          <Badge className={getStatusColor(invoice.status ?? 'DRAFT')}>
            {getStatusLabel(invoice.status ?? 'DRAFT')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">
            {invoice.total?.toLocaleString()} {invoice.currency}
          </span>
          <div className="flex items-center space-x-2">
            <ZatcaIcon className={`w-5 h-5 ${zatcaStatus.color}`} />
            {invoice.zatca?.qrCode && (
              <QrCode className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">
              {t("fm.invoices.issueDate", "Issue Date")}
            </p>
            <p className="font-medium">
              {invoice.issueDate ? <ClientDate date={invoice.issueDate} format="date-only" /> : '-'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">
              {t("fm.invoices.dueDate", "Due Date")}
            </p>
            <p
              className={`font-medium ${daysOverdue > 0 ? "text-destructive" : ""}`}
            >
              {invoice.dueDate ? <ClientDate date={invoice.dueDate} format="date-only" /> : '-'}
              {daysOverdue > 0 &&
                ` (${daysOverdue}${t("fm.invoices.overdueDays", "d overdue")})`}
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm">
            <Badge variant="outline" className="text-xs">
              {getTypeLabel(invoice.type ?? 'STANDARD')}
            </Badge>
            {invoice.lines?.length && (
              <span className="text-muted-foreground">
                {invoice.lines.length} {t("fm.invoices.items", "items")}
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleViewInvoice}
              disabled={isProcessing}
              aria-label={t("fm.invoices.viewInvoice", "View invoice")}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDownloadInvoice}
              disabled={isProcessing}
              aria-label={t("fm.invoices.downloadInvoice", "Download invoice")}
            >
              <Download className="w-4 h-4" />
            </Button>
            {invoice.status === "DRAFT" && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSendInvoice}
                disabled={isProcessing}
                aria-label={t("fm.invoices.sendInvoice", "Send invoice")}
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
            {(invoice.status === "SENT" || invoice.status === "VIEWED") && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSendReminder}
                disabled={isProcessing}
                aria-label={t("fm.invoices.sendReminder", "Send payment reminder")}
              >
                <Mail className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateInvoiceForm({
  onCreated,
  orgId,
}: {
  onCreated: () => void;
  orgId: string;
}) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<InvoiceFormData>(() =>
    createInitialFormData(),
  );

  const calculateItemTotal = (
    item: InvoiceFormLineItem,
  ): InvoiceFormLineItem => {
    const discount = item.discount ?? 0;
    const taxRate = item.tax?.rate ?? 0;
    const subtotal = item.quantity * item.unitPrice - discount;
    const taxAmount = subtotal * (taxRate / 100);
    return {
      ...item,
      discount,
      tax: { type: item.tax?.type ?? "VAT", rate: taxRate, amount: taxAmount },
      total: subtotal + taxAmount,
    };
  };

  const handleItemChange = (
    index: number,
    field: string,
    value: number | string | { type: string; rate: number; amount: number },
  ) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = calculateItemTotal({
        ...newItems[index],
        [field]: value,
      });
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, createDefaultLineItem()],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orgForRequest = orgId;
      const response = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: orgForRequest,
          type: formData.type,
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          currency: formData.currency,
          // Include recipient/customer data
          recipient: {
            name: formData.recipient.name,
            taxId: formData.recipient.taxId || undefined,
            address: formData.recipient.address || undefined,
            phone: formData.recipient.phone || undefined,
            email: formData.recipient.email || undefined,
            customerId: formData.recipient.customerId || undefined,
          },
          // Include issuer data
          issuer: formData.issuer,
          lines: formData.items.map((it: InvoiceFormLineItem) => ({
            description: it.description,
            qty: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount ?? 0,
            vatRate: it.tax?.rate ?? 15,
          })),
          // Include payment terms
          payment: formData.payment,
        }),
      });

      if (response.ok) {
        toast.success(
          t("fm.invoices.toast.createSuccess", "Invoice created successfully"),
        );
        onCreated();
      } else {
        const error = await response.json().catch(() => ({}));
        const message =
          error &&
          typeof error === "object" &&
          "error" in error &&
          typeof error.error === "string"
            ? error.error
            : t("fm.invoices.errors.unknown", "Unknown error");
        toast.error(
          t(
            "fm.invoices.toast.createFailed",
            "Failed to create invoice: {{message}}",
          ).replace("{{message}}", message),
        );
      }
    } catch {
      toast.error(
        t(
          "fm.invoices.toast.createUnknown",
          "Error creating invoice. Please try again.",
        ),
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.invoices.invoiceType", "Invoice Type")}
          </label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SALES">
                {t("fm.invoices.sales", "Sales")}
              </SelectItem>
              <SelectItem value="PURCHASE">
                {t("fm.invoices.purchase", "Purchase")}
              </SelectItem>
              <SelectItem value="RENTAL">
                {t("fm.invoices.rental", "Rental")}
              </SelectItem>
              <SelectItem value="SERVICE">
                {t("fm.invoices.service", "Service")}
              </SelectItem>
              <SelectItem value="MAINTENANCE">
                {t("fm.invoices.maintenance", "Maintenance")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.invoices.currency", "Currency")}
          </label>
          <Select
            value={formData.currency}
            onValueChange={(value) =>
              setFormData({ ...formData, currency: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SAR">SAR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="AED">AED</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">
          {t("fm.invoices.customerInfo", "Customer Information")}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("fm.invoices.customerName", "Customer Name")} *
            </label>
            <Input
              value={formData.recipient.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  recipient: { ...formData.recipient, name: e.target.value },
                })
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("fm.invoices.taxId", "Tax ID")}
            </label>
            <Input
              value={formData.recipient.taxId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  recipient: { ...formData.recipient, taxId: e.target.value },
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.invoices.issueDate", "Issue Date")} *
          </label>
          <Input
            type="date"
            value={formData.issueDate}
            onChange={(e) =>
              setFormData({ ...formData, issueDate: e.target.value })
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.invoices.dueDate", "Due Date")} *
          </label>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) =>
              setFormData({ ...formData, dueDate: e.target.value })
            }
            required
          />
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">
          {t("fm.invoices.lineItems", "Line Items")}
        </h3>
        <div className="space-y-2">
          {formData.items.map((item, index) => (
            <div
              key={`item-${index}`}
              className="grid grid-cols-12 gap-2 items-center"
            >
              <div className="col-span-4">
                <Input
                  placeholder={t("fm.invoices.description", "Description")}
                  value={item.description}
                  onChange={(e) =>
                    handleItemChange(index, "description", e.target.value)
                  }
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder={t("fm.invoices.quantity", "Qty")}
                  value={item.quantity}
                  onChange={(e) =>
                    handleItemChange(index, "quantity", Number(e.target.value))
                  }
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder={t("fm.invoices.unitPrice", "Price")}
                  value={item.unitPrice}
                  onChange={(e) =>
                    handleItemChange(index, "unitPrice", Number(e.target.value))
                  }
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder={t("fm.invoices.vat", "VAT %")}
                  value={item.tax.rate}
                  onChange={(e) =>
                    handleItemChange(index, "tax", {
                      ...item.tax,
                      rate: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="col-span-1 text-end font-medium">
                {item.total.toFixed(2)}
              </div>
              <div className="col-span-1">
                {formData.items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="text-destructive"
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="mt-2"
        >
          {t("fm.invoices.addLineItem", "Add Line Item")}
        </Button>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" className="bg-success hover:bg-success/90">
          {t("fm.invoices.createInvoice", "Create Invoice")}
        </Button>
      </div>
    </form>
  );
}
