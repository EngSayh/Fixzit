'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface CheckoutFormProps {
  cartId: string;
  totals: { subtotal: number; vat: number; grand: number };
  currency: string;
}

export default function CheckoutForm({ totals, currency }: CheckoutFormProps) {
  const router = useRouter();
  const [address, setAddress] = useState('Riyadh HQ, King Fahd Rd');
  const [contact, setContact] = useState('Facilities Control Room');
  const [phone, setPhone] = useState('+966 11 000 0000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/marketplace/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipTo: {
            address,
            contact,
            phone
          }
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? 'Checkout failed');
        return;
      }

      setSuccess(true);
      router.push('/marketplace/orders');
    } catch (fetchError) {
      logger.error('Checkout failed:', { error: fetchError });
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl bg-card p-6 shadow">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Delivery details</h2>
        <p className="text-sm text-muted-foreground">Ship to your facilities hub with SLA tracking.</p>
      </div>
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="text-muted-foreground">Address</span>
          <input
            value={address}
            onChange={event => setAddress(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
            required
          />
        </label>
        <label className="block">
          <span className="text-muted-foreground">Contact</span>
          <input
            value={contact}
            onChange={event => setContact(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
            required
          />
        </label>
        <label className="block">
          <span className="text-muted-foreground">Phone</span>
          <input
            value={phone}
            onChange={event => setPhone(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
          />
        </label>
      </div>
      <div className="rounded-2xl bg-primary/5 p-4 text-sm text-foreground">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>
            {totals.subtotal.toFixed(2)} {currency}
          </span>
        </div>
        <div className="flex justify-between">
          <span>VAT</span>
          <span>
            {totals.vat.toFixed(2)} {currency}
          </span>
        </div>
        <div className="mt-2 flex justify-between text-base font-semibold text-primary">
          <span>Total</span>
          <span>
            {totals.grand.toFixed(2)} {currency}
          </span>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-success">Checkout submitted. Redirecting…</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-warning px-6 py-3 text-sm font-semibold text-black hover:bg-warning/90 disabled:opacity-60"
      >
        {loading ? 'Submitting…' : 'Submit for approval'}
      </button>
    </form>
  );
}
