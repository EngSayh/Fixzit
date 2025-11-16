'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Lightbulb } from 'lucide-react';

interface Props {
  recommendations: string[];
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
}

export default function RecommendationsPanel({ recommendations, healthStatus }: Props) {
  const getPriorityColor = (index: number) => {
    if (index === 0) return 'border-red-300 bg-red-50';
    if (index === 1) return 'border-orange-300 bg-orange-50';
    return 'border-blue-300 bg-blue-50';
  };

  const getPriorityLabel = (index: number) => {
    if (index === 0) return 'High Priority';
    if (index === 1) return 'Medium Priority';
    return 'Low Priority';
  };

  if (healthStatus === 'excellent' && recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Excellent Performance!</h3>
        <p className="text-gray-600">
          Your account is in excellent standing. No immediate actions required.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Recommendations</h2>
        <p className="text-gray-600">
          Follow these recommendations to improve your account health and performance.
        </p>
      </div>

      {healthStatus === 'critical' && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            <strong>Urgent Action Required:</strong> Your account health is critical. 
            Complete the high-priority actions immediately to avoid account suspension.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {recommendations.map((recommendation, index) => (
          <div 
            key={index}
            className={`p-4 rounded-lg border-2 ${getPriorityColor(index)}`}
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-700 uppercase">
                    {getPriorityLabel(index)}
                  </span>
                </div>
                <p className="text-gray-800">{recommendation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* General Tips */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">General Best Practices</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>Ship orders on time and provide accurate tracking information</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>Respond to customer messages within 24 hours</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>Maintain accurate product listings with clear descriptions and images</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>Only cancel orders when absolutely necessary</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>Ensure product quality to minimize returns</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>Follow all marketplace policies and guidelines</span>
          </li>
        </ul>
      </div>

      {/* Contact Support */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Need help improving your metrics? 
          <a href="/support" className="text-blue-600 hover:underline ml-1">
            Contact Seller Support
          </a>
        </p>
      </div>
    </div>
  );
}
