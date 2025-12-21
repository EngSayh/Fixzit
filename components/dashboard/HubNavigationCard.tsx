"use client";

/**
 * HubNavigationCard - Navigation card for dashboard hub pages
 * 
 * Displays a card with icon, title, description, and navigation to sub-module.
 * Used in hub dashboards (marketplace, crm, hr, finance, etc.) to provide
 * clear navigation to existing sub-modules.
 * 
 * @module components/dashboard/HubNavigationCard
 */

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface HubNavigationCardProps {
  /** Card title */
  title: string;
  /** Card description */
  description: string;
  /** Route path to navigate to */
  href: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Icon color class (e.g., "text-primary", "text-success") */
  iconColor?: string;
  /** Optional metric value to display */
  metric?: number | string;
  /** Optional metric label */
  metricLabel?: string;
  /** Whether the feature is disabled/coming soon */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

export function HubNavigationCard({
  title,
  description,
  href,
  icon: Icon,
  iconColor = "text-primary",
  metric,
  metricLabel,
  disabled = false,
  className,
}: HubNavigationCardProps) {
  const cardContent = (
    <Card className={cn(
      "h-full transition-all duration-200",
      !disabled && "hover:shadow-md hover:border-primary/50",
      disabled && "opacity-60",
      className
    )}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </div>
        <div className={cn("p-2 rounded-lg bg-muted", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {metric !== undefined && (
            <div>
              <p className="text-2xl font-bold">{metric}</p>
              {metricLabel && (
                <p className="text-xs text-muted-foreground">{metricLabel}</p>
              )}
            </div>
          )}
          {!disabled && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="ms-auto group-hover:translate-x-1 transition-transform"
            >
              View <ChevronRight className="h-4 w-4 ms-1" />
            </Button>
          )}
          {disabled && (
            <span className="text-xs text-muted-foreground ms-auto">Coming Soon</span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (disabled) {
    return <div className="cursor-not-allowed">{cardContent}</div>;
  }

  return (
    <Link href={href} className="group block">
      {cardContent}
    </Link>
  );
}

export interface HubNavigationGridProps {
  /** Array of navigation cards to display */
  cards: HubNavigationCardProps[];
  /** Number of columns on different screen sizes */
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
  };
  /** Additional class names */
  className?: string;
}

export function HubNavigationGrid({
  cards,
  columns = { sm: 1, md: 2, lg: 3 },
  className,
}: HubNavigationGridProps) {
  return (
    <div 
      className={cn(
        "grid gap-4",
        `grid-cols-${columns.sm || 1}`,
        `md:grid-cols-${columns.md || 2}`,
        `lg:grid-cols-${columns.lg || 3}`,
        className
      )}
    >
      {cards.map((card) => (
        <HubNavigationCard key={card.href} {...card} />
      ))}
    </div>
  );
}

export default HubNavigationCard;
