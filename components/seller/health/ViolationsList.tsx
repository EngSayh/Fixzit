'use client';

import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface Violation {
  type: string;
  severity: string;
  description: string;
  action: string;
  date: string;
  resolved: boolean;
}

interface Props {
  violations: Violation[];
}

export default function ViolationsList({ violations }: Props) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-destructive" />;
      case 'major': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'minor': return <AlertTriangle className="w-5 h-5 text-warning" />;
      default: return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'major': return 'destructive';
      case 'minor': return 'warning';
      default: return 'secondary';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'permanent_deactivation': return 'bg-red-100 text-red-800';
      case 'account_suspension': return 'bg-orange-100 text-orange-800';
      case 'listing_suppression': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const formatType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (violations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-success" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Violations</h3>
        <p className="text-gray-600">
          Your account has no policy violations. Keep maintaining high standards!
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Policy Violations</h2>
        <p className="text-gray-600">
          Review and resolve any policy violations to maintain account health.
        </p>
      </div>

      <div className="space-y-4">
        {violations.map((violation, index) => (
          <div 
            key={index}
            className={`p-4 rounded-lg border ${
              violation.resolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                {getSeverityIcon(violation.severity)}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {formatType(violation.type)}
                    </h3>
                    <Badge variant={getSeverityColor(violation.severity) as never}>
                      {violation.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{violation.description}</p>
                </div>
              </div>
              {violation.resolved && (
                <Badge variant="outline" className="bg-success/5 text-success-dark">
                  Resolved
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-500">
                  {new Date(violation.date).toLocaleDateString()}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(violation.action)}`}>
                  {formatAction(violation.action)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
