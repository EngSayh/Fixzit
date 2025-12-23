import Subscription from "@/server/models/Subscription";

export async function provisionSubscriber(cartIdOrSubscriptionId: string) {
  // eslint-disable-next-line local/require-lean, local/require-tenant-scope -- NO_LEAN: needs document methods; PLATFORM-WIDE: lookup by unique _id
  const subscription = await Subscription.findOne({
    _id: cartIdOrSubscriptionId,
  });

  if (!subscription) {
    throw new Error("Subscription not found for provisioning");
  }

  // Provisioning hooks tie into the broader RBAC and automation layer. For now we
  // simply return the subscription document so callers can continue with their
  // onboarding routines without blocking on additional infrastructure.
  return subscription;
}
