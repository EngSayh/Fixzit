'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CardGridSkeleton } from '@/components/skeletons';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { useEffect } from 'react';

export default function BudgetsPage() {
  const auto = useAutoTranslator('fm.finance.budgets');
  const { data: session } = useSession();
  const { hasOrgContext, guard, supportOrg, orgId } = useFmOrgGuard({ moduleId: 'finance' });
  const [searchQuery, setSearchQuery] = useState('');
  const [budgets, setBudgets] = useState<BudgetCardProps[]>([]);
  const [loading, setLoading] = useState(false);
  const resolvedOrgId = orgId || (supportOrg as any)?.orgId || (session?.user as any)?.orgId;

  useEffect(() => {
    const fetchBudgets = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/fm/finance/budgets');
        if (!res.ok) throw new Error('Failed to load budgets');
        const json = await res.json();
        const data = (json?.data || []) as BudgetCardProps[];
        setBudgets(data);
      } catch {
        // surface toast on real error if desired
      } finally {
        setLoading(false);
      }
    };
    fetchBudgets();
  }, []);

  if (!session) {
    return <CardGridSkeleton count={4} />;
  }

  if (!hasOrgContext) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="finance" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto('Budget Management', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto('Create and track departmental budgets and spending limits', 'header.subtitle')}
          </p>
        </div>
        <CreateBudgetDialog
          onCreated={(budget) => setBudgets((prev) => [budget, ...prev])}
          orgId={resolvedOrgId}
        />
      </div>

      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {auto('Support context: {{name}}', 'support.activeOrg', { name: supportOrg.name })}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder={auto('Search budgets by name or department...', 'search.placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button variant="secondary" onClick={() => {/* no-op search button */}}>
          {auto('Search', 'search.button')}
        </Button>
      </div>

      {loading ? (
        <CardGridSkeleton count={3} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets
            .filter((b) =>
              searchQuery
                ? `${b.name} ${b.department}`.toLowerCase().includes(searchQuery.toLowerCase())
                : true
            )
            .map((budget) => (
              <BudgetCard key={budget.id} {...budget} spent={0} />
            ))}
          {budgets.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="py-10 text-center text-muted-foreground">
                {auto('No budgets found', 'empty')}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="mt-8 p-6 border border-dashed border-border rounded-lg text-center">
        <p className="text-sm text-muted-foreground">
          {auto('Budget data is fetched from /api/fm/finance/budgets', 'info.apiEndpoint')}
        </p>
      </div>
    </div>
  );
}

type BudgetCardProps = {
  id?: string;
  name: string;
  department: string;
  allocated: number;
  spent?: number;
  currency: string;
};

function BudgetCard({ name, department, allocated, spent = 0, currency }: BudgetCardProps) {
  const auto = useAutoTranslator('fm.finance.budgets.card');
  const percentUsed = (spent / allocated) * 100;
  const remaining = allocated - spent;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{name}</CardTitle>
        <p className="text-sm text-muted-foreground">{department}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{auto('Allocated', 'allocated')}</span>
            <span className="font-semibold">
              {allocated.toLocaleString()} {currency}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{auto('Spent', 'spent')}</span>
            <span className={spent > allocated ? 'text-destructive font-semibold' : 'font-semibold'}>
              {spent.toLocaleString()} {currency}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{auto('Remaining', 'remaining')}</span>
            <span className={remaining < 0 ? 'text-destructive font-semibold' : 'text-green-600 font-semibold'}>
              {remaining.toLocaleString()} {currency}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{auto('Usage', 'usage')}</span>
            <span>{percentUsed.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                percentUsed > 100 ? 'bg-destructive' : percentUsed > 80 ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
        </div>

        <Button variant="outline" size="sm" className="w-full">
          {auto('View Details', 'viewDetails')}
        </Button>
      </CardContent>
    </Card>
  );
}

function CreateBudgetDialog({ onCreated, orgId }: { onCreated: (budget: BudgetCardProps) => void; orgId?: string }) {
  const auto = useAutoTranslator('fm.finance.budgets.create');
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [amount, setAmount] = useState('');
  const [currency] = useState('SAR');

  const resetForm = () => {
    setName('');
    setDepartment('');
    setAmount('');
  };

  const handleSubmit = async () => {
    const toastId = toast.loading(auto('Creating budget...', 'toast.loading'));
    setSubmitting(true);
    try {
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error(auto('Allocated amount must be greater than 0', 'toast.amountInvalid'));
      }

      const payloadOrgId = orgId;
      const res = await fetch('/api/fm/finance/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: payloadOrgId,
          name,
          department,
          allocated: parsedAmount,
          currency,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.error || 'Failed to create budget');
      }

      onCreated(payload.data as BudgetCardProps);
      toast.success(auto('Budget created successfully', 'toast.success'), { id: toastId });
      resetForm();
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : auto('Failed to create budget', 'toast.error');
      toast.error(message, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{auto('Create Budget', 'trigger')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{auto('Create New Budget', 'title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">{auto('Budget Name', 'fields.name')}</label>
            <Input
              placeholder={auto('e.g. Q1 2024 Operations', 'fields.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">{auto('Department', 'fields.department')}</label>
            <Input
              placeholder={auto('e.g. Facilities Management', 'fields.departmentPlaceholder')}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">{auto('Allocated Amount (SAR)', 'fields.amount')}</label>
            <Input
              type="number"
              placeholder="500000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !name ||
              !department ||
              !amount ||
              !Number.isFinite(Number(amount)) ||
              Number(amount) <= 0
            }
            className="w-full"
          >
            {auto('Create Budget', 'submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
