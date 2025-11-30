"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

interface Subscription {
  id: string;
  status: string;
  modules: string[];
  seats: number;
  billing_cycle: string;
  amount: number;
  currency: string;
  next_billing_date?: string;
  metadata?: Record<string, unknown>;
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const auto = useAutoTranslator("subscription.management");

  useEffect(() => {
    import("@/lib/http/fetchWithAuth")
      .then(({ fetchWithAuth }) => fetchWithAuth("/api/subscriptions/tenant"))
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setSubscription(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">{auto("Loading subscription...", "loading")}</div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>{auto("No Subscription", "empty.title")}</CardTitle>
            <CardDescription>
              {auto(
                "You don't have an active subscription.",
                "empty.description",
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const statusColor =
    {
      ACTIVE: "bg-green-500",
      PAST_DUE: "bg-red-500",
      CANCELED: "bg-gray-500",
      INCOMPLETE: "bg-yellow-500",
    }[subscription.status] || "bg-gray-500";

  const statusLabelMap: Record<string, string> = {
    ACTIVE: auto("Active", "status.active"),
    PAST_DUE: auto("Past due", "status.pastDue"),
    CANCELED: auto("Canceled", "status.canceled"),
    INCOMPLETE: auto("Incomplete", "status.incomplete"),
  };
  const statusLabel =
    statusLabelMap[subscription.status] || subscription.status;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {auto("Subscription Management", "header.title")}
        </h1>
        <Badge className={statusColor}>{statusLabel}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{auto("Plan Details", "plan.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {auto("Billing Cycle:", "plan.billingCycle")}
              </span>
              <span className="font-medium">{subscription.billing_cycle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {auto("Seats:", "plan.seats")}
              </span>
              <span className="font-medium">{subscription.seats}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {auto("Amount:", "plan.amount")}
              </span>
              <span className="font-medium">
                {subscription.amount.toFixed(2)} {subscription.currency}
              </span>
            </div>
            {subscription.next_billing_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {auto("Next Billing:", "plan.nextBilling")}
                </span>
                <span className="font-medium">
                  {new Date(
                    subscription.next_billing_date,
                  ).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{auto("Active Modules", "modules.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {subscription.modules.map((module) => (
                <Badge key={module} variant="outline">
                  {module}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{auto("Actions", "actions.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button variant="outline">
            {auto("Upgrade Plan", "actions.upgrade")}
          </Button>
          <Button variant="outline">
            {auto("Add Seats", "actions.addSeats")}
          </Button>
          <Button variant="destructive">
            {auto("Cancel Subscription", "actions.cancel")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
