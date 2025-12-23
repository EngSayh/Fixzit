"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TooltipProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

interface DailyRevenue {
  date: string;
  revenue: number;
}

type RevenueTooltipDatum = {
  date: string;
  revenue: number;
};

interface SalesData {
  revenue: {
    total: number;
    previousPeriod: number;
    trend: number;
    daily: DailyRevenue[];
  };
  orders: {
    total: number;
    previousPeriod: number;
    trend: number;
  };
  averageOrderValue: {
    current: number;
    previousPeriod: number;
    trend: number;
  };
  conversionRate: {
    current: number;
    previousPeriod: number;
    trend: number;
  };
}

interface SalesChartProps {
  data: SalesData | null;
  isLoading?: boolean;
  period: string;
}

export function SalesChart({
  data,
  isLoading,
  period: _period,
}: SalesChartProps) {
  const auto = useAutoTranslator("seller.analytics.salesChart");
  const chartData = useMemo(() => {
    if (!data?.revenue.daily) return [];

    return data.revenue.daily.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en", {
        month: "short",
        day: "numeric",
      }),
      revenue: item.revenue,
    }));
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatTrend = (trend: number) => {
    const sign = trend >= 0 ? "+" : "";
    return `${sign}${trend.toFixed(1)}%`;
  };
  const renderTooltipContent = (props: TooltipProps<number, string>) => {
    const { active, payload } = props as {
      active?: boolean;
      payload?: Array<{ payload: RevenueTooltipDatum }>;
    };
    if (!active || !payload?.length) {
      return null;
    }

    const datum = payload[0]?.payload as RevenueTooltipDatum | undefined;
    if (!datum) {
      return null;
    }

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {auto("Date", "tooltip.date")}
            </span>
            <span className="font-bold text-muted-foreground">
              {datum.date}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {auto("Revenue", "tooltip.revenue")}
            </span>
            <span className="font-bold">{formatCurrency(datum.revenue)}</span>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{auto("Sales Performance", "title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">
              {auto("Loading sales data...", "state.loading")}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{auto("Sales Performance", "title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">
              {auto("No sales data available", "state.empty")}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{auto("Sales Performance", "title")}</CardTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <div className="text-sm text-muted-foreground">
              {auto("Total Revenue", "metrics.totalRevenue")}
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(data.revenue.total)}
            </div>
            <div
              className={`text-sm ${data.revenue.trend >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatTrend(data.revenue.trend)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">
              {auto("Total Orders", "metrics.totalOrders")}
            </div>
            <div className="text-2xl font-bold">{data.orders.total}</div>
            <div
              className={`text-sm ${data.orders.trend >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatTrend(data.orders.trend)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">
              {auto("Avg Order Value", "metrics.avgOrderValue")}
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(data.averageOrderValue.current)}
            </div>
            <div
              className={`text-sm ${data.averageOrderValue.trend >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatTrend(data.averageOrderValue.trend)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">
              {auto("Conversion Rate", "metrics.conversionRate")}
            </div>
            <div className="text-2xl font-bold">
              {data.conversionRate.current.toFixed(2)}%
            </div>
            <div
              className={`text-sm ${data.conversionRate.trend >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatTrend(data.conversionRate.trend)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-primary, #8884d8)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-chart-primary, #8884d8)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
            <YAxis
              className="text-xs"
              tick={{ fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={renderTooltipContent} />
            <Legend
              formatter={(value) =>
                value === "revenue"
                  ? auto("Revenue", "chart.legend.revenue")
                  : value
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-chart-primary, #8884d8)"
              fillOpacity={1}
              fill="url(#colorRevenue)"
              name={auto("Revenue", "chart.legend.revenue")}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
