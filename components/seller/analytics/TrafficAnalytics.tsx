<<<<<<< HEAD
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TooltipProps } from "recharts";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

interface DailyPageView {
  date: string;
  views: number;
}

interface TrafficAnalyticsData {
  pageViews: {
    total: number;
    daily: DailyPageView[];
  };
  sources: {
    direct: number;
    search: number;
    social: number;
    referral: number;
    paid: number;
  };
  engagement: {
    avgSessionDuration: number;
    avgPagesPerSession: number;
    bounceRate: number;
  };
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

interface TrafficAnalyticsProps {
  data: TrafficAnalyticsData | null;
  isLoading?: boolean;
}

type PageViewDatum = {
  date: string;
  views: number;
};

// Chart colors - using CSS variables with fallbacks
const COLORS = [
  "var(--color-chart-blue, #0088FE)",
  "var(--color-chart-teal, #00C49F)",
  "var(--color-chart-yellow, #FFBB28)",
  "var(--color-chart-orange, #FF8042)",
  "var(--color-chart-purple, #8884D8)",
];

export function TrafficAnalytics({ data, isLoading }: TrafficAnalyticsProps) {
  const auto = useAutoTranslator("seller.analytics.traffic");
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{auto("Traffic Analytics", "title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">
              {auto("Loading traffic data...", "state.loading")}
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
          <CardTitle>{auto("Traffic Analytics", "title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">
              {auto("No traffic data available", "state.empty")}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare traffic sources data
  const sourcesData = Object.entries(data.sources).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Prepare device data
  const devicesData = Object.entries(data.devices).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Prepare daily page views
  const dailyData = data.pageViews.daily.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    }),
    views: item.views,
  }));

  const renderPageViewsTooltip = (props: TooltipProps<number, string>) => {
    const { active, payload } = props as {
      active?: boolean;
      payload?: Array<{ payload: PageViewDatum }>;
    };
    if (!active || !payload?.length) {
      return null;
    }

    const datum = payload[0]?.payload as PageViewDatum | undefined;
    if (!datum) {
      return null;
    }

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {datum.date}
            </span>
            <span className="font-bold">
              {datum.views.toLocaleString()} {auto("views", "tooltip.views")}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {auto("Total Page Views", "metrics.totalPageViews")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.pageViews.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {auto("Avg Session Duration", "metrics.avgSessionDuration")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(data.engagement.avgSessionDuration)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {auto("Pages Per Session", "metrics.pagesPerSession")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.engagement.avgPagesPerSession.toFixed(1)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {auto("Bounce Rate", "metrics.bounceRate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.engagement.bounceRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Page Views Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {auto("Page Views Over Time", "charts.pageViews")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis className="text-xs" tick={{ fontSize: 12 }} />
              <Tooltip content={renderPageViewsTooltip} />
              <Bar
                dataKey="views"
                fill="var(--color-chart-primary, #8884d8)"
                name={auto("Page Views", "charts.pageViews")}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Traffic Sources and Devices */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{auto("Traffic Sources", "charts.sources")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sourcesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="var(--color-chart-primary, #8884d8)"
                  dataKey="value"
                >
                  {sourcesData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{auto("Device Breakdown", "charts.devices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={devicesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="var(--color-chart-primary, #8884d8)"
                  dataKey="value"
                >
                  {devicesData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
=======
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TooltipProps } from "recharts";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

interface DailyPageView {
  date: string;
  views: number;
}

interface TrafficAnalyticsData {
  pageViews: {
    total: number;
    daily: DailyPageView[];
  };
  sources: {
    direct: number;
    search: number;
    social: number;
    referral: number;
    paid: number;
  };
  engagement: {
    avgSessionDuration: number;
    avgPagesPerSession: number;
    bounceRate: number;
  };
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

interface TrafficAnalyticsProps {
  data: TrafficAnalyticsData | null;
  isLoading?: boolean;
}

type PageViewDatum = {
  date: string;
  views: number;
};

const COLORS = [
  "var(--color-status-info, #0088FE)",
  "var(--color-status-active, #00C49F)",
  "var(--color-status-pending, #FFBB28)",
  "var(--color-danger, #FF8042)",
  "var(--color-brand-secondary, #8884D8)"
];

export function TrafficAnalytics({ data, isLoading }: TrafficAnalyticsProps) {
  const auto = useAutoTranslator("seller.analytics.traffic");
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{auto("Traffic Analytics", "title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">
              {auto("Loading traffic data...", "state.loading")}
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
          <CardTitle>{auto("Traffic Analytics", "title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">
              {auto("No traffic data available", "state.empty")}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare traffic sources data
  const sourcesData = Object.entries(data.sources).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Prepare device data
  const devicesData = Object.entries(data.devices).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Prepare daily page views
  const dailyData = data.pageViews.daily.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    }),
    views: item.views,
  }));

  const renderPageViewsTooltip = (props: TooltipProps<number, string>) => {
    const { active, payload } = props as {
      active?: boolean;
      payload?: Array<{ payload: PageViewDatum }>;
    };
    if (!active || !payload?.length) {
      return null;
    }

    const datum = payload[0]?.payload as PageViewDatum | undefined;
    if (!datum) {
      return null;
    }

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {datum.date}
            </span>
            <span className="font-bold">
              {datum.views.toLocaleString()} {auto("views", "tooltip.views")}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {auto("Total Page Views", "metrics.totalPageViews")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.pageViews.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {auto("Avg Session Duration", "metrics.avgSessionDuration")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(data.engagement.avgSessionDuration)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {auto("Pages Per Session", "metrics.pagesPerSession")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.engagement.avgPagesPerSession.toFixed(1)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {auto("Bounce Rate", "metrics.bounceRate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.engagement.bounceRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Page Views Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {auto("Page Views Over Time", "charts.pageViews")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis className="text-xs" tick={{ fontSize: 12 }} />
              <Tooltip content={renderPageViewsTooltip} />
              <Bar
                dataKey="views"
                fill="var(--color-chart-primary, #8884d8)"
                name={auto("Page Views", "charts.pageViews")}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Traffic Sources and Devices */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{auto("Traffic Sources", "charts.sources")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sourcesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="var(--color-chart-primary, #8884d8)"
                  dataKey="value"
                >
                  {sourcesData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{auto("Device Breakdown", "charts.devices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={devicesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="var(--color-chart-primary, #8884d8)"
                  dataKey="value"
                >
                  {devicesData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
>>>>>>> origin/main
