import Subscription from '@/src/models/Subscription';

export async function requireFeature(orgCustomerId: string, featureCode: string) {
  const sub = await Subscription.findOne({ customerId: orgCustomerId, status: 'active' });
  if (!sub) {
    const err: any = new Error('No active subscription');
    err.status = 402;
    throw err;
  }
  // Feature considered enabled if subscription contains the module
  const has = sub.items?.some((it: any) => !!it.moduleId);
  if (!has) {
    const err: any = new Error('Module not enabled on your subscription');
    err.status = 402;
    throw err;
  }
  return true;
}

