'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

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

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/souq/repricer/analysis/${fsin}`);
        if (!response.ok) throw new Error('Failed to fetch analysis');
        
        const data = await response.json();
        setAnalysis(data.analysis);
      } catch (error) {
        console.error('Failed to fetch competitor analysis:', error);
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
        No competitor data available for this product.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Price Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Lowest Price</div>
          <div className="text-2xl font-bold text-gray-900">
            SAR {analysis.lowestPrice.toFixed(2)}
          </div>
          <div className="flex items-center text-xs text-green-600 mt-1">
            <TrendingDown className="w-3 h-3 mr-1" />
            Best Deal
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Average Price</div>
          <div className="text-2xl font-bold text-gray-900">
            SAR {analysis.averagePrice.toFixed(2)}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Median Price</div>
          <div className="text-2xl font-bold text-gray-900">
            SAR {analysis.medianPrice.toFixed(2)}
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Highest Price</div>
          <div className="text-2xl font-bold text-gray-900">
            SAR {analysis.highestPrice.toFixed(2)}
          </div>
          <div className="flex items-center text-xs text-red-600 mt-1">
            <TrendingUp className="w-3 h-3 mr-1" />
            Most Expensive
          </div>
        </div>
      </div>

      {/* Total Competitors */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-900">{analysis.totalOffers}</div>
          <div className="text-sm text-blue-700">Competing Sellers</div>
        </div>
      </div>

      {/* Price Distribution */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Price Distribution</h3>
        <div className="space-y-2">
          {analysis.priceDistribution.map((bucket, index) => {
            const maxCount = Math.max(...analysis.priceDistribution.map(b => b.count));
            const percentage = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;

            return (
              <div key={index} className="flex items-center gap-3">
                <div className="text-xs text-gray-600 w-32">SAR {bucket.range}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full flex items-center justify-end px-2"
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
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-900 mb-2">Pricing Recommendation</h4>
        <p className="text-sm text-yellow-800">
          To win the Buy Box, price your product below SAR {analysis.lowestPrice.toFixed(2)}. 
          The average market price is SAR {analysis.averagePrice.toFixed(2)}.
        </p>
      </div>
    </div>
  );
}
