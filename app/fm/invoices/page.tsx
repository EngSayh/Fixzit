'use client';

import { useState } from &apos;react&apos;;
import useSWR from 'swr&apos;;
import { Button } from &apos;@/src/components/ui/button&apos;;
import { Input } from &apos;@/src/components/ui/input&apos;;
import { Card, CardContent, CardHeader, CardTitle } from &apos;@/src/components/ui/card&apos;;
import { Badge } from &apos;@/src/components/ui/badge&apos;;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from &apos;@/src/components/ui/dialog&apos;;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from &apos;@/src/components/ui/select&apos;;
import { Textarea } from &apos;@/src/components/ui/textarea&apos;;
import { Separator } from &apos;@/src/components/ui/separator&apos;;
import { 
  FileText, Plus, Search, Filter, Calendar, DollarSign, 
  QrCode, Send, Eye, Download, Mail, CheckCircle,
  AlertCircle, Clock, CreditCard, Printer
} from &apos;lucide-react&apos;;

const fetcher = (url: string) => fetch(url, { headers: { "x-tenant-id": "demo-tenant" } }).then(r => r.json());

export default function InvoicesPage() {
  const [search, setSearch] = useState(&apos;');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState(&apos;');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, mutate } = useSWR(
    `/api/invoices?search=${encodeURIComponent(search)}&status=${statusFilter}&type=${typeFilter}`,
    fetcher
  );

  const invoices = data?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-gray-600">ZATCA compliant e-invoicing with QR codes</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
            </DialogHeader>
            <CreateInvoiceForm onCreated={() => { mutate(); setCreateOpen(false); }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Outstanding</p>
                <p className="text-2xl font-bold">
                  {invoices
                    .filter((inv: any) => inv.status !== 'PAID&apos; && inv.status !== &apos;CANCELLED&apos;)
                    .reduce((sum: number, inv: any) => sum + inv.total, 0)
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
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {invoices.filter((inv: any) => inv.status === 'OVERDUE&apos;).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {invoices.filter((inv: any) => inv.status === 'SENT&apos; || inv.status === &apos;VIEWED&apos;).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid This Month</p>
                <p className="text-2xl font-bold text-green-600">
                  {invoices.filter((inv: any) => 
                    inv.status === 'PAID&apos; && 
                    new Date(inv.payments?.[0]?.date).getMonth() === new Date().getMonth()
                  ).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by invoice number or customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="VIEWED">Viewed</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="SALES">Sales</SelectItem>
                <SelectItem value="PURCHASE">Purchase</SelectItem>
                <SelectItem value="RENTAL">Rental</SelectItem>
                <SelectItem value="SERVICE">Service</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {invoices.map((invoice: any) => (
          <InvoiceCard key={invoice._id} invoice={invoice} onUpdated={mutate} />
        ))}
      </div>

      {/* Empty State */}
      {invoices.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Invoices Found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first invoice.</p>
            <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InvoiceCard({ invoice, onUpdated }: { invoice: any; onUpdated: () => void }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT&apos;:
        return &apos;bg-gray-100 text-gray-800&apos;;
      case &apos;SENT&apos;:
        return &apos;bg-blue-100 text-blue-800&apos;;
      case &apos;VIEWED&apos;:
        return &apos;bg-purple-100 text-purple-800&apos;;
      case &apos;APPROVED&apos;:
        return &apos;bg-green-100 text-green-800&apos;;
      case &apos;PAID&apos;:
        return &apos;bg-emerald-100 text-emerald-800&apos;;
      case &apos;OVERDUE&apos;:
        return &apos;bg-red-100 text-red-800&apos;;
      case &apos;CANCELLED&apos;:
        return &apos;bg-gray-100 text-gray-800&apos;;
      default:
        return &apos;bg-gray-100 text-gray-800&apos;;
    }
  };

  const getZATCAStatus = (status: string) => {
    switch (status) {
      case &apos;CLEARED&apos;:
        return { icon: CheckCircle, color: &apos;text-green-600&apos; };
      case &apos;PENDING&apos;:
        return { icon: Clock, color: &apos;text-yellow-600&apos; };
      default:
        return { icon: AlertCircle, color: &apos;text-gray-600&apos; };
    }
  };

  const zatcaStatus = getZATCAStatus(invoice.zatca?.status || &apos;PENDING&apos;);
  const ZatcaIcon = zatcaStatus.icon;

  const daysOverdue = invoice.status === &apos;OVERDUE&apos; 
    ? Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{invoice.number}</CardTitle>
            <p className="text-sm text-gray-600">{invoice.recipient?.name}</p>
          </div>
          <Badge className={getStatusColor(invoice.status)}>
            {invoice.status.toLowerCase()}
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
              <QrCode className="w-5 h-5 text-gray-600" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-600">Issue Date</p>
            <p className="font-medium">
              {new Date(invoice.issueDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Due Date</p>
            <p className={`font-medium ${daysOverdue > 0 ? &apos;text-red-600&apos; : &apos;'}`}>
              {new Date(invoice.dueDate).toLocaleDateString()}
              {daysOverdue > 0 && ` (${daysOverdue}d overdue)`}
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm">
            <Badge variant="outline" className="text-xs">
              {invoice.type}
            </Badge>
            {invoice.items?.length && (
              <span className="text-gray-600">
                {invoice.items.length} items
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
            {invoice.status === 'DRAFT&apos; && (
              <Button variant="ghost" size="sm">
                <Send className="w-4 h-4" />
              </Button>
            )}
            {(invoice.status === 'SENT&apos; || invoice.status === &apos;VIEWED&apos;) && (
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

function CreateInvoiceForm({ onCreated }: { onCreated: () => void }) {
  const [formData, setFormData] = useState({
    type: &apos;SALES&apos;,
    issuer: {
      name: &apos;Fixzit Enterprise Co.&apos;,
      taxId: &apos;300000000000003&apos;,
      address: &apos;King Fahd Road, Riyadh 11564, Saudi Arabia&apos;,
      phone: &apos;+966 11 123 4567&apos;,
      email: &apos;invoices@fixzit.co&apos;,
      registration: &apos;CR-1234567890&apos;,
      license: &apos;L-1234567890&apos;
    },
    recipient: {
      name: &apos;',
      taxId: '',
      address: &apos;',
      phone: '',
      email: &apos;',
      customerId: ''
    },
    issueDate: new Date().toISOString().split(&apos;T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: &apos;',
    items: [{
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: {
        type: &apos;VAT&apos;,
        rate: 15,
        amount: 0
      },
      total: 0
    }],
    currency: &apos;SAR&apos;,
    payment: {
      method: &apos;BANK_TRANSFER&apos;,
      terms: &apos;Net 30&apos;,
      instructions: &apos;Please transfer to the following account:&apos;,
      account: {
        bank: &apos;Al Rajhi Bank&apos;,
        accountNumber: &apos;1234567890&apos;,
        iban: &apos;SA0380000000608010167519&apos;,
        swift: &apos;RJHISARI&apos;
      }
    }
  });

  const calculateItemTotal = (item: any) => {
    const subtotal = item.quantity * item.unitPrice - item.discount;
    const taxAmount = subtotal * (item.tax.rate / 100);
    return {
      ...item,
      tax: { ...item.tax, amount: taxAmount },
      total: subtotal + taxAmount
    };
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index] = calculateItemTotal(newItems[index]);
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        description: &apos;',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        tax: { type: &apos;VAT&apos;, rate: 15, amount: 0 },
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
      const response = await fetch(&apos;/api/invoices&apos;, {
        method: &apos;POST&apos;,
        headers: { &apos;Content-Type&apos;: &apos;application/json&apos;, &apos;x-tenant-id&apos;: &apos;demo-tenant&apos; },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onCreated();
      } else {
        alert(&apos;Failed to create invoice&apos;);
      }
    } catch (error) {
      alert(&apos;Error creating invoice&apos;);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Invoice Type</label>
          <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SALES">Sales</SelectItem>
              <SelectItem value="PURCHASE">Purchase</SelectItem>
              <SelectItem value="RENTAL">Rental</SelectItem>
              <SelectItem value="SERVICE">Service</SelectItem>
              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Currency</label>
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
        <h3 className="font-medium mb-2">Customer Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer Name *</label>
            <Input
              value={formData.recipient.name}
              onChange={(e) => setFormData({...formData, recipient: {...formData.recipient, name: e.target.value}})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tax ID</label>
            <Input
              value={formData.recipient.taxId}
              onChange={(e) => setFormData({...formData, recipient: {...formData.recipient, taxId: e.target.value}})}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Issue Date *</label>
          <Input
            type="date"
            value={formData.issueDate}
            onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Due Date *</label>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
            required
          />
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">Line Items</h3>
        <div className="space-y-2">
          {formData.items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description&apos;, e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity&apos;, Number(e.target.value))}
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Price"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice&apos;, Number(e.target.value))}
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="VAT %"
                  value={item.tax.rate}
                  onChange={(e) => handleItemChange(index, 'tax&apos;, {...item.tax, rate: Number(e.target.value)})}
                />
              </div>
              <div className="col-span-1 text-right font-medium">
                {item.total.toFixed(2)}
              </div>
              <div className="col-span-1">
                {formData.items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="text-red-600"
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
          Add Line Item
        </Button>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          Create Invoice
        </Button>
      </div>
    </form>
  );
}