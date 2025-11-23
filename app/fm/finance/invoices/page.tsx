'use client';
import { logger } from '@/lib/logger';

import { useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Pagination } from '@/components/ui/pagination';
import { CardGridSkeleton } from '@/components/skeletons';
import {
  FileText, Plus, Search, DollarSign,
  QrCode, Send, Eye, Download, Mail, CheckCircle,
  AlertCircle, Clock } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { FmGuardedPage } from '@/components/fm/FmGuardedPage';
import ClientDate from '@/components/ClientDate';
import { parseDate } from '@/lib/date-utils';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: {
    type: string;
    rate: number;
    amount: number;
  };
  total: number;
}

interface InvoiceRecipient {
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  customerId?: string;
}

interface InvoiceZATCA {
  status?: string;
  qrCode?: string;
}

interface InvoicePayment {
  date?: string;
}

interface Invoice {
  id: string;
  number: string;
  recipient: InvoiceRecipient;
  status: string;
  total: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  type: string;
  items?: InvoiceItem[];
  zatca?: InvoiceZATCA;
  payments?: InvoicePayment[];
}

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

function InvoicesContent({ orgId, supportOrg }: InvoicesContentProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetcher = (url: string) =>
    fetch(url)
      .then((r) => r.json())
      .catch((error) => {
        logger.error('FM invoices fetch error', error);
        throw error;
      });

  const { data, mutate, isLoading } = useSWR(
    orgId
      ? `/api/finance/invoices?q=${encodeURIComponent(search)}&status=${statusFilter}&type=${typeFilter}&page=${currentPage}&limit=${itemsPerPage}&org=${encodeURIComponent(
          orgId
        )}`
      : null,
    fetcher
  );

  if (!session) {
    return <CardGridSkeleton count={6} />;
  }

  const invoices: Invoice[] = (data?.data || []);
  
  const totalPages = data?.pagination?.pages || 1;
  const totalItems = data?.pagination?.total || 0;

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="finance" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('fm.invoices.title', 'Invoices')}</h1>
          <p className="text-muted-foreground">{t('fm.invoices.subtitle', 'ZATCA compliant e-invoicing with QR codes')}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 me-2" />
              {t('fm.invoices.newInvoice', 'New Invoice')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('fm.invoices.createInvoice', 'Create Invoice')}</DialogTitle>
            </DialogHeader>
            <CreateInvoiceForm orgId={orgId} onCreated={() => { mutate(); setCreateOpen(false); }} />
          </DialogContent>
        </Dialog>
      </div>
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t('fm.finance.support.activeOrg', 'Support context: {{name}}', { name: supportOrg?.name ?? 'Support org' })}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fm.invoices.totalOutstanding', 'Total Outstanding')}</p>
                <p className="text-2xl font-bold">
                  {invoices
                    .filter((inv: Invoice) => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
                    .reduce((sum: number, inv: Invoice) => sum + inv.total, 0)
                    .toLocaleString()} SAR
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fm.invoices.overdue', 'Overdue')}</p>
                <p className="text-2xl font-bold text-destructive">
                  {invoices.filter((inv: Invoice) => inv.status === 'OVERDUE').length}
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
                <p className="text-sm text-muted-foreground">{t('fm.invoices.pending', 'Pending')}</p>
                <p className="text-2xl font-bold text-accent-foreground">
                  {invoices.filter((inv: Invoice) => inv.status === 'SENT' || inv.status === 'VIEWED').length}
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
                <p className="text-sm text-muted-foreground">{t('fm.invoices.paidThisMonth', 'Paid This Month')}</p>
                <p className="text-2xl font-bold text-success">
                  {invoices.filter((inv: Invoice) => {
                    if (inv.status !== 'PAID') {
                      return false;
                    }
                    const paymentDate = parseDate(inv.payments?.[0]?.date, () => new Date());
                    return paymentDate.getMonth() === new Date().getMonth();
                  }).length}
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
                  placeholder={t('fm.invoices.searchInvoices', 'Search by invoice number or customer...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-10"
                />
              </div>
            </div>
              <Select value={statusFilter} onValueChange={setStatusFilter} placeholder={t('fm.properties.status', 'Status')} className="w-48">
                <SelectContent>
                <SelectItem value="">{t('common.all', 'All Status')}</SelectItem>
                <SelectItem value="DRAFT">{t('fm.invoices.draft', 'Draft')}</SelectItem>
                <SelectItem value="SENT">{t('fm.invoices.sent', 'Sent')}</SelectItem>
                <SelectItem value="VIEWED">{t('fm.invoices.viewed', 'Viewed')}</SelectItem>
                <SelectItem value="APPROVED">{t('fm.vendors.approved', 'Approved')}</SelectItem>
                <SelectItem value="PAID">{t('fm.invoices.paid', 'Paid')}</SelectItem>
                <SelectItem value="OVERDUE">{t('fm.invoices.overdue', 'Overdue')}</SelectItem>
                <SelectItem value="CANCELLED">{t('fm.invoices.cancelled', 'Cancelled')}</SelectItem>
              </SelectContent>
            </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter} placeholder={t('fm.properties.type', 'Type')} className="w-48">
                <SelectContent>
                <SelectItem value="">{t('fm.properties.allTypes', 'All Types')}</SelectItem>
                <SelectItem value="SALES">{t('fm.invoices.sales', 'Sales')}</SelectItem>
                <SelectItem value="PURCHASE">{t('fm.invoices.purchase', 'Purchase')}</SelectItem>
                <SelectItem value="RENTAL">{t('fm.invoices.rental', 'Rental')}</SelectItem>
                <SelectItem value="SERVICE">{t('fm.invoices.service', 'Service')}</SelectItem>
                <SelectItem value="MAINTENANCE">{t('fm.invoices.maintenance', 'Maintenance')}</SelectItem>
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
              <InvoiceCard key={invoice.id} invoice={invoice} onUpdated={mutate} orgId={orgId} />
            ))}
          </div>

          {/* Empty State */}
          {invoices.length === 0 && !isLoading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('fm.invoices.noInvoices', 'No Invoices Found')}</h3>
                <p className="text-muted-foreground mb-4">{t('fm.invoices.noInvoicesText', 'Get started by creating your first invoice.')}</p>
                <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 me-2" />
                  {t('fm.invoices.createInvoice', 'Create Invoice')}
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

function InvoiceCard({ invoice, onUpdated, orgId }: { invoice: Invoice; onUpdated: () => void; orgId: string }) {
  const { t } = useTranslation();
  
  // Suppress unused variable warnings - these props are for future use
  void onUpdated;
  void orgId;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-muted text-foreground';
      case 'SENT':
        return 'bg-primary/10 text-primary-foreground';
      case 'VIEWED':
        return 'bg-secondary/10 text-secondary';
      case 'APPROVED':
        return 'bg-success/10 text-success-foreground';
      case 'PAID':
        return 'bg-emerald-100 text-emerald-800';
      case 'OVERDUE':
        return 'bg-destructive/10 text-destructive-foreground';
      case 'CANCELLED':
        return 'bg-muted text-foreground';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'DRAFT': t('fm.invoices.draft', 'Draft'),
      'SENT': t('fm.invoices.sent', 'Sent'),
      'VIEWED': t('fm.invoices.viewed', 'Viewed'),
      'APPROVED': t('fm.vendors.approved', 'Approved'),
      'PAID': t('fm.invoices.paid', 'Paid'),
      'OVERDUE': t('fm.invoices.overdue', 'Overdue'),
      'CANCELLED': t('fm.invoices.cancelled', 'Cancelled'),
    };
    return labels[status] || status.toLowerCase();
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'SALES': t('fm.invoices.sales', 'Sales'),
      'PURCHASE': t('fm.invoices.purchase', 'Purchase'),
      'RENTAL': t('fm.invoices.rental', 'Rental'),
      'SERVICE': t('fm.invoices.service', 'Service'),
      'MAINTENANCE': t('fm.invoices.maintenance', 'Maintenance'),
    };
    return labels[type] || type.toLowerCase();
  };

  const getZATCAStatus = (status: string) => {
    switch (status) {
      case 'CLEARED':
        return { icon: CheckCircle, color: 'text-success' };
      case 'PENDING':
        return { icon: Clock, color: 'text-warning' };
      default:
        return { icon: AlertCircle, color: 'text-muted-foreground' };
    }
  };

  const zatcaStatus = getZATCAStatus(invoice.zatca?.status || 'PENDING');
  const ZatcaIcon = zatcaStatus.icon;

  const daysOverdue = invoice.status === 'OVERDUE' 
    ? Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{invoice.number}</CardTitle>
            <p className="text-sm text-muted-foreground">{invoice.recipient?.name}</p>
          </div>
          <Badge className={getStatusColor(invoice.status)}>
            {getStatusLabel(invoice.status)}
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
            <p className="text-muted-foreground">{t('fm.invoices.issueDate', 'Issue Date')}</p>
            <p className="font-medium">
              <ClientDate date={invoice.issueDate} format="date-only" />
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('fm.invoices.dueDate', 'Due Date')}</p>
            <p className={`font-medium ${daysOverdue > 0 ? 'text-destructive' : ''}`}>
              <ClientDate date={invoice.dueDate} format="date-only" />
              {daysOverdue > 0 && ` (${daysOverdue}${t('fm.invoices.overdueDays', 'd overdue')})`}
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm">
            <Badge variant="outline" className="text-xs">
              {getTypeLabel(invoice.type)}
            </Badge>
            {invoice.items?.length && (
              <span className="text-muted-foreground">
                {invoice.items.length} {t('fm.invoices.items', 'items')}
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4" />
            </Button>
            {invoice.status === 'DRAFT' && (
              <Button variant="ghost" size="sm">
                <Send className="w-4 h-4" />
              </Button>
            )}
            {(invoice.status === 'SENT' || invoice.status === 'VIEWED') && (
              <Button variant="ghost" size="sm">
                <Mail className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateInvoiceForm({ onCreated, orgId }: { onCreated: () => void; orgId: string }) {
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    type: 'SALES',
    issuer: {
      name: 'Fixzit Enterprise Co.',
      taxId: '300000000000003',
      address: 'King Fahd Road, Riyadh 11564, Saudi Arabia',
      phone: '+966 11 123 4567',
      email: 'invoices@fixzit.co',
      registration: 'CR-1234567890',
      license: 'L-1234567890'
    },
    recipient: {
      name: '',
      taxId: '',
      address: '',
      phone: '',
      email: '',
      customerId: ''
    },
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: '',
    items: [{
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: {
        type: 'VAT',
        rate: 15,
        amount: 0
      },
      total: 0
    }],
    currency: 'SAR',
    payment: {
      method: 'BANK_TRANSFER',
      terms: 'Net 30',
      instructions: 'Please transfer to the following account:',
      account: {
        bank: 'Al Rajhi Bank',
        accountNumber: '1234567890',
        iban: 'SA0380000000608010167519',
        swift: 'RJHISARI'
      }
    }
  });

  const calculateItemTotal = (item: InvoiceItem): InvoiceItem => {
    const subtotal = item.quantity * item.unitPrice - item.discount;
    const taxAmount = subtotal * (item.tax.rate / 100);
    return {
      ...item,
      tax: { ...item.tax, amount: taxAmount },
      total: subtotal + taxAmount
    };
  };

  const handleItemChange = (index: number, field: string, value: number | string | { type: string; rate: number; amount: number }) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index] = calculateItemTotal(newItems[index]);
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        tax: { type: 'VAT', rate: 15, amount: 0 },
        total: 0
      }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orgForRequest = orgId;
      const response = await fetch('/api/finance/invoices', {
        method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orgId: orgForRequest,
              type: formData.type,
              issueDate: formData.issueDate,
              dueDate: formData.dueDate,
              currency: formData.currency,
              lines: formData.items.map((it: InvoiceItem) => ({
                description: it.description,
                qty: it.quantity,
                unitPrice: it.unitPrice,
                vatRate: it.tax?.rate ?? 15
              }))
            })
      });

      if (response.ok) {
        toast.success(t('fm.invoices.toast.createSuccess', 'Invoice created successfully'));
        onCreated();
      } else {
        const error = await response.json().catch(() => ({}));
        const message =
          (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string'
            ? error.error
            : t('fm.invoices.errors.unknown', 'Unknown error'));
        toast.error(
          t('fm.invoices.toast.createFailed', 'Failed to create invoice: {{message}}').replace('{{message}}', message)
        );
      }
    } catch {
      toast.error(t('fm.invoices.toast.createUnknown', 'Error creating invoice. Please try again.'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('fm.invoices.invoiceType', 'Invoice Type')}</label>
          <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SALES">{t('fm.invoices.sales', 'Sales')}</SelectItem>
              <SelectItem value="PURCHASE">{t('fm.invoices.purchase', 'Purchase')}</SelectItem>
              <SelectItem value="RENTAL">{t('fm.invoices.rental', 'Rental')}</SelectItem>
              <SelectItem value="SERVICE">{t('fm.invoices.service', 'Service')}</SelectItem>
              <SelectItem value="MAINTENANCE">{t('fm.invoices.maintenance', 'Maintenance')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('fm.invoices.currency', 'Currency')}</label>
          <Select value={formData.currency} onValueChange={(value) => setFormData({...formData, currency: value})}>
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
        <h3 className="font-medium mb-2">{t('fm.invoices.customerInfo', 'Customer Information')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('fm.invoices.customerName', 'Customer Name')} *</label>
            <Input
              value={formData.recipient.name}
              onChange={(e) => setFormData({...formData, recipient: {...formData.recipient, name: e.target.value}})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('fm.invoices.taxId', 'Tax ID')}</label>
            <Input
              value={formData.recipient.taxId}
              onChange={(e) => setFormData({...formData, recipient: {...formData.recipient, taxId: e.target.value}})}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('fm.invoices.issueDate', 'Issue Date')} *</label>
          <Input
            type="date"
            value={formData.issueDate}
            onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('fm.invoices.dueDate', 'Due Date')} *</label>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
            required
          />
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">{t('fm.invoices.lineItems', 'Line Items')}</h3>
        <div className="space-y-2">
          {formData.items.map((item, index) => (
            <div key={`item-${index}`} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <Input
                  placeholder={t('fm.invoices.description', 'Description')}
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder={t('fm.invoices.quantity', 'Qty')}
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder={t('fm.invoices.unitPrice', 'Price')}
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder={t('fm.invoices.vat', 'VAT %')}
                  value={item.tax.rate}
                  onChange={(e) => handleItemChange(index, 'tax', {...item.tax, rate: Number(e.target.value)})}
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
          {t('fm.invoices.addLineItem', 'Add Line Item')}
        </Button>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          {t('fm.invoices.createInvoice', 'Create Invoice')}
        </Button>
      </div>
    </form>
  );
}
