"use client";
import useSWR from "swr";
import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CardGridSkeleton } from '@/components/skeletons';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSupportOrg } from '@/contexts/SupportOrgContext';
import Decimal from 'decimal.js';

import { logger } from '@/lib/logger';
import ClientDate from '@/components/ClientDate';
import IncomeStatementWidget from '@/components/finance/IncomeStatementWidget';
import BalanceSheetWidget from '@/components/finance/BalanceSheetWidget';
import OwnerStatementWidget from '@/components/finance/OwnerStatementWidget';

export default function FinancePage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { effectiveOrgId, canImpersonate, supportOrg } = useSupportOrg();
  const orgId = effectiveOrgId ?? undefined;
  const needsOrgSelection = !orgId && canImpersonate;
  const [q, setQ] = useState("");

  // ✅ HYDRATION FIX: Set default dates after client hydration
  const [issue, setIssue] = useState('');
  const [due, setDue] = useState('');
  
  useEffect(() => {
    if (!issue) {
      setIssue(new Date().toISOString().slice(0, 10));
    }
    if (!due) {
      setDue(new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
    }
  }, [issue, due]);

  const fetcher = (url: string) => {
    if (!orgId) {
      return Promise.reject(new Error('No organization ID'));
    }
    // SECURITY FIX: orgId is validated server-side from session/JWT
    // Removed x-tenant-id header to prevent IDOR vulnerability
    return fetch(url)
      .then(r => r.json())
      .catch(error => {
        logger.error('Finance invoice fetch error', { error });
        throw error;
      });
  };

  const { data, mutate, isLoading } = useSWR(
    orgId ? `/api/finance/invoices?q=${encodeURIComponent(q)}` : null,
    fetcher
  );

  if (!session) {
    return <CardGridSkeleton count={6} />;
  }

  if (!orgId) {
    return (
      <div className="rounded-xl border border-border bg-card/30 p-6 space-y-3">
        <p className="text-destructive font-semibold">
          {needsOrgSelection
            ? t(
                'finance.support.selectOrg',
                'Select a customer organization to enable finance data.'
              )
            : t('finance.errors.noOrgSession', 'Error: No organization ID found in session')}
        </p>
        {needsOrgSelection && (
          <p className="text-sm text-muted-foreground">
            {t(
              'finance.support.selectOrgHint',
              'Use the Support Organization switcher in the top bar to search by corporate ID.'
            )}
          </p>
        )}
      </div>
    );
  }

  const list = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('finance.title', 'Finance — Invoices')}</h1>
        <CreateInvoice orgId={orgId} onCreated={()=>mutate()} />
      </div>
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {`${t('finance.support.activeOrg', 'Support context')}: ${supportOrg.name}`}
        </div>
      )}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder={t('finance.searchPlaceholder', 'Search by number/customer')}
          aria-label={t('finance.searchPlaceholder', 'Search by number/customer')}
          value={q}
          onChange={e=>setQ(e.target.value)}
        />
        <Button onClick={()=>mutate()}>{t('common.search', 'Search')}</Button>
      </div>

      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((inv: { id: string; number: string; status: string; issueDate: string; dueDate: string; total: number; currency: string; vatAmount: number }) =>(
            <Card key={inv.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{inv.number}</div>
                  <span className="text-xs rounded-full px-2 py-1 border">{inv.status}</span>
                </div>
                <div className="text-sm text-slate-600">
                  {t('finance.issue', 'Issue')}: <ClientDate date={inv.issueDate} format="date-only" /> • {t('finance.due', 'Due')}: <ClientDate date={inv.dueDate} format="date-only" />
                </div>
                <Separator />
                <div className="text-sm">{t('finance.total', 'Total')}: {inv.total} {inv.currency} ({t('finance.vat', 'VAT')} {inv.vatAmount})</div>
                <div className="flex gap-2 pt-2">
                  <Action
                    id={inv.id}
                    action="POST"
                    disabled={inv.status !== "DRAFT"}
                    onDone={() => mutate()}
                    orgId={orgId}
                    t={t}
                  />
                  <Action
                    id={inv.id}
                    action="VOID"
                    disabled={inv.status === "VOID"}
                    onDone={() => mutate()}
                    orgId={orgId}
                    t={t}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t('finance.reports.title', 'Financial Reports')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('finance.reports.subtitle', 'Trial balance, P&L, and owner statements at a glance')}
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <IncomeStatementWidget />
          <BalanceSheetWidget />
          <OwnerStatementWidget />
        </div>
      </section>
    </div>
  );
}

type FinanceAction = 'POST' | 'VOID';

const ACTION_COPY: Record<FinanceAction, { loadingKey: string; loadingFallback: string; successKey: string; successFallback: string; failureKey: string; failureFallback: string }> = {
  POST: {
    loadingKey: 'finance.invoice.toast.posting',
    loadingFallback: 'Posting invoice...',
    successKey: 'finance.invoice.toast.postSuccess',
    successFallback: 'Invoice posted successfully',
    failureKey: 'finance.invoice.toast.postFailure',
    failureFallback: 'Failed to post invoice: {{message}}',
  },
  VOID: {
    loadingKey: 'finance.invoice.toast.voiding',
    loadingFallback: 'Voiding invoice...',
    successKey: 'finance.invoice.toast.voidSuccess',
    successFallback: 'Invoice voided successfully',
    failureKey: 'finance.invoice.toast.voidFailure',
    failureFallback: 'Failed to void invoice: {{message}}',
  },
};

function Action({
  id,
  action,
  disabled,
  onDone,
  orgId,
  t,
}: {
  id: string;
  action: FinanceAction;
  disabled?: boolean;
  onDone: () => void;
  orgId: string;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  async function go() {
    if (!orgId) {
      toast.error(t('finance.errors.noOrgId', 'No organization ID found'));
      return;
    }

    const copy = ACTION_COPY[action];
    const toastId = toast.loading(t(copy.loadingKey, copy.loadingFallback));

    try {
      const response = await fetch(`/api/finance/invoices/${id}`, {
        method:"PATCH",
        headers:{ 
          "Content-Type":"application/json",
          // SECURITY FIX: orgId validated server-side from session - removed x-tenant-id header
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const message = error?.error || t('finance.invoice.toast.unknownError', 'Unknown error');
        toast.error(
          t(copy.failureKey, copy.failureFallback).replace('{{message}}', message),
          { id: toastId }
        );
        return;
      }

      toast.success(t(copy.successKey, copy.successFallback), { id: toastId });
      onDone();
    } catch (error) {
      logger.error(`Error ${action} invoice:`, error);
      toast.error(
        t(copy.failureKey, copy.failureFallback).replace(
          '{{message}}',
          error instanceof Error ? error.message : t('finance.invoice.toast.unknownError', 'Unknown error')
        ),
        { id: toastId }
      );
    }
  }
  return (
    <Button variant="secondary" disabled={disabled} onClick={go}>
      {action === 'POST'
        ? t('finance.invoice.actions.post', 'Post invoice')
        : t('finance.invoice.actions.void', 'Void invoice')}
    </Button>
  );
}

interface InvoiceLine {
  id: string;
  description: string;
  qty: string;
  unitPrice: string;
  vatRate: string;
}

function InvoiceLineItem({ line, onUpdate, t }: { 
  line: InvoiceLine; 
  onUpdate: (id: string, key: string, val: string) => void; // eslint-disable-line no-unused-vars
  t: (key: string, fallback: string) => string; // eslint-disable-line no-unused-vars
}) {
  const lineTotal = useMemo(() => {
    const qty = new Decimal(line.qty || '0');
    const unitPrice = new Decimal(line.unitPrice || '0');
    const vatRate = new Decimal(line.vatRate || '0');
    const subtotal = qty.times(unitPrice);
    const total = subtotal.times(vatRate.dividedBy(100).plus(1));
    return total.toFixed(2);
  }, [line.qty, line.unitPrice, line.vatRate]);

  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <div className="col-span-5">
        <Input 
          placeholder={t('finance.description', 'Description')} 
          value={line.description} 
          onChange={e => onUpdate(line.id, "description", e.target.value)} 
        />
      </div>
      <div className="col-span-2">
        <Input 
          type="number" 
          placeholder={t('finance.qty', 'Qty')} 
          value={line.qty} 
          onChange={e => onUpdate(line.id, "qty", e.target.value)} 
        />
      </div>
      <div className="col-span-2">
        <Input 
          type="number" 
          placeholder={t('finance.unitPrice', 'Unit Price')} 
          value={line.unitPrice} 
          onChange={e => onUpdate(line.id, "unitPrice", e.target.value)} 
        />
      </div>
      <div className="col-span-2">
        <Input 
          type="number" 
          placeholder={t('finance.vatPercent', 'VAT %')} 
          value={line.vatRate} 
          onChange={e => onUpdate(line.id, "vatRate", e.target.value)} 
        />
      </div>
      <div className="col-span-1 text-end text-sm">
        {lineTotal}
      </div>
    </div>
  );
}

function CreateInvoice({ onCreated, orgId }:{ onCreated:()=>void; orgId:string }) {
  const { t } = useTranslation();
  const [open,setOpen]=useState(false);
  const [issue, setIssue] = useState(''); // ✅ HYDRATION FIX: Initialize empty
  const [due, setDue] = useState(''); // ✅ HYDRATION FIX: Initialize empty
  const [lines, setLines] = useState<InvoiceLine[]>([{ id: crypto.randomUUID(), description:"Maintenance Service", qty:"1", unitPrice:"100", vatRate:"15" }]);

  // ✅ HYDRATION FIX: Set default dates after client hydration
  useEffect(() => {
    if (!issue) {
      setIssue(new Date().toISOString().slice(0, 10));
    }
    if (!due) {
      setDue(new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
    }
  }, [issue, due]);

  function updateLine(id:string, key:string, val: string) {
    setLines(prev => prev.map((l)=> l.id===id ? { ...l, [key]: val } : l));
  }

  async function submit() {
    if (!orgId) {
      toast.error('No organization ID found');
      return;
    }

    const toastId = toast.loading('Creating invoice...');

    try {
      // Convert string values to numbers for API, using Decimal for precision
      const apiLines = lines.map((l: { description: string; qty: string | number; unitPrice: string | number; vatRate: string | number }) => ({
        description: l.description,
        qty: new Decimal(l.qty || '0').toDecimalPlaces(0).toNumber(),
        unitPrice: new Decimal(l.unitPrice || '0').toDecimalPlaces(2).toNumber(),
        vatRate: new Decimal(l.vatRate || '0').toDecimalPlaces(2).toNumber()
      }));

      const response = await fetch("/api/finance/invoices", {
        method:"POST",
        headers: { 
          "Content-Type":"application/json",
          // SECURITY FIX: orgId validated server-side from session - removed x-tenant-id header
        },
        body: JSON.stringify({
          issueDate: issue, dueDate: due, currency:"SAR",
          lines: apiLines
        })
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(`Failed to create invoice: ${error.error || 'Unknown error'}`, { id: toastId });
        return;
      }

      toast.success('Invoice created successfully', { id: toastId });
      setOpen(false); 
      onCreated();
    } catch (error) {
      logger.error('Error creating invoice:', error);
      toast.error('Error: Failed to create invoice', { id: toastId });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>{t('finance.newInvoice', 'New Invoice')}</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{t('finance.createInvoice', 'Create Invoice')}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="issueDate" className="text-xs">{t('finance.issueDate', 'Issue Date')}</label>
              <Input
                id="issueDate"
                type="date"
                value={issue}
                onChange={e => setIssue(e.target.value)}
              />
            </div>
            <div>
                            <label htmlFor="dueDate" className="text-xs">{t('finance.dueDate', 'Due Date')}</label>
              <Input
                id="dueDate"
                type="date"
                value={due}
                onChange={e => setDue(e.target.value)}
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="font-medium">{t('finance.lines', 'Lines')}</div>
              <Button variant="secondary" onClick={()=>setLines(prev=>[...prev,{ id: crypto.randomUUID(), description:"", qty:"1", unitPrice:"0", vatRate:"15" }])}>{t('finance.addLine', 'Add Line')}</Button>
            </div>
            {lines.map((l)=>(
              <InvoiceLineItem 
                key={l.id} 
                line={l} 
                onUpdate={updateLine} 
                t={t} 
              />
            ))}
          </div>
          <Separator />
          <Button onClick={submit} disabled={!lines.length || lines.some(l=>!l.description)}>{t('common.create', 'Create')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
