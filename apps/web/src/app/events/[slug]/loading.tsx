export default function EventDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Image skeleton */}
        <div className="space-y-6">
          <div className="aspect-[16/9] animate-pulse rounded-2xl bg-white/5" />
          <div className="space-y-3">
            <div className="h-8 w-3/4 animate-pulse rounded-lg bg-white/5" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-white/5" />
            <div className="mt-6 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-white/5" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-white/5" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-white/5" />
            </div>
          </div>
        </div>
        {/* Sidebar skeleton */}
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}
