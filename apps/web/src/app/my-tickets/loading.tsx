export default function MyTicketsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-white/5" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="h-20 w-20 animate-pulse rounded-lg bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
