import PriceBook from '@/server/models/PriceBook';
import Subscription from '@/server/models/Subscription';
import { quotePrice, BillingCycle, QuoteResult } from './pricing';

type QuoteSuccess = Extract<QuoteResult, { requiresQuote: false }>;

type QuoteFailure = Extract<QuoteResult, { requiresQuote: true }>;

interface CustomerDetails {
  name: string;
  email: string;
  phone?: string;
}

interface CheckoutInput {
  subscriberType: 'CORPORATE' | 'OWNER';
  tenantId?: string;
  ownerUserId?: string;
  modules: string[];
  seats: number;
  billingCycle: BillingCycle;
  currency: 'USD' | 'SAR';
  customer: CustomerDetails;
  priceBookId?: string;
  metadata?: Record<string, unknown>;
}

interface CheckoutSuccess {
  requiresQuote: false;
  subscriptionId: string;
  cartId: string;
  redirectUrl: string;
  quote: QuoteSuccess;
}

interface CheckoutRequiresQuote {
  requiresQuote: true;
  quote: QuoteFailure;
}

export async function createSubscriptionCheckout(
  input: CheckoutInput
): Promise<CheckoutSuccess | CheckoutRequiresQuote> {
  const billingCycle = input.billingCycle;
  const currency = input.currency;

  const paytabsDomain = process.env.PAYTABS_DOMAIN;
  const paytabsProfileId = process.env.PAYTABS_PROFILE_ID;
  const paytabsServerKey = process.env.PAYTABS_SERVER_KEY;
  const appUrl = process.env.APP_URL;

  if (!paytabsDomain || !paytabsProfileId || !paytabsServerKey || !appUrl) {
    throw new Error('PayTabs environment variables are not fully configured');
  }

  const priceBook = input.priceBookId
    ? await PriceBook.findById(input.priceBookId)
    : await PriceBook.findOne({ currency, active: true });

  if (!priceBook) {
    throw new Error('PriceBook not found');
  }

  const quote = await quotePrice({
    priceBookCurrency: currency,
    seats: input.seats,
    modules: input.modules,
    billingCycle,
  });

  if (quote.requiresQuote) {
    return { requiresQuote: true, quote };
  }

  const subscription = (await Subscription.create({
    tenant_id: input.subscriberType === 'CORPORATE' ? input.tenantId : undefined,
    owner_user_id: input.subscriberType === 'OWNER' ? input.ownerUserId : undefined,
    subscriber_type: input.subscriberType,
    modules: input.modules,
    seats: input.seats,
    billing_cycle: billingCycle,
    currency,
    price_book_id: priceBook._id,
    amount: quote.total,
    status: 'INCOMPLETE',
    paytabs: {
      profile_id: paytabsProfileId,
      customer_email: input.customer.email,
    },
    metadata: input.metadata,
  });

  const cartId = `SUB-${subscription._id.toString()}`;
  const payload: Record<string, unknown> = {
    profile_id: paytabsProfileId,
    tran_type: 'sale',
    tran_class: 'ecom',
    cart_id: cartId,
    cart_description: `${input.subscriberType} subscription`,
    cart_amount: quote.total,
    cart_currency: currency,
    customer_details: {
      name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone ?? 'N/A',
      street1: 'N/A',
      city: 'N/A',
      state: 'N/A',
      country: 'SA',
      zip: '00000',
    },
    return: `${appUrl}/api/paytabs/return`,
    callback: `${appUrl}/api/paytabs/callback`,
  };

  if (billingCycle === 'MONTHLY') {
    payload.tokenise = 2;
  }

  const response = await fetch(`${paytabsDomain}/payment/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${paytabsServerKey}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();

  if (!json.redirect_url) {
    await subscription.deleteOne();
    throw new Error('Failed to create PayTabs session');
  }

  subscription.paytabs = {
    profile_id: paytabsProfileId,
    customer_email: input.customer.email,
    cart_id: cartId,
  } as unknown;
  subscription.amount = quote.total;
  await subscription.save();

  return {
    requiresQuote: false,
    subscriptionId: subscription._id.toString(),
    cartId,
    redirectUrl: json.redirect_url,
    quote,
  };
}

