import Subscription from '@/src/models/Subscription';
import Module from '@/src/models/Module';
import { Types } from 'mongoose';

/**
 * Ensure the active subscription for the given customer includes the requested feature/module.
 * featureCode may be a module code (e.g., 'FINANCE') or a MongoDB ObjectId string.
 */
export async function requireFeature(orgCustomerId: string, featureCode: string) {
  const sub = await Subscription.findOne({ customerId: orgCustomerId, status: 'active' });
  if (!sub) {
    const err: any = new Error('No active subscription');
    err.status = 402;
    throw err;
  }

  // Resolve module id by code or direct ObjectId
  let moduleId: string | null = null;
  const byCode = await Module.findOne({ code: featureCode });
  if (byCode) moduleId = String(byCode._id);
  if (!moduleId && Types.ObjectId.isValid(featureCode)) moduleId = featureCode;

  if (!moduleId) {
    const err: any = new Error('Unknown feature/module');
    err.status = 400;
    throw err;
  }

  const has = Array.isArray(sub.items) && sub.items.some((it: any) => String(it.moduleId) === String(moduleId));
  if (!has) {
    const err: any = new Error('Module not enabled on your subscription');
    err.status = 402;
    throw err;
  }
  return true;
}

