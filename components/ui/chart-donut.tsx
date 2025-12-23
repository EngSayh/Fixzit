"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

export interface DonutDatum {
  name: string;
  value: number;
  color?: string;
  [key: string]: string | number | undefined;
}

interface ChartDonutProps {
  data: DonutDatum[];
  innerRadius?: number;
  outerRadius?: number;
}

const DEFAULT_COLORS = ["var(--color-primary-500, #25935F)", "var(--color-brand-secondary, #F5BD02)", "var(--color-info, #2E90FA)", "var(--color-warning, #F79009)", "var(--color-danger, #F04438)"];

export function ChartDonut({
  data,
  innerRadius = 50,
  outerRadius = 75,
}: ChartDonutProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell
              key={`${entry.name}-${index}`}
              fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default ChartDonut;
