"use client";
import useSWR from "swr";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CardGridSkeleton } from '@/components/skeletons';
import { useTranslation } from '@/contexts/TranslationContext';

export default function FinancePage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;
  const [q, setQ] = useState("");

  const fetcher = (url: string) => {
    if (!orgId) {
      return Promise.reject(new Error('No organization ID'));
    }
    return fetch(url, { 
      headers: { 'x-tenant-id': orgId }
    }).then(r => r.json());
  };

  const { data, mutate, isLoading } = useSWR(
    orgId ? `/api/finance/invoices?q=${encodeURIComponent(q)}` : null,
    fetcher
  );

  if (!session) {
    return <CardGridSkeleton count={6} />;
  }

  if (!orgId) {
    return <p>Error: No organization ID found in session</p>;
  }

  const list = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('finance.title', 'Finance — Invoices')}</h1>
        <CreateInvoice orgId={orgId} onCreated={()=>mutate()} />
      </div>
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
                  {t('finance.issue', 'Issue')}: {new Date(inv.issueDate).toLocaleDateString()} • {t('finance.due', 'Due')}: {new Date(inv.dueDate).toLocaleDateString()}
                </div>
                <Separator />
                <div className="text-sm">{t('finance.total', 'Total')}: {inv.total} {inv.currency} ({t('finance.vat', 'VAT')} {inv.vatAmount})</div>
                <div className="flex gap-2 pt-2">
                  <Action id={inv.id} action="POST" disabled={inv.status!=="DRAFT"} onDone={()=>mutate()} orgId={orgId} />
                  <Action id={inv.id} action="VOID" disabled={inv.status==="VOID"} onDone={()=>mutate()} orgId={orgId} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Action({ id, action, disabled, onDone, orgId }:{ id:string; action:"POST"|"VOID"; disabled?:boolean; onDone:()=>void; orgId:string }) {
  async function go() {
    if (!orgId) {
      toast.error('No organization ID found');
      return;
    }

    const toastId = toast.loading(`${action === 'POST' ? 'Posting' : 'Voiding'} invoice...`);

    try {
      const response = await fetch(`/api/finance/invoices/${id}`, {
        method:"PATCH",
        headers:{ 
          "Content-Type":"application/json", 
          "x-tenant-id": orgId
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(`Failed to ${action} invoice: ${error.error || 'Unknown error'}`, { id: toastId });
      } else {
        toast.success(`Invoice ${action === 'POST' ? 'posted' : 'voided'} successfully`, { id: toastId });
        onDone();
      }
    } catch (error) {
      console.error(`Error ${action} invoice:`, error);
      toast.error(`Error: Failed to ${action} invoice`, { id: toastId });
    }
  }
  return <Button variant="secondary" disabled={disabled} onClick={go}>{action}</Button>;
}

function CreateInvoice({ onCreated, orgId }:{ onCreated:()=>void; orgId:string }) {
  const { t } = useTranslation();
  const [open,setOpen]=useState(false);
  const [issue, setIssue] = useState(new Date().toISOString().slice(0,10));
  const [due, setDue] = useState(new Date(Date.now()+7*864e5).toISOString().slice(0,10));
  const [lines, setLines] = useState([{ description:"Maintenance Service", qty:1, unitPrice:100, vatRate:15 }]);

  function updateLine(i:number, key:string, val: string | number) {
    setLines(prev => prev.map((l,idx)=> idx===i ? { ...l, [key]: key==="description"?val:Number(val) } : l));
  }

  async function submit() {
    if (!orgId) {
      toast.error('No organization ID found');
      return;
    }

    const toastId = toast.loading('Creating invoice...');

    try {
      const response = await fetch("/api/finance/invoices", {
        method:"POST",
        headers: { 
          "Content-Type":"application/json", 
          "x-tenant-id": orgId
        },
        body: JSON.stringify({
          issueDate: issue, dueDate: due, currency:"SAR",
          lines
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
      console.error('Error creating invoice:', error);
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
              <Button variant="secondary" onClick={()=>setLines(prev=>[...prev,{ description:"", qty:1, unitPrice:0, vatRate:15 }])}>{t('finance.addLine', 'Add Line')}</Button>
            </div>
            {lines.map((l, i)=>(
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Input placeholder={t('finance.description', 'Description')} value={l.description} onChange={e=>updateLine(i,"description",e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Input type="number" placeholder={t('finance.qty', 'Qty')} value={l.qty} onChange={e=>updateLine(i,"qty",e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Input type="number" placeholder={t('finance.unitPrice', 'Unit Price')} value={l.unitPrice} onChange={e=>updateLine(i,"unitPrice",e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Input type="number" placeholder={t('finance.vatPercent', 'VAT %')} value={l.vatRate} onChange={e=>updateLine(i,"vatRate",e.target.value)} />
                </div>
                <div className="col-span-1 text-right text-sm">
                  {(l.qty*l.unitPrice*(1+l.vatRate/100)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <Button onClick={submit} disabled={!lines.length || lines.some(l=>!l.description)}>{t('common.create', 'Create')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
