"use client";

import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info } from "@/components/ui/icons";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

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
  const auto = useAutoTranslator("seller.health.violations");
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case "major":
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case "minor":
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      default:
        return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "major":
        return "destructive";
      case "minor":
        return "warning";
      default:
        return "secondary";
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "permanent_deactivation":
        return "bg-red-100 text-red-800";
      case "account_suspension":
        return "bg-orange-100 text-orange-800";
      case "listing_suppression":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-primary/10 text-primary-dark";
    }
  };

  const formatType = (type: string) => {
    const fallback = type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    return auto(fallback, `types.${type}`);
  };

  const formatAction = (action: string) => {
    const fallback = action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    return auto(fallback, `actions.${action}`);
  };

  const formatSeverity = (severity: string) => {
    const fallback = severity.charAt(0).toUpperCase() + severity.slice(1);
    return auto(fallback, `severity.${severity}`);
  };

  if (violations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-success" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {auto("No Violations", "state.empty.title")}
        </h3>
        <p className="text-gray-600">
          {auto(
            "Your account has no policy violations. Keep maintaining high standards!",
            "state.empty.description",
          )}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {auto("Policy Violations", "header.title")}
        </h2>
        <p className="text-gray-600">
          {auto(
            "Review and resolve any policy violations to maintain account health.",
            "header.description",
          )}
        </p>
      </div>

      <div className="space-y-4">
        {violations.map((violation, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${
              violation.resolved
                ? "bg-gray-50 border-gray-200"
                : "bg-white border-gray-300"
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
                    <Badge
                      variant={getSeverityColor(violation.severity) as never}
                    >
                      {formatSeverity(violation.severity)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {violation.description}
                  </p>
                </div>
              </div>
              {violation.resolved && (
                <Badge
                  variant="outline"
                  className="bg-success/5 text-success-dark"
                >
                  {auto("Resolved", "status.resolved")}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-500">
                  {new Date(violation.date).toLocaleDateString()}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(violation.action)}`}
                >
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
