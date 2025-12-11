"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { StatusPill } from "./status-pill";

const meta: Meta<typeof StatusPill> = {
  title: "UI/StatusPill",
  component: StatusPill,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Palette: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 max-w-xl">
      <StatusPill status="success" label="Ready" />
      <StatusPill status="warning" label="Action Needed" />
      <StatusPill status="danger" label="Blocked" />
      <StatusPill status="info" label="Queued" />
      <StatusPill status="neutral" label="Archived" />
    </div>
  ),
};

export const CustomText: Story = {
  render: () => (
    <div className="flex flex-col gap-2 items-start">
      <StatusPill status="success" label="FM • Live" />
      <StatusPill status="info" label="Souq • Syncing" />
      <StatusPill status="warning" label="Aqar • Draft" />
    </div>
  ),
};
