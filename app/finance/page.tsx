"use client";
import useSWR from "swr";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const fetcher = (url: string) => fetch(url, { headers: { "x-tenant-id":"demo-tenant" }}).then(r=>r.json());

export default function FinancePage() {
  const [q, setQ] = useState("");
  const { data, mutate } = useSWR(`/api/finance/invoices?q=${encodeURIComponent(q)}`, fetcher);
  const list = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finance — Invoices</h1>
        <CreateInvoice onCreated={()=>mutate()} />
      </div>
      <div className="flex gap-2">
        <Input placeholder="Search by number/customer" value={q} onChange={e=>setQ(e.target.value)} />
        <Button onClick={()=>mutate()}>Search</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((inv: any) =>(
          <Card key={inv.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{inv.number}</div>
                <span className="text-xs rounded-full px-2 py-1 border">{inv.status}</span>
              </div>
              <div className="text-sm text-slate-600">
                Issue: {new Date(inv.issueDate).toLocaleDateString()} • Due: {new Date(inv.dueDate).toLocaleDateString()}
              </div>
              <Separator />
              <div className="text-sm">Total: {inv.total} {inv.currency} (VAT {inv.vatAmount})</div>
              <div className="flex gap-2 pt-2">
                <Action id={inv.id} action="POST" disabled={inv.status!=="DRAFT"} onDone={()=>mutate()} />
                <Action id={inv.id} action="VOID" disabled={inv.status==="VOID"} onDone={()=>mutate()} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Action({ id, action, disabled, onDone }:{ id:string; action:"POST"|"VOID"; disabled?:boolean; onDone:()=>void }) {
  async function go() {
    await fetch(`/api/finance/invoices/${id}`, {
      method:"PATCH",
      headers:{ "Content-Type":"application/json", "x-tenant-id":"demo-tenant", "x-user-id":"demo-user" },
      body: JSON.stringify({ action })
    });
    onDone();
  }
  return <Button variant="secondary" disabled={disabled} onClick={go}>{action}</Button>;
}

function CreateInvoice({ onCreated }:{ onCreated:()=>void }) {
  const [open,setOpen]=useState(false);
  const [issue, setIssue] = useState(new Date().toISOString().slice(0,10));
  const [due, setDue] = useState(new Date(Date.now()+7*864e5).toISOString().slice(0,10));
  const [lines, setLines] = useState([{ description:"Maintenance Service", qty:1, unitPrice:100, vatRate:15 }]);

  function updateLine(i:number, key:string, val:any) {
    setLines(prev => prev.map((l,idx)=> idx===i ? { ...l, [key]: key==="description"?val:Number(val) } : l));
  }

  async function submit() {
    await fetch("/api/finance/invoices", {
      method:"POST",
      headers: { "Content-Type":"application/json", "x-tenant-id":"demo-tenant", "x-user-id":"demo-user" },
      body: JSON.stringify({
        issueDate: issue, dueDate: due, currency:"SAR",
        lines
      })
    });
    setOpen(false); onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>New Invoice</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs">Issue Date</label>
              <Input type="date" value={issue} onChange={e=>setIssue(e.target.value)} />
            </div>
            <div>
              <label className="text-xs">Due Date</label>
              <Input type="date" value={due} onChange={e=>setDue(e.target.value)} />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="font-medium">Lines</div>
              <Button variant="secondary" onClick={()=>setLines(prev=>[...prev,{ description:"", qty:1, unitPrice:0, vatRate:15 }])}>Add Line</Button>
            </div>
            {lines.map((l, i)=>(
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Input placeholder="Description" value={l.description} onChange={e=>updateLine(i,"description",e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Input type="number" placeholder="Qty" value={l.qty} onChange={e=>updateLine(i,"qty",e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Input type="number" placeholder="Unit Price" value={l.unitPrice} onChange={e=>updateLine(i,"unitPrice",e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Input type="number" placeholder="VAT %" value={l.vatRate} onChange={e=>updateLine(i,"vatRate",e.target.value)} />
                </div>
                <div className="col-span-1 text-right text-sm">
                  {(l.qty*l.unitPrice*(1+l.vatRate/100)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <Button onClick={submit} disabled={!lines.length || lines.some(l=>!l.description)}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
