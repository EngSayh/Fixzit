/**
 * Skeleton loader for FeatureToggle components
 * Provides better perceived performance during initial load
 */
export function FeatureToggleSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 animate-pulse">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
      <div className="ml-4">
        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for FeatureToggleGroup
 */
export function FeatureToggleGroupSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
      <div>
        <FeatureToggleSkeleton />
        <FeatureToggleSkeleton />
        <FeatureToggleSkeleton />
      </div>
    </div>
  );
}
