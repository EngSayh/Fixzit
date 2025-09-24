import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '../db/mongoose';
import Subscription from '../models/Subscription';
import Customer from '../models/Customer';

export interface FeatureGateOptions {
  requiredModules: string[];
  allowSuperAdmin?: boolean;
  redirectTo?: string;
}

export class FeatureGateError extends Error {
  constructor(
    message: string,
    public statusCode: number = 402,
    public requiredModules: string[] = []
  ) {
    super(message);
    this.name = 'FeatureGateError';
  }
}

/**
 * Check if a customer has access to required modules
 */
export async function checkModuleAccess(
  customerId: string,
  requiredModules: string[]
): Promise<{ hasAccess: boolean; missingModules: string[] }> {
  try {
    await dbConnect();
    
    const subscription = await Subscription.findOne({
      customerId,
      status: 'active'
    }).populate('customerId');

    if (!subscription) {
      return {
        hasAccess: false,
        missingModules: requiredModules
      };
    }

    // Get enabled modules from subscription
    const enabledModules = subscription.items.map((item: any) => item.moduleCode);
    
    // Check if all required modules are enabled
    const missingModules = requiredModules.filter(
      module => !enabledModules.includes(module)
    );

    return {
      hasAccess: missingModules.length === 0,
      missingModules
    };
  } catch (error) {
    console.error('Error checking module access:', error);
    return {
      hasAccess: false,
      missingModules: requiredModules
    };
  }
}

/**
 * Middleware function to gate features based on subscription
 */
export function createFeatureGate(options: FeatureGateOptions) {
  return async (req: NextRequest, customerId: string) => {
    try {
      // Check if user is super admin (if allowed)
      if (options.allowSuperAdmin) {
        // You can implement super admin check here
        // For now, we'll skip this check
      }

      const { hasAccess, missingModules } = await checkModuleAccess(
        customerId,
        options.requiredModules
      );

      if (!hasAccess) {
        if (options.redirectTo) {
          return NextResponse.redirect(new URL(options.redirectTo, req.url));
        }

        return NextResponse.json(
          {
            error: 'Module not enabled on your subscription',
            missingModules,
            requiredModules: options.requiredModules
          },
          { status: 402 }
        );
      }

      return null; // Access granted
    } catch (error) {
      console.error('Feature gate error:', error);
      return NextResponse.json(
        { error: 'Failed to verify module access' },
        { status: 500 }
      );
    }
  };
}

/**
 * Utility function to check if a module is enabled for a customer
 */
export async function isModuleEnabled(
  customerId: string,
  moduleCode: string
): Promise<boolean> {
  const { hasAccess } = await checkModuleAccess(customerId, [moduleCode]);
  return hasAccess;
}

/**
 * Get all enabled modules for a customer
 */
export async function getEnabledModules(customerId: string): Promise<string[]> {
  try {
    await dbConnect();
    
    const subscription = await Subscription.findOne({
      customerId,
      status: 'active'
    });

    if (!subscription) {
      return [];
    }

    return subscription.items.map((item: any) => item.moduleCode);
  } catch (error) {
    console.error('Error getting enabled modules:', error);
    return [];
  }
}

/**
 * Check subscription status
 */
export async function getSubscriptionStatus(customerId: string): Promise<{
  status: 'active' | 'inactive' | 'past_due' | 'canceled';
  planType?: string;
  billingCycle?: string;
  nextInvoiceAt?: Date;
}> {
  try {
    await dbConnect();
    
    const subscription = await Subscription.findOne({
      customerId
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return { status: 'inactive' };
    }

    return {
      status: subscription.status,
      planType: subscription.planType,
      billingCycle: subscription.billingCycle,
      nextInvoiceAt: subscription.nextInvoiceAt
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return { status: 'inactive' };
  }
}

/**
 * React hook for feature gating (for client-side use)
 */
export function useFeatureGate() {
  const checkAccess = async (requiredModules: string[]) => {
    try {
      const response = await fetch('/api/billing/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requiredModules })
      });

      if (response.status === 402) {
        const data = await response.json();
        throw new FeatureGateError(
          data.error,
          402,
          data.missingModules
        );
      }

      return response.ok;
    } catch (error) {
      if (error instanceof FeatureGateError) {
        throw error;
      }
      throw new FeatureGateError('Failed to check module access');
    }
  };

  return { checkAccess };
}