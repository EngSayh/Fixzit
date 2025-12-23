"use client";

import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "@/components/ui/icons";

interface Props {
  score: number;
  status: "excellent" | "good" | "fair" | "poor" | "critical";
  trend: "improving" | "stable" | "declining";
  isAtRisk: boolean;
}

export default function HealthScore({ score, status, trend, isAtRisk }: Props) {
  const getStatusColor = () => {
    switch (status) {
      case "excellent":
        return "text-green-600";
      case "good":
        return "text-primary";
      case "fair":
        return "text-yellow-600";
      case "poor":
        return "text-orange-600";
      case "critical":
        return "text-red-600";
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case "excellent":
        return "bg-green-50";
      case "good":
        return "bg-primary/10";
      case "fair":
        return "bg-yellow-50";
      case "poor":
        return "bg-orange-50";
      case "critical":
        return "bg-red-50";
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="w-5 h-5 text-success" />;
      case "declining":
        return <TrendingDown className="w-5 h-5 text-destructive" />;
      case "stable":
        return <Minus className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusLabel = () => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Card className={`p-8 ${getStatusBg()}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Score Circle */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-gray-200"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - score / 100)}`}
                className={getStatusColor()}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-4xl font-bold ${getStatusColor()}`}>
                  {score}
                </div>
                <div className="text-sm text-gray-600">Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Details */}
        <div className="md:col-span-2 flex flex-col justify-center">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <h2 className={`text-3xl font-bold ${getStatusColor()}`}>
                {getStatusLabel()} Health
              </h2>
              {isAtRisk && (
                <AlertTriangle className="w-6 h-6 text-destructive" />
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              {getTrendIcon()}
              <span className="capitalize">{trend}</span>
              <span className="text-gray-400">•</span>
              <span>Last 30 days</span>
            </div>
          </div>

          <div className="space-y-2 text-gray-700">
            {status === "excellent" && (
              <p>
                Your account is in excellent standing. Keep up the great work!
              </p>
            )}
            {status === "good" && (
              <p>
                Your account is performing well. Continue to maintain these
                standards.
              </p>
            )}
            {status === "fair" && (
              <p>
                Your account needs improvement in some areas. Review the metrics
                below.
              </p>
            )}
            {status === "poor" && (
              <p className="font-medium">
                Your account is at risk. Immediate action required to avoid
                suspension.
              </p>
            )}
            {status === "critical" && (
              <p className="font-bold text-destructive">
                Critical: Your account may be suspended soon. Take immediate
                action.
              </p>
            )}
          </div>

          {isAtRisk && (
            <div className="mt-4 p-4 bg-destructive/10 border border-red-300 rounded-lg">
              <p className="text-sm text-destructive-dark">
                <strong>Account at Risk:</strong> Your performance is below
                target thresholds. Please review the recommendations tab for
                specific actions to improve.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
