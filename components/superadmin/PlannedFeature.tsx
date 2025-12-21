"use client";

/**
 * PlannedFeature Component
 * Displays a professional placeholder for features in development
 * Replaces "Coming Soon" stubs with proper UX
 * 
 * @module components/superadmin/PlannedFeature
 */

import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, AlertCircle } from "lucide-react";

interface PlannedFeatureProps {
  /** Feature title */
  title: string;
  /** Feature description */
  description: string;
  /** Icon to display */
  icon: ReactNode;
  /** Planned release quarter (e.g., "Q1 2026") */
  plannedRelease?: string;
  /** Current development status */
  status?: "planned" | "in-development" | "beta";
  /** Optional list of sub-features */
  features?: string[];
}

const STATUS_CONFIG = {
  planned: {
    label: "Planned",
    color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    icon: <Calendar className="h-3 w-3" />,
  },
  "in-development": {
    label: "In Development",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: <Clock className="h-3 w-3" />,
  },
  beta: {
    label: "Beta",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

export function PlannedFeature({
  title,
  description,
  icon,
  plannedRelease,
  status = "planned",
  features,
}: PlannedFeatureProps) {
  const statusConfig = STATUS_CONFIG[status];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          <p className="text-slate-400">{description}</p>
        </div>
        <Badge variant="outline" className={`${statusConfig.color} flex items-center gap-1`}>
          {statusConfig.icon}
          {statusConfig.label}
        </Badge>
      </div>

      {/* Main Card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="flex items-center gap-2 text-white">
            {icon}
            Feature Overview
          </CardTitle>
          <CardDescription className="text-slate-400">
            This feature is currently {status === "planned" ? "on the roadmap" : "under development"}.
            {plannedRelease && ` Target release: ${plannedRelease}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-slate-800 p-6 mb-6">
              <div className="text-slate-500">{icon}</div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {status === "planned" ? "Feature Planned" : "Feature In Progress"}
            </h3>
            <p className="text-slate-400 max-w-md mb-6">
              {status === "planned"
                ? "This module is on our product roadmap and will be available in a future release."
                : "Our team is actively working on this feature. Stay tuned for updates."}
            </p>

            {/* Planned Features List */}
            {features && features.length > 0 && (
              <div className="w-full max-w-md">
                <h4 className="text-sm font-medium text-slate-300 mb-3 text-start">
                  Planned Capabilities:
                </h4>
                <ul className="space-y-2">
                  {features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800/50 rounded-lg p-3"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Release Timeline */}
            {plannedRelease && (
              <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="h-4 w-4" />
                <span>Expected: {plannedRelease}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-950/30 border-blue-800/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-300 font-medium">Need this feature sooner?</p>
              <p className="text-sm text-blue-400/80 mt-1">
                Contact Eng. Sultan Al Hassni to discuss prioritization or custom development.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
