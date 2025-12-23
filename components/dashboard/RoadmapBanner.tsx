"use client";

/**
 * RoadmapBanner - Banner for planned/coming soon features
 * 
 * Displays a non-intrusive banner indicating that certain features
 * are planned but not yet implemented. Used in hub dashboards to
 * set expectations without blocking navigation to existing features.
 * 
 * @module components/dashboard/RoadmapBanner
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Sparkles } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export interface RoadmapBannerProps {
  /** List of planned feature names */
  features?: string[];
  /** Custom message override */
  message?: string;
  /** Banner variant */
  variant?: "info" | "subtle";
  /** Additional class names */
  className?: string;
}

export function RoadmapBanner({
  features = [],
  message,
  variant = "info",
  className,
}: RoadmapBannerProps) {
  const defaultMessage = features.length > 0
    ? `Planned features: ${features.join(", ")}`
    : "Additional features are on our roadmap";

  return (
    <Card className={cn(
      "border-dashed",
      variant === "info" && "bg-muted/50 border-muted-foreground/20",
      variant === "subtle" && "bg-background border-muted",
      className
    )}>
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            variant === "info" && "bg-primary/10 text-primary",
            variant === "subtle" && "bg-muted text-muted-foreground"
          )}>
            {variant === "info" ? (
              <Sparkles className="h-5 w-5" />
            ) : (
              <Calendar className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Roadmap
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {message || defaultMessage}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export interface PlannedFeatureCardProps {
  /** Feature title */
  title: string;
  /** Feature description */
  description?: string;
  /** Expected timeline (e.g., "Q1 2025") */
  timeline?: string;
  /** Additional class names */
  className?: string;
}

export function PlannedFeatureCard({
  title,
  description,
  timeline,
  className,
}: PlannedFeatureCardProps) {
  return (
    <Card className={cn("border-dashed bg-muted/30", className)}>
      <CardContent className="py-4 text-center">
        <Badge variant="secondary" className="mb-2">
          Coming Soon
        </Badge>
        <h3 className="font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        {timeline && (
          <p className="text-xs text-muted-foreground mt-2">
            Expected: {timeline}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default RoadmapBanner;
