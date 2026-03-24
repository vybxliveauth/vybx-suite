"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@vybx/ui";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-3 text-xs text-white/40">
      <span>
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-7 text-white/40 hover:text-white" disabled={page === 1} onClick={() => onPageChange(1)}>
          <ChevronsLeft className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="size-7 text-white/40 hover:text-white" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="size-3.5" />
        </Button>
        <span className="px-2 tabular-nums text-white/60">{page} / {totalPages}</span>
        <Button variant="ghost" size="icon" className="size-7 text-white/40 hover:text-white" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="size-7 text-white/40 hover:text-white" disabled={page === totalPages} onClick={() => onPageChange(totalPages)}>
          <ChevronsRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
