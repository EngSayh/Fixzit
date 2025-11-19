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

export default function BudgetsPage() {
  const auto = useAutoTranslator('fm.finance.budgets');
  const { data: session } = useSession();
  const { hasOrgContext, guard, supportOrg } = useFmOrgGuard({ moduleId: 'finance' });
  const [searchQuery, setSearchQuery] = useState('');

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
        <CreateBudgetDialog />
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
        <Button variant="secondary">{auto('Search', 'search.button')}</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder cards - replace with real data from API */}
        <BudgetCard
          name={auto('Operations Budget 2024', 'placeholder.operations.name')}
          department={auto('Operations', 'placeholder.operations.dept')}
          allocated={500000}
          spent={325000}
          currency="SAR"
        />
        <BudgetCard
          name={auto('Maintenance Budget 2024', 'placeholder.maintenance.name')}
          department={auto('Facilities Management', 'placeholder.maintenance.dept')}
          allocated={750000}
          spent={480000}
          currency="SAR"
        />
        <BudgetCard
          name={auto('Marketing Budget 2024', 'placeholder.marketing.name')}
          department={auto('Marketing', 'placeholder.marketing.dept')}
          allocated={200000}
          spent={95000}
          currency="SAR"
        />
      </div>

      <div className="mt-8 p-6 border border-dashed border-border rounded-lg text-center">
        <p className="text-sm text-muted-foreground">
          {auto('Budget data will be fetched from /api/finance/budgets', 'info.apiEndpoint')}
        </p>
      </div>
    </div>
  );
}

function BudgetCard({
  name,
  department,
  allocated,
  spent,
  currency,
}: {
  name: string;
  department: string;
  allocated: number;
  spent: number;
  currency: string;
}) {
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

function CreateBudgetDialog() {
  const auto = useAutoTranslator('fm.finance.budgets.create');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = async () => {
    const toastId = toast.loading(auto('Creating budget...', 'toast.loading'));
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(auto('Budget created successfully', 'toast.success'), { id: toastId });
      setOpen(false);
      setName('');
      setDepartment('');
      setAmount('');
    } catch (_error) {
      toast.error(auto('Failed to create budget', 'toast.error'), { id: toastId });
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
          <Button onClick={handleSubmit} disabled={!name || !department || !amount} className="w-full">
            {auto('Create Budget', 'submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
