export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Cargando...</p>
      </div>
    </div>
  );
}
