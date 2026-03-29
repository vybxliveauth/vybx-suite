export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 h-8 w-40 animate-pulse rounded-lg bg-white/5" />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="h-48 animate-pulse rounded-xl bg-white/5" />
          <div className="h-36 animate-pulse rounded-xl bg-white/5" />
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-white/5" />
      </div>
    </div>
  );
}
