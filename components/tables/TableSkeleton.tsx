import { TableSkeleton as BaseTableSkeleton } from "@/components/skeletons";

/**
 * Re-export of the shared table skeleton under the tables namespace for
 * consistency with the UI/UX blueprint.
 */
export function TableSkeleton(props: { rows?: number }) {
  return <BaseTableSkeleton {...props} />;
}
