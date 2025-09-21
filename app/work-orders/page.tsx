"use client";
import useSWR from "swr";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const fetcher = (url: string) => fetch(url, { headers: { "x-tenant-id":"demo-tenant" }}).then(r=>r.json());

export default function WorkOrdersPage() {
  const [q, setQ] = useState("");
  const { data, mutate, isLoading } = useSWR(`/api/work-orders?q=${encodeURIComponent(q)}`, fetcher);
  const list = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Work Orders</h1>
        <CreateWO onCreated={() => mutate()} />
      </div>

      <div className="flex gap-2">
        <Input placeholder="Search title/description" value={q} onChange={e=>setQ(e.target.value)} />
        <Button onClick={()=>mutate()}>Search</Button>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((wo:any)=>(
            <Card key={wo.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{wo.code} — {wo.title}</div>
                  <Badge variant="outline">{wo.status}</Badge>
                </div>
                <p className="text-sm text-slate-600 line-clamp-3">{wo.description}</p>
                <div className="text-xs text-slate-500">Priority: {wo.priority} • SLA: {wo.slaHours}h</div>
                <div className="flex gap-2 pt-2">
                  <StatusButton id={wo.id} to="ASSIGNED" onDone={()=>mutate()} disabled={wo.status!=="NEW"} />
                  <StatusButton id={wo.id} to="IN_PROGRESS" onDone={()=>mutate()} disabled={!["ASSIGNED","ON_HOLD"].includes(wo.status)} />
                  <StatusButton id={wo.id} to="COMPLETED" onDone={()=>mutate()} disabled={!["IN_PROGRESS"].includes(wo.status)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusButton({ id, to, onDone, disabled }:{ id:string; to:string; onDone:()=>void; disabled?:boolean }) {
  async function go() {
    await fetch(`/api/work-orders/${id}`, {
      method:"PATCH",
      headers: { "Content-Type":"application/json", "x-tenant-id":"demo-tenant" },
      body: JSON.stringify({ status: to })
    });
    onDone();
  }
  return <Button variant="secondary" disabled={disabled} onClick={go}>{to}</Button>;
}

function CreateWO({ onCreated }:{ onCreated:()=>void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  async function submit() {
    await fetch("/api/work-orders", {
      method:"POST",
      headers: { "Content-Type":"application/json", "x-tenant-id":"demo-tenant", "x-user-id":"demo-user" },
      body: JSON.stringify({ title, description: desc, priority:"MEDIUM", slaHours:72 })
    });
    setOpen(false);
    setTitle(""); setDesc("");
    onCreated();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>New Work Order</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Work Order</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <Textarea placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} />
          <Button onClick={submit} disabled={!title || !desc}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}