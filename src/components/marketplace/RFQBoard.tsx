'use client';

import { useState } from 'react';
import { Calendar, DollarSign, Package } from 'lucide-react';

interface RFQCategory {
  slug: string;
  name: string;
}

interface RFQItem {
  _id: string;
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
    setSubmitting(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? 'Failed to create RFQ');
      return;
    }

    const payload = await response.json();
    setRfqs([payload.data, ...rfqs]);
    setForm({ title: '', description: '', categoryId: '', quantity: '', budget: '', deadline: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-[#0F1111]">Request for Quotations</h1>
          <p className="text-sm text-gray-600">Coordinate bulk sourcing with approved vendors.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-[#0061A8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#00558F]"
        >
          {showForm ? 'Close form' : 'Create RFQ'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-3xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-[#0F1111]">New RFQ</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-gray-600">
              Title
              <input
                value={form.title}
                onChange={event => setForm({ ...form, title: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm text-gray-600">
              Category
              <select
                value={form.categoryId}
                onChange={event => setForm({ ...form, categoryId: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              >
                <option value="">Select</option>
                {categories.map(category => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2 text-sm text-gray-600">
              Description
              <textarea
                value={form.description}
                onChange={event => setForm({ ...form, description: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                rows={3}
              />
            </label>
            <label className="text-sm text-gray-600">
              Quantity
              <input
                type="number"
                value={form.quantity}
                onChange={event => setForm({ ...form, quantity: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </label>
            <label className="text-sm text-gray-600">
              Budget (SAR)
              <input
                type="number"
                value={form.budget}
                onChange={event => setForm({ ...form, budget: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </label>
            <label className="text-sm text-gray-600">
              Deadline
              <input
                type="date"
                value={form.deadline}
                onChange={event => setForm({ ...form, deadline: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </label>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button
              onClick={createRFQ}
              disabled={submitting}
              className="rounded-full bg-[#FFB400] px-5 py-2 text-sm font-semibold text-black hover:bg-[#FFCB4F] disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit RFQ'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {rfqs.length ? (
          rfqs.map(rfq => (
            <article key={rfq._id} className="rounded-3xl bg-white p-6 shadow">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F1111]">{rfq.title}</h3>
                  <p className="text-sm text-gray-600">Created {new Date(rfq.createdAt).toLocaleDateString()}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
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
                        Due {new Date(rfq.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <span className="self-start rounded-full bg-[#0061A8]/10 px-4 py-1 text-xs font-semibold text-[#0061A8]">
                  {rfq.status}
                </span>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-[#0061A8]/40 bg-white p-10 text-center text-gray-600">
            <p className="text-lg font-semibold text-[#0F1111]">No RFQs yet</p>
            <p className="mt-2 text-sm">Create an RFQ to engage approved vendors.</p>
          </div>
        )}
      </div>
    </div>
  );
}
