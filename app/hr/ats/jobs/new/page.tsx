'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormWithNavigation } from '@/components/ui/navigation-buttons';
import { useTranslation } from '@/contexts/TranslationContext';

export default function NewJobPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    department: '',
    city: '',
    country: '',
    jobType: 'full-time',
    salaryMin: '',
    salaryMax: '',
    currency: 'SAR',
    description: ''
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const toastId = toast.loading(t('hr.ats.jobs.new.toast.creating', 'Creating job posting...'));
    try {
      const res = await fetch('/api/ats/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          department: form.department,
          jobType: form.jobType,
          location: { city: form.city, country: form.country, mode: 'onsite' },
          salaryRange: { min: Number(form.salaryMin)||0, max: Number(form.salaryMax)||0, currency: form.currency },
          description: form.description,
          requirements: [], benefits: [], skills: []
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t('hr.ats.jobs.new.toast.error', 'Failed to create job'));
      toast.success(t('hr.ats.jobs.new.toast.success', 'Job posted successfully'), { id: toastId });
      router.push('/hr/ats/jobs');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('hr.ats.jobs.new.toast.generic', 'Failed to create job'), { id: toastId });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t('hr.ats.jobs.new.title', 'Post New Job')}</CardTitle>
        </CardHeader>
        <CardContent>
          <FormWithNavigation 
            onSubmit={submit} 
            saving={submitting}
            showBack
            showHome
            position="bottom"
          >
            <Input placeholder={t('hr.ats.jobs.new.fields.title', 'Job title')} required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
            <Input placeholder={t('hr.ats.jobs.new.fields.department', 'Department')} required value={form.department} onChange={e=>setForm({...form,department:e.target.value})} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder={t('hr.ats.jobs.new.fields.city', 'City')} required value={form.city} onChange={e=>setForm({...form,city:e.target.value})} />
              <Input placeholder={t('hr.ats.jobs.new.fields.country', 'Country')} required value={form.country} onChange={e=>setForm({...form,country:e.target.value})} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder={t('hr.ats.jobs.new.fields.salaryMin', 'Salary Min')} type="number" value={form.salaryMin} onChange={e=>setForm({...form,salaryMin:e.target.value})} />
              <Input placeholder={t('hr.ats.jobs.new.fields.salaryMax', 'Salary Max')} type="number" value={form.salaryMax} onChange={e=>setForm({...form,salaryMax:e.target.value})} />
              <Input placeholder={t('hr.ats.jobs.new.fields.currency', 'Currency')} value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})} />
            </div>
            <textarea className="w-full border rounded p-2" rows={6} placeholder={t('hr.ats.jobs.new.fields.description', 'Description')} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
          </FormWithNavigation>
        </CardContent>
      </Card>
    </div>
  );
}


