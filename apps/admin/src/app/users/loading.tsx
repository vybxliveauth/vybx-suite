export default function UsersLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-28 animate-pulse rounded-lg bg-[var(--glass-bg)]" />
        <div className="h-10 w-44 animate-pulse rounded-lg bg-[var(--glass-bg)]" />
      </div>
      <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-[var(--glass-border)] px-4 py-3 last:border-0">
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-white/10" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
