'use client';
import { logger } from '@/lib/logger';

import { useState } from 'react';
import { Calendar, DollarSign, Package } from 'lucide-react';
import ClientDate from '@/components/ClientDate';

interface RFQCategory {
  slug: string;
  name: string;
}

interface RFQItem {
  id: string;
  title: string;
  categoryId?: string;
  quantity?: number;
  budget?: number;
  currency: string;
  deadline?: string;
  status: string;
  createdAt: string;
}

interface RFQBoardProps {
  categories: RFQCategory[];
  initialRfqs: RFQItem[];
}

export default function RFQBoard({ categories, initialRfqs }: RFQBoardProps) {
  const [rfqs, setRfqs] = useState(initialRfqs);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    quantity: '',
    budget: '',
    deadline: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRFQ = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/marketplace/rfq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          categoryId: form.categoryId || undefined,
          quantity: form.quantity ? Number(form.quantity) : undefined,
          budget: form.budget ? Number(form.budget) : undefined,
          deadline: form.deadline || undefined
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? 'Failed to create RFQ');
        return;
      }

      const payload = await response.json();
      setRfqs([payload.data, ...rfqs]);
      setForm({ title: '', description: '', categoryId: '', quantity: '', budget: '', deadline: '' });
      setShowForm(false);
    } catch (fetchError) {
      logger.error('Failed to create RFQ:', { error: fetchError });
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Request for Quotations</h1>
          <p className="text-sm text-muted-foreground">Coordinate bulk sourcing with approved vendors.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90"
        >
          {showForm ? 'Close form' : 'Create RFQ'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-3xl bg-card p-6 shadow">
          <h2 className="text-lg font-semibold text-foreground">New RFQ</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-muted-foreground">
              Title
              <input
                value={form.title}
                onChange={event => setForm({ ...form, title: event.target.value })}
                className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
                required
              />
            </label>
            <label className="text-sm text-muted-foreground">
              Category
              <select
                value={form.categoryId}
                onChange={event => setForm({ ...form, categoryId: event.target.value })}
                className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
              >
                <option value="">Select</option>
                {categories.map(category => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2 text-sm text-muted-foreground">
              Description
              <textarea
                value={form.description}
                onChange={event => setForm({ ...form, description: event.target.value })}
                className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
                rows={3}
              />
            </label>
            <label className="text-sm text-muted-foreground">
              Quantity
              <input
                type="number"
                value={form.quantity}
                onChange={event => setForm({ ...form, quantity: event.target.value })}
                className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
              />
            </label>
            <label className="text-sm text-muted-foreground">
              Budget (SAR)
              <input
                type="number"
                value={form.budget}
                onChange={event => setForm({ ...form, budget: event.target.value })}
                className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
              />
            </label>
            <label className="text-sm text-muted-foreground">
              Deadline
              <input
                type="date"
                value={form.deadline}
                onChange={event => setForm({ ...form, deadline: event.target.value })}
                className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
              />
            </label>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button
              onClick={createRFQ}
              disabled={submitting}
              className="rounded-full bg-warning px-5 py-2 text-sm font-semibold text-black hover:bg-warning/90 disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit RFQ'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {rfqs.length ? (
          rfqs.map(rfq => (
            <article key={rfq.id} className="rounded-3xl bg-card p-6 shadow">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{rfq.title}</h3>
                  <p className="text-sm text-muted-foreground">Created <ClientDate date={rfq.createdAt} format="date-only" /></p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {rfq.categoryId && (
                      <span className="flex items-center gap-1">
                        <Package size={14} />
                        {categories.find(category => category.slug === rfq.categoryId)?.name ?? rfq.categoryId}
                      </span>
                    )}
                    {rfq.budget && (
                      <span className="flex items-center gap-1">
                        <DollarSign size={14} />
                        {rfq.budget.toLocaleString()} {rfq.currency}
                      </span>
                    )}
                    {rfq.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        Due <ClientDate date={rfq.deadline} format="date-only" />
                      </span>
                    )}
                  </div>
                </div>
                <span className="self-start rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold text-primary">
                  {rfq.status}
                </span>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-primary/40 bg-card p-10 text-center text-muted-foreground">
            <p className="text-lg font-semibold text-foreground">No RFQs yet</p>
            <p className="mt-2 text-sm">Create an RFQ to engage approved vendors.</p>
          </div>
        )}
      </div>
    </div>
  );
}
