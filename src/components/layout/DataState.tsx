import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface DataStateProps {
  loading?: boolean;
  error?: unknown;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  skeletonRows?: number;
  children?: ReactNode;
}

/**
 * Shared empty/loading/error state wrapper.
 * Renders `children` when data is present, otherwise shows a consistent placeholder.
 */
const DataState = ({
  loading,
  error,
  empty,
  emptyTitle = "Nothing here yet",
  emptyDescription = "Data will appear here once available.",
  emptyAction,
  onRetry,
  skeletonRows = 3,
  children,
}: DataStateProps) => {
  if (loading) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
        <div className="p-3 rounded-full bg-destructive/10 mb-3">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="font-semibold text-sm">Something went wrong</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          {(error as Error)?.message ?? "Please try again."}
        </p>
        {onRetry && (
          <Button size="sm" variant="outline" className="mt-4" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
        <div className="p-3 rounded-full bg-muted mb-3">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-sm">{emptyTitle}</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{emptyDescription}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return <>{children}</>;
};

export default DataState;
