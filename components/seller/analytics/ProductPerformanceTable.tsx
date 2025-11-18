'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

interface TopProduct {
  productId: string;
  title: string;
  unitsSold: number;
  revenue: number;
  conversionRate: number;
}

interface UnderperformingProduct {
  productId: string;
  title: string;
  views: number;
  conversionRate: number;
  recommendation: string;
}

interface ProductPerformanceData {
  topProducts: TopProduct[];
  lowStockCount: number;
  underperformingProducts: UnderperformingProduct[];
}

interface ProductPerformanceTableProps {
  data: ProductPerformanceData | null;
  isLoading?: boolean;
}

export function ProductPerformanceTable({ data, isLoading }: ProductPerformanceTableProps) {
  const auto = useAutoTranslator('seller.analytics.productPerformance');
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{auto('Product Performance', 'title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">
              {auto('Loading product data...', 'state.loading')}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.topProducts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{auto('Product Performance', 'title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">
              {auto('No product data available', 'state.empty')}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>{auto('Top Selling Products', 'sections.topProducts.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {auto('Your best performing products by revenue', 'sections.topProducts.subtitle')}
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{auto('Product', 'sections.topProducts.columns.product')}</TableHead>
                <TableHead className="text-right">
                  {auto('Units Sold', 'sections.topProducts.columns.unitsSold')}
                </TableHead>
                <TableHead className="text-right">
                  {auto('Revenue', 'sections.topProducts.columns.revenue')}
                </TableHead>
                <TableHead className="text-right">
                  {auto('Conversion', 'sections.topProducts.columns.conversion')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topProducts.map((product, index) => (
                <TableRow key={product.productId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="font-medium">{product.title}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{product.unitsSold}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(product.revenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.conversionRate.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Underperforming Products */}
      {data.underperformingProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{auto('Products Needing Attention', 'sections.underperforming.title')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto('Products with low conversion rates and recommendations', 'sections.underperforming.subtitle')}
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{auto('Product', 'sections.underperforming.columns.product')}</TableHead>
                  <TableHead className="text-right">
                    {auto('Views', 'sections.underperforming.columns.views')}
                  </TableHead>
                  <TableHead className="text-right">
                    {auto('Conversion', 'sections.underperforming.columns.conversion')}
                  </TableHead>
                  <TableHead>{auto('Recommendation', 'sections.underperforming.columns.recommendation')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.underperformingProducts.slice(0, 5).map((product) => (
                  <TableRow key={product.productId}>
                    <TableCell className="font-medium">{product.title}</TableCell>
                    <TableCell className="text-right">{product.views}</TableCell>
                    <TableCell className="text-right text-orange-600">
                      {product.conversionRate.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.recommendation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alert */}
      {data.lowStockCount > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">
              {auto('Low Stock Alert', 'lowStock.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-800">
              {auto('{{count}} products are running low on stock. Review your inventory to avoid missed sales.', 'lowStock.message', {
                count: data.lowStockCount,
              })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
