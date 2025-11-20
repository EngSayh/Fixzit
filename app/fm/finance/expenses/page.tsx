'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CardGridSkeleton } from '@/components/skeletons';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import ClientDate from '@/components/ClientDate';

type ExpenseCardProps = {
  id?: string;
  vendor: string;
  category: string;
  amount: number;
  currency: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
};

export default function ExpensesPage() {
  const auto = useAutoTranslator('fm.finance.expenses');
  const { data: session } = useSession();
  const { hasOrgContext, guard, supportOrg } = useFmOrgGuard({ moduleId: 'finance' });
  const [searchQuery, setSearchQuery] = useState('');
  const [expenses, setExpenses] = useState<ExpenseCardProps[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/fm/finance/expenses');
        if (!res.ok) throw new Error('Failed to load expenses');
        const payload = await res.json();
        setExpenses((payload?.data || []) as ExpenseCardProps[]);
      } catch {
        toast.error(auto('Failed to load expenses', 'toast.loadError'));
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, [auto]);

  if (!session) {
    return <CardGridSkeleton count={4} />;
  }

  if (!hasOrgContext) {
    return guard;
  }

  const filteredExpenses = expenses.filter((expense) =>
    searchQuery
      ? `${expense.vendor} ${expense.category} ${expense.description || ''}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="finance" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto('Expense Tracking', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto('Track and approve operational expenses', 'header.subtitle')}
          </p>
        </div>
        <CreateExpenseDialog
          onCreated={(expense) => setExpenses((prev) => [expense, ...prev])}
        />
      </div>

      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {auto('Support context: {{name}}', 'support.activeOrg', { name: supportOrg.name })}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder={auto('Search expenses by vendor or category...', 'search.placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button variant="secondary">
          {auto('Search', 'search.button')}
        </Button>
      </div>

      <div className="grid gap-4">
        {expenses.length === 0 && !loading && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {auto('No expenses yet. Submit one to get started.', 'empty')}
            </CardContent>
          </Card>
        )}
        {loading ? (
          <CardGridSkeleton count={3} />
        ) : (
          filteredExpenses.map((expense) => (
            <ExpenseCard key={expense.id} {...expense} />
          ))
        )}
      </div>

      <div className="mt-8 p-6 border border-dashed border-border rounded-lg text-center">
        <p className="text-sm text-muted-foreground">
          {auto('Expense data is fetched from /api/fm/finance/expenses', 'info.apiEndpoint')}
        </p>
      </div>
    </div>
  );
}

function ExpenseCard({
  vendor,
  category,
  amount,
  currency,
  status,
  description,
  createdAt,
}: ExpenseCardProps) {
  const auto = useAutoTranslator('fm.finance.expenses.card');
  
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="font-semibold text-lg">{vendor}</div>
            <div className="text-sm text-muted-foreground">{category}</div>
            <div className="text-xs text-muted-foreground">
              <ClientDate date={createdAt || new Date().toISOString()} format="date-only" />
            </div>
            {description && <div className="text-sm text-muted-foreground">{description}</div>}
          </div>
          <div className="text-end space-y-2">
            <div className="text-xl font-bold">
              {amount.toLocaleString()} {currency}
            </div>
            <span className={`text-xs rounded-full px-2 py-1 border ${statusColors[status]}`}>
              {auto(status, `status.${status}`)}
            </span>
          </div>
        </div>
        {status === 'pending' && (
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="default">
              {auto('Approve', 'actions.approve')}
            </Button>
            <Button size="sm" variant="destructive">
              {auto('Reject', 'actions.reject')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateExpenseDialog({ onCreated }: { onCreated: (expense: ExpenseCardProps) => void }) {
  const auto = useAutoTranslator('fm.finance.expenses.create');
  const [open, setOpen] = useState(false);
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const toastId = toast.loading(auto('Submitting expense...', 'toast.loading'));
    try {
      setSubmitting(true);
      const payload = {
        vendor,
        category,
        amount: Number(amount),
        currency: 'SAR',
        description,
      };

      if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
        throw new Error(auto('Amount must be greater than 0', 'toast.amountInvalid'));
      }

      const res = await fetch('/api/fm/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success || !body?.data) {
        throw new Error(body?.error || 'Failed to submit expense');
      }

      onCreated(body.data as ExpenseCardProps);
      toast.success(auto('Expense submitted for approval', 'toast.success'), { id: toastId });
      setVendor('');
      setCategory('');
      setAmount('');
      setDescription('');
      setOpen(false);
    } catch (_error) {
      const message =
        _error instanceof Error ? _error.message : auto('Failed to submit expense', 'toast.error');
      toast.error(message, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{auto('Submit Expense', 'trigger')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{auto('Submit New Expense', 'title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">{auto('Vendor', 'fields.vendor')}</label>
            <Input
              placeholder={auto('e.g. ABC Supplies Co.', 'fields.vendorPlaceholder')}
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">{auto('Category', 'fields.category')}</label>
            <Input
              placeholder={auto('e.g. Office Supplies', 'fields.categoryPlaceholder')}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">{auto('Amount (SAR)', 'fields.amount')}</label>
            <Input
              type="number"
              placeholder="2500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">{auto('Description', 'fields.description')}</label>
            <Input
              placeholder={auto('Brief description of expense', 'fields.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !vendor ||
              !category ||
              !amount ||
              !Number.isFinite(Number(amount)) ||
              Number(amount) <= 0
            }
            className="w-full"
          >
            {auto('Submit Expense', 'submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
