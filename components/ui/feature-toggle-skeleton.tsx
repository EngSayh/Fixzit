/**
 * Skeleton loader for FeatureToggle components
 * Provides better perceived performance during initial load
 */
export function FeatureToggleSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border last:border-b-0 animate-pulse">
      <div className="flex-1">
        <div className="h-4 bg-muted rounded-2xl w-1/3 mb-2"></div>
        <div className="h-3 bg-muted rounded-2xl w-2/3"></div>
      </div>
      <div className="ms-4">
        <div className="w-11 h-6 bg-muted rounded-full"></div>
      </div>
    </div>
  );
}

interface FeatureToggleGroupSkeletonProps {
  /**
   * Number of skeleton toggle items to render (defaults to 3)
   */
  count?: number;
}

/**
 * Skeleton loader for FeatureToggleGroup
 */
export function FeatureToggleGroupSkeleton({
  count = 3,
}: FeatureToggleGroupSkeletonProps = {}) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="p-4 border-b border-border animate-pulse">
        <div className="h-5 bg-muted rounded-2xl w-1/4 mb-2"></div>
        <div className="h-3 bg-muted rounded-2xl w-1/2"></div>
      </div>
      <div>
        {Array.from({ length: count }).map((_, i) => (
          <FeatureToggleSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
