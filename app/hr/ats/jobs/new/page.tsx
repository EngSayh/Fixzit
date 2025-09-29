'use client';

import { useState } from &apos;react&apos;;
import { useRouter } from &apos;next/navigation&apos;;
import { Input } from &apos;@/src/components/ui/input&apos;;
import { Button } from &apos;@/src/components/ui/button&apos;;
import { Card, CardContent, CardHeader, CardTitle } from &apos;@/src/components/ui/card&apos;;

export default function NewJobPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: &apos;',
    department: &apos;',
    city: '',
    country: &apos;',
    jobType: 'full-time&apos;,
    salaryMin: &apos;',
    salaryMax: &apos;',
    currency: 'SAR&apos;,
    description: &apos;'
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(&apos;/api/ats/jobs&apos;, {
        method: &apos;POST&apos;,
        headers: { &apos;Content-Type&apos;: &apos;application/json&apos; },
        body: JSON.stringify({
          title: form.title,
          department: form.department,
          jobType: form.jobType,
          location: { city: form.city, country: form.country, mode: &apos;onsite&apos; },
          salaryRange: { min: Number(form.salaryMin)||0, max: Number(form.salaryMax)||0, currency: form.currency },
          description: form.description,
          requirements: [], benefits: [], skills: []
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || &apos;Failed&apos;);
      router.push(&apos;/hr/ats/jobs&apos;);
    } catch (err: any) {
      alert(err.message || &apos;Failed to create job&apos;);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Post New Job</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Input placeholder="Title" required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
            <Input placeholder="Department" required value={form.department} onChange={e=>setForm({...form,department:e.target.value})} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="City" required value={form.city} onChange={e=>setForm({...form,city:e.target.value})} />
              <Input placeholder="Country" required value={form.country} onChange={e=>setForm({...form,country:e.target.value})} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="Salary Min" type="number" value={form.salaryMin} onChange={e=>setForm({...form,salaryMin:e.target.value})} />
              <Input placeholder="Salary Max" type="number" value={form.salaryMax} onChange={e=>setForm({...form,salaryMax:e.target.value})} />
              <Input placeholder="Currency" value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})} />
            </div>
            <textarea className="w-full border rounded p-2" rows={6} placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={()=>router.push('/hr/ats/jobs&apos;)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="bg-[#0061A8] hover:bg-[#0061A8]/90">{submitting? &apos;Posting…&apos; : &apos;Post&apos;}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


