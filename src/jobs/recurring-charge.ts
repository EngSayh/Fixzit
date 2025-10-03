import Subscription from '../../server/models/Subscription';

export async function chargeDueMonthlySubs() {
  const paytabsDomain = process.env.PAYTABS_DOMAIN;
  const paytabsProfileId = process.env.PAYTABS_PROFILE_ID;
  const paytabsServerKey = process.env.PAYTABS_SERVER_KEY;

  if (!paytabsDomain || !paytabsProfileId || !paytabsServerKey) {
    throw new Error('PayTabs environment variables are not fully configured');
  }

  const dueSubs = await Subscription.find({
    billing_cycle: 'MONTHLY',
    status: 'ACTIVE',
    'paytabs.token': { $exists: true, $ne: null },
  }).lean();

  for (const subscription of dueSubs) {
    if (!subscription.paytabs?.token) continue;

    await fetch(`${paytabsDomain}/payment/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${paytabsServerKey}`,
      },
      body: JSON.stringify({
        profile_id: paytabsProfileId,
        tran_type: 'sale',
        tran_class: 'recurring',
        cart_id: `REN-${Date.now()}-${subscription._id}`,
        cart_description: 'Monthly subscription renewal',
        cart_amount: subscription.amount,
        cart_currency: subscription.currency,
        token: subscription.paytabs.token,
      }),
    });
  }
}
