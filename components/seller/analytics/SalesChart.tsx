'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DailyRevenue {
  date: string;
  revenue: number;
}

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

export function SalesChart({ data, isLoading, period }: SalesChartProps) {
  const chartData = useMemo(() => {
    if (!data?.revenue.daily) return [];
    
    return data.revenue.daily.map((item) => ({
      date: new Date(item.date).toLocaleDateString('en', { 
        month: 'short', 
        day: 'numeric' 
      }),
      revenue: item.revenue,
    }));
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatTrend = (trend: number) => {
    const sign = trend >= 0 ? '+' : '';
    return `${sign}${trend.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">Loading sales data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">No sales data available</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Performance</CardTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold">{formatCurrency(data.revenue.total)}</div>
            <div className={`text-sm ${data.revenue.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatTrend(data.revenue.trend)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Orders</div>
            <div className="text-2xl font-bold">{data.orders.total}</div>
            <div className={`text-sm ${data.orders.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatTrend(data.orders.trend)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Avg Order Value</div>
            <div className="text-2xl font-bold">{formatCurrency(data.averageOrderValue.current)}</div>
            <div className={`text-sm ${data.averageOrderValue.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatTrend(data.averageOrderValue.trend)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Conversion Rate</div>
            <div className="text-2xl font-bold">{data.conversionRate.current.toFixed(2)}%</div>
            <div className={`text-sm ${data.conversionRate.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Date
                          </span>
                          <span className="font-bold text-muted-foreground">
                            {payload[0].payload.date}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Revenue
                          </span>
                          <span className="font-bold">
                            {formatCurrency(payload[0].value as number)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#8884d8"
              fillOpacity={1}
              fill="url(#colorRevenue)"
              name="Revenue"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
