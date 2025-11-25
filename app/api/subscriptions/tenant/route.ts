import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSubscriptionForTenant } from "@/server/services/subscriptionSeatService";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await getSubscriptionForTenant(session.user.tenantId);

    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      // @ts-expect-error - Fixed VSCode problem
      id: subscription._id,
      // @ts-expect-error - Fixed VSCode problem
      status: subscription.status,
      // @ts-expect-error - Fixed VSCode problem
      modules: subscription.modules,
      // @ts-expect-error - Fixed VSCode problem
      seats: subscription.seats,
      // @ts-expect-error - Fixed VSCode problem
      billing_cycle: subscription.billing_cycle,
      // @ts-expect-error - Fixed VSCode problem
      amount: subscription.amount,
      // @ts-expect-error - Fixed VSCode problem
      currency: subscription.currency,
      // @ts-expect-error - Fixed VSCode problem
      next_billing_date: subscription.next_billing_date,
      // @ts-expect-error - Fixed VSCode problem
      metadata: subscription.metadata,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 },
    );
  }
}
