import Subscription from '@/server/models/Subscription';

export async function provisionSubscriber(cartIdOrSubscriptionId: string) {
  const subscription = (await Subscription.findOne({
    $or: [
      { _id: cartIdOrSubscriptionId },
      { 'paytabs.cart_id': cartIdOrSubscriptionId },
    ],
  })) as any;

  if (!subscription) {
    throw new Error('Subscription not found for provisioning');
  }

  // Provisioning hooks tie into the broader RBAC and automation layer. For now we
  // simply return the subscription document so callers can continue with their
  // onboarding routines without blocking on additional infrastructure.
  return subscription;
}

