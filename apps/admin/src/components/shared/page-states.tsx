import { AlertTriangle, SearchX } from "lucide-react";
import { Button } from "@vybx/ui";

export function EmptyState({
  title = "Sin resultados",
  message = "No se encontraron registros con los filtros actuales.",
  action,
}: {
  title?: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="mx-4 my-4 flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-[#243243] bg-[#121b27]/55 px-6 py-10 text-center">
      <SearchX className="size-9 text-[#6f8093]" />
      <p className="text-sm font-semibold text-[#d7e4f5]">{title}</p>
      <p className="max-w-lg text-xs text-[#9aa6b5]">{message}</p>
      {action && (
        <Button
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className="mt-2 border-[#2d4e7c] bg-[#16263a]/60 text-[#d2e5ff] hover:bg-[#1b2e45] hover:text-white"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  message = "Ocurrió un error al cargar los datos.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-4 my-4 flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-red-900/40 bg-red-950/20 px-6 py-10 text-center">
      <AlertTriangle className="size-9 text-red-400/70" />
      <p className="text-sm font-semibold text-red-200">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2 border-red-800/60 text-red-200 hover:bg-red-500/10 hover:text-white"
        >
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-px">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-[#1f2b3a] px-4 py-3">
          {Array.from({ length: cols }).map((__, j) => (
            <div
              key={j}
              className="h-3 animate-pulse rounded bg-[#1b2737]"
              style={{ flex: j === 0 ? 2 : 1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
