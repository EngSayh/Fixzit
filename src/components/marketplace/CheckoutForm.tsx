'use client&apos;;

import { FormEvent, useState } from &apos;react&apos;;
import { useRouter } from &apos;next/navigation&apos;;

interface CheckoutFormProps {
  cartId: string;
  totals: { subtotal: number; vat: number; grand: number };
  currency: string;
}

export default function CheckoutForm({ totals, currency }: CheckoutFormProps) {
  const router = useRouter();
  const [address, setAddress] = useState(&apos;Riyadh HQ, King Fahd Rd&apos;);
  const [contact, setContact] = useState(&apos;Facilities Control Room&apos;);
  const [phone, setPhone] = useState(&apos;+966 11 000 0000&apos;);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(&apos;/api/marketplace/checkout&apos;, {
      method: &apos;POST&apos;,
      headers: { &apos;Content-Type&apos;: &apos;application/json&apos; },
      body: JSON.stringify({
        shipTo: {
          address,
          contact,
          phone
        }
      })
    });

    setLoading(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? &apos;Checkout failed&apos;);
      return;
    }

    setSuccess(true);
    router.push(&apos;/marketplace/orders&apos;);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl bg-white p-6 shadow">
      <div>
        <h2 className="text-lg font-semibold text-[#0F1111]">Delivery details</h2>
        <p className="text-sm text-gray-600">Ship to your facilities hub with SLA tracking.</p>
      </div>
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="text-gray-600">Address</span>
          <input
            value={address}
            onChange={event => setAddress(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            required
          />
        </label>
        <label className="block">
          <span className="text-gray-600">Contact</span>
          <input
            value={contact}
            onChange={event => setContact(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            required
          />
        </label>
        <label className="block">
          <span className="text-gray-600">Phone</span>
          <input
            value={phone}
            onChange={event => setPhone(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>
      </div>
      <div className="rounded-2xl bg-[#0061A8]/5 p-4 text-sm text-[#0F1111]">
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
        <div className="mt-2 flex justify-between text-base font-semibold text-[#0061A8]">
          <span>Total</span>
          <span>
            {totals.grand.toFixed(2)} {currency}
          </span>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-[#00A859]">Checkout submitted. Redirecting…</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-[#FFB400] px-6 py-3 text-sm font-semibold text-black hover:bg-[#FFCB4F] disabled:opacity-60"
      >
        {loading ? &apos;Submitting…&apos; : &apos;Submit for approval&apos;}
      </button>
    </form>
  );
}
