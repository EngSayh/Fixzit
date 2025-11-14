'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

  useEffect(() => {
    fetch('/api/subscriptions/tenant')
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
    return <div className="p-8">Loading subscription...</div>;
  }

  if (!subscription) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>No Subscription</CardTitle>
            <CardDescription>You don&apos;t have an active subscription.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const statusColor = {
    ACTIVE: 'bg-green-500',
    PAST_DUE: 'bg-red-500',
    CANCELED: 'bg-gray-500',
    INCOMPLETE: 'bg-yellow-500',
  }[subscription.status] || 'bg-gray-500';

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        <Badge className={statusColor}>{subscription.status}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Billing Cycle:</span>
              <span className="font-medium">{subscription.billing_cycle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Seats:</span>
              <span className="font-medium">{subscription.seats}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">
                {subscription.amount.toFixed(2)} {subscription.currency}
              </span>
            </div>
            {subscription.next_billing_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Billing:</span>
                <span className="font-medium">
                  {new Date(subscription.next_billing_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Modules</CardTitle>
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
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button variant="outline">Upgrade Plan</Button>
          <Button variant="outline">Add Seats</Button>
          <Button variant="destructive">Cancel Subscription</Button>
        </CardContent>
      </Card>
    </div>
  );
}
