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
          <CardTitle>Product Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">Loading product data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.topProducts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">No product data available</div>
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
          <CardTitle>Top Selling Products</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your best performing products by revenue
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Conversion</TableHead>
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
            <CardTitle>Products Needing Attention</CardTitle>
            <p className="text-sm text-muted-foreground">
              Products with low conversion rates and recommendations
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                  <TableHead>Recommendation</TableHead>
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
            <CardTitle className="text-orange-900">Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-800">
              {data.lowStockCount} product{data.lowStockCount !== 1 ? 's are' : ' is'} running low on stock. 
              Review your inventory to avoid missed sales.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
