'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import { logger } from '@/lib/logger';

interface CompetitorAnalysisProps {
  fsin: string;
}

interface Analysis {
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  medianPrice: number;
  totalOffers: number;
  priceDistribution: Array<{ range: string; count: number }>;
}

export default function CompetitorAnalysis({ fsin }: CompetitorAnalysisProps) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const auto = useAutoTranslator('seller.pricing.competitor');

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/souq/repricer/analysis/${fsin}`);
        if (!response.ok) throw new Error('Failed to fetch analysis');
        
        const data = await response.json();
        setAnalysis(data.analysis);
    } catch (error) {
      logger.error('Failed to fetch competitor analysis', error);
    } finally {
      setLoading(false);
    }
    };
    
    fetchAnalysis();
  }, [fsin]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (!analysis || analysis.totalOffers === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        {auto('No competitor data available for this product.', 'state.empty')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Price Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-primary/5 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">
            {auto('Lowest Price', 'metrics.lowest')}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            SAR {analysis.lowestPrice.toFixed(2)}
          </div>
          <div className="flex items-center text-xs text-success mt-1">
            <TrendingDown className="w-3 h-3 me-1" />
            {auto('Best Deal', 'metrics.bestDeal')}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">
            {auto('Average Price', 'metrics.average')}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            SAR {analysis.averagePrice.toFixed(2)}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">
            {auto('Median Price', 'metrics.median')}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            SAR {analysis.medianPrice.toFixed(2)}
          </div>
        </div>

        <div className="bg-destructive/5 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">
            {auto('Highest Price', 'metrics.highest')}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            SAR {analysis.highestPrice.toFixed(2)}
          </div>
          <div className="flex items-center text-xs text-destructive mt-1">
            <TrendingUp className="w-3 h-3 me-1" />
            {auto('Most Expensive', 'metrics.mostExpensive')}
          </div>
        </div>
      </div>

      {/* Total Competitors */}
      <div className="bg-primary/5 border border-blue-200 rounded-lg p-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary-dark">{analysis.totalOffers}</div>
          <div className="text-sm text-primary-dark">
            {auto('Competing Sellers', 'metrics.sellers')}
          </div>
        </div>
      </div>

      {/* Price Distribution */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">
          {auto('Price Distribution', 'distribution.title')}
        </h3>
        <div className="space-y-2">
          {analysis.priceDistribution.map((bucket, index) => {
            const maxCount = Math.max(...analysis.priceDistribution.map(b => b.count));
            const percentage = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;

            return (
              <div key={index} className="flex items-center gap-3">
                <div className="text-xs text-gray-600 w-32">
                  {auto('SAR {{range}}', 'distribution.range').replace(
                    '{{range}}',
                    bucket.range
                  )}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-primary h-full flex items-center justify-end px-2"
                    style={{ width: `${percentage}%` }}
                  >
                    {bucket.count > 0 && (
                      <span className="text-xs text-white font-medium">{bucket.count}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-warning/5 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-900 mb-2">
          {auto('Pricing Recommendation', 'recommendation.title')}
        </h4>
        <p className="text-sm text-warning-foreground">
          {auto(
            'To win the Buy Box, price your product below SAR {{lowest}}. The average market price is SAR {{average}}.',
            'recommendation.body'
          )
            .replace('{{lowest}}', analysis.lowestPrice.toFixed(2))
            .replace('{{average}}', analysis.averagePrice.toFixed(2))}
        </p>
      </div>
    </div>
  );
}
