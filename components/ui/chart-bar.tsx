"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface BarDatum {
  name: string;
  value: number;
  fill?: string;
}

interface ChartBarProps {
  data: BarDatum[];
  barColor?: string;
}

const DEFAULT_BAR = "var(--color-brand-primary, #1A9D6C)";

export function ChartBar({ data, barColor = DEFAULT_BAR }: ChartBarProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EAEAEA" />
        <XAxis dataKey="name" tick={{ fill: "#6C757D", fontSize: 12 }} />
        <YAxis tick={{ fill: "#6C757D", fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" fill={barColor} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default ChartBar;
