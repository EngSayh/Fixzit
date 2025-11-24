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
      id: subscription._id,
      status: subscription.status,
      modules: subscription.modules,
      seats: subscription.seats,
      billing_cycle: subscription.billing_cycle,
      amount: subscription.amount,
      currency: subscription.currency,
      next_billing_date: subscription.next_billing_date,
      metadata: subscription.metadata,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 },
    );
  }
}
