"use client";

import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Button } from "./button";
import { StatusPill } from "./status-pill";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>FM Work Order</CardTitle>
            <CardDescription>Tenant HVAC inspection • Riyadh</CardDescription>
          </div>
          <StatusPill status="info" label="In Progress" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Assigned To</span>
          <span className="font-semibold">Aisha Al-Mutairi</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">SLA</span>
          <span className="font-semibold text-amber-600">2h remaining</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Module</span>
          <span className="font-semibold">Souq → FM Handover</span>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline">View Timeline</Button>
        <Button>Update Status</Button>
      </CardFooter>
    </Card>
  ),
};

export const Minimal: Story = {
  render: () => (
    <Card className="w-[280px]">
      <CardHeader>
        <CardTitle>Marketplace Budget</CardTitle>
        <CardDescription>Stay under the weekly envelope.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-emerald-700">SAR 42,500</p>
        <p className="text-sm text-muted-foreground mt-2">
          Budget history now tracks every build to prevent regressions.
        </p>
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="ghost">View Trend</Button>
      </CardFooter>
    </Card>
  ),
};
