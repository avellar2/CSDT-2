import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard() {
  return (
    <div className="flex flex-col space-y-3 bg-gray-900 p-4 rounded-xl shadow-md container">
      <Skeleton className="h-6 w-1/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-2" />
      <Skeleton className="h-4 w-1/3 mb-2" />
      <Skeleton className="h-4 w-1/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-2" />
    </div>
  );
}