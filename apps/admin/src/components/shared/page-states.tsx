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
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/40">
      <SearchX className="size-10 opacity-40" />
      <p className="text-sm font-medium text-white/60">{title}</p>
      <p className="text-xs text-center max-w-xs">{message}</p>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick} className="mt-2 border-white/10 text-white/60 hover:text-white">
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
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/40">
      <AlertTriangle className="size-10 text-red-400/60" />
      <p className="text-sm text-white/60">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 border-white/10 text-white/60 hover:text-white">
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
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-white/4">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-3 rounded animate-pulse bg-white/6"
              style={{ flex: j === 0 ? 2 : 1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
