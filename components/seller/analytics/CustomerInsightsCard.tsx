"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

interface CustomerInsightsData {
  acquisition: {
    newCustomers: number;
    sources: Record<string, number>;
  };
  retention: {
    repeatCustomerRate: number;
    averageLifetimeValue: number;
  };
  geography: {
    topCities: Array<{ city: string; count: number }>;
    topRegions: Array<{ region: string; count: number }>;
  };
  demographics: {
    ageGroups: Record<string, number>;
  };
}

interface CustomerInsightsCardProps {
  data: CustomerInsightsData | null;
  isLoading?: boolean;
}

// Chart colors - using CSS variables with fallbacks
const COLORS = [
  "var(--color-chart-blue, #0088FE)",
  "var(--color-chart-teal, #00C49F)",
  "var(--color-chart-yellow, #FFBB28)",
  "var(--color-chart-orange, #FF8042)",
  "var(--color-chart-purple, #8884D8)",
];

export function CustomerInsightsCard({
  data,
  isLoading,
}: CustomerInsightsCardProps) {
  const auto = useAutoTranslator("seller.analytics.customerInsights");
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{auto("Customer Insights", "title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">
              {auto("Loading customer data...", "state.loading")}
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
          <CardTitle>{auto("Customer Insights", "title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">
              {auto("No customer data available", "state.empty")}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare geography data for pie chart
  const geographyData = data.geography.topCities.slice(0, 5).map((city) => ({
    name: city.city,
    value: city.count,
  }));

  // Prepare demographics data for pie chart
  const demographicsData = Object.entries(data.demographics.ageGroups).map(
    ([age, count]) => ({
      name: age,
      value: count,
    }),
  );

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {auto("Customer Acquisition", "sections.acquisition.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  {auto("New Customers", "sections.acquisition.newCustomers")}
                </div>
                <div className="text-3xl font-bold">
                  {data.acquisition.newCustomers}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  {auto("Sources", "sections.acquisition.sources")}
                </div>
                {Object.entries(data.acquisition.sources).map(
                  ([source, count]) => (
                    <div key={source} className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">
                        {source}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {auto("Customer Retention", "sections.retention.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  {auto(
                    "Repeat Customer Rate",
                    "sections.retention.repeatRate",
                  )}
                </div>
                <div className="text-3xl font-bold">
                  {data.retention.repeatCustomerRate.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  {auto("Avg Lifetime Value", "sections.retention.ltv")}
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.retention.averageLifetimeValue)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geography Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {auto("Customer Geography", "sections.geography.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">
                {auto("Top Cities", "sections.geography.topCities")}
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={geographyData}
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
                    {geographyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">
                {auto("Top Regions", "sections.geography.topRegions")}
              </h4>
              <div className="space-y-2">
                {data.geography.topRegions.slice(0, 5).map((region, index) => (
                  <div key={region.region} className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{region.region}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {region.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demographics */}
      {demographicsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {auto("Customer Demographics", "sections.demographics.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={demographicsData}
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
                  {demographicsData.map((entry, index) => (
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
      )}
    </div>
  );
}
