"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { useCurrency } from "@/contexts/CurrencyContext";
import { HoverTooltip } from "@/components/common/HoverTooltip";

interface CheckoutFormProps {
  cartId: string;
  totals: { subtotal: number; vat: number; grand: number };
  currency: string;
}

export default function CheckoutForm({ totals, currency }: CheckoutFormProps) {
  const router = useRouter();
  const [address, setAddress] = useState("Riyadh HQ, King Fahd Rd");
  const [contact, setContact] = useState("Facilities Control Room");
  const [phone, setPhone] = useState("+966 11 000 0000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const auto = useAutoTranslator("marketplace.checkoutForm");
  const { preferenceSource } = useCurrency();
  const checkoutError = auto("Checkout failed", "errors.checkout");
  const networkError = auto(
    "Network error. Please try again.",
    "errors.network",
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipTo: {
            address,
            contact,
            phone,
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? checkoutError);
        return;
      }

      setSuccess(true);
      router.push("/marketplace/orders");
    } catch (fetchError) {
      logger.error("Checkout failed:", { error: fetchError });
      setError(networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-3xl bg-card p-6 shadow"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {auto("Delivery details", "header.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {auto(
            "Ship to your facilities hub with SLA tracking.",
            "header.subtitle",
          )}
        </p>
      </div>
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="text-muted-foreground">
            {auto("Address", "fields.address.label")}
          </span>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
            required
          />
        </label>
        <label className="block">
          <span className="text-muted-foreground">
            {auto("Contact", "fields.contact.label")}
          </span>
          <input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
            required
          />
        </label>
        <label className="block">
          <span className="text-muted-foreground">
            {auto("Phone", "fields.phone.label")}
          </span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-border px-3 py-2"
          />
        </label>
      </div>
      <div className="rounded-2xl bg-primary/5 p-4 text-sm text-foreground">
        <div className="flex justify-between">
          <span>{auto("Subtotal", "summary.subtotal")}</span>
          <span>
            {totals.subtotal.toFixed(2)} {currency}
          </span>
        </div>
        <div className="flex justify-between">
          <span>{auto("VAT", "summary.vat")}</span>
          <span>
            {totals.vat.toFixed(2)} {currency}
          </span>
        </div>
        <div className="mt-2 flex justify-between text-base font-semibold text-primary">
          <span className="inline-flex items-center gap-1">
            {auto("Total", "summary.total")}
            <HoverTooltip
              content={
                preferenceSource === "profile"
                  ? auto("Currency from your profile settings", "currency.profile")
                  : preferenceSource === "cookie"
                    ? auto("Currency from previous session", "currency.cookie")
                    : preferenceSource === "localStorage"
                      ? auto("Currency saved in browser", "currency.localStorage")
                      : auto("Default currency (SAR)", "currency.default")
              }
              variant="info"
              size="xs"
            />
          </span>
          <span>
            {totals.grand.toFixed(2)} {currency}
          </span>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <p className="text-sm text-success">
          {auto("Checkout submitted. Redirecting…", "state.success")}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-warning px-6 py-3 text-sm font-semibold text-black hover:bg-warning/90 disabled:opacity-60"
        aria-label="Submit order for approval"
      >
        {loading
          ? auto("Submitting…", "actions.submitting")
          : auto("Submit for approval", "actions.submit")}
      </button>
    </form>
  );
}
