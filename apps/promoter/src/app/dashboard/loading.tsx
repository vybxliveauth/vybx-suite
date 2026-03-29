export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-[var(--glass-bg)]" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl bg-[var(--glass-bg)]" />
        <div className="h-72 animate-pulse rounded-xl bg-[var(--glass-bg)]" />
      </div>
    </div>
  );
}
