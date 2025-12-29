import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectCardSkeletonProps {
  className?: string;
}

export function ProjectCardSkeleton({ className }: ProjectCardSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-32 rounded-lg" />
          <Skeleton className="h-4 w-24 rounded-lg" />
        </div>
      </div>

      {/* Description */}
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-3/4 rounded-lg" />
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-6">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="size-8 rounded-full" />
      </div>
    </div>
  );
}

export function ProjectCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(count)].map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}
